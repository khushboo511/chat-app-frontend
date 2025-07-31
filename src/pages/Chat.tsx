import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as QRCodeReact from "qrcode.react";
import {
  SignalProtocolStore,
  generateUserKeys,
  encryptMessage,
  decryptMessage,
  getIdentityFingerprint,
} from "../encryption/signal-protocol";
import { Send, Search, MoreVertical, Phone, Video } from "lucide-react";
import { useGetUserRooms } from "@/hooks/useGetUserRooms";
import { getDeviceName, getOrCreateDeviceId } from "@/encryption/helper";
import { getDisplayTime, getInitials } from "@/lib/chatHelper";

interface Message {
  _id: string;
  content: string;
  sender: {
    name: string;
    email: string;
  };
  createdAt: string;
  roomId: string;
}

// interface Room {
//   _id: string;
//   name: string;
//   participants: Array<{ _id: string; name: string; email: string }>;
// }
const socket: Socket = io("http://localhost:3016", {
  withCredentials: true,
  query: {
    userId: "6874e1725bdf18aa80e1270d",
  },
});

export default function Chat() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: rooms } = useGetUserRooms();
  const [roomMessages, setRoomMessages] = useState<Record<string, Message[]>>(
    {}
  );
  const userId = "6874e1725bdf18aa80e1270d";

  const [fingerprint, setFingerprint] = useState("");
  const [error, setError] = useState<string | null>(null);
  const store = useRef<SignalProtocolStore | null>(null);

  const deviceId = getOrCreateDeviceId();
  const deviceName = getDeviceName();
  useEffect(() => {
    generateUserKeys(userId, deviceId, deviceName)
      .then(async (s) => {
        store.current = s;
        // const fp = await getIdentityFingerprint(s);
        // setFingerprint(fp);
        // console.log("fingerprint (inside .then)", fp);
      })
      .catch((err) => {
        console.error("Error initializing keys:", err);
        setError("Failed to initialize encryption keys");
      });
    // console.log("fingerprint", fingerprint);

    socket.on("room:messages", async ({ roomId, messages }) => {
      if (!store.current) return;
      console.log(
        "Received socket messages:",
        JSON.stringify(messages, null, 2)
      );

      // setRoomMessages((prev) => ({
      //   ...prev,
      //   [roomId]: messages,
      // }));
      try {
        console.log("inside try block of decrypting mssg");
        const decryptedMessages = await Promise.all(
          messages.map(async (msg: any) => {
            if (!msg.ciphertexts) console.log("no cipher texts");
            if (!msg.ciphertexts) return null;

            try {
              console.log(msg, "mssg");

              console.log(msg.length, "mssg length");

              const userCiphertexts = msg.ciphertexts?.[userId];

              const ciphertext = userCiphertexts?.[deviceId];
              console.log(ciphertext, "cipher text");
              console.log(deviceId, "device id");

              console.log("Ciphertexts keys:", Object.keys(msg.ciphertexts));
              if (!ciphertext) {
                console.warn("No ciphertext for", userId, deviceId, msg);
                // return null;
              }
              const content = await decryptMessage(
                msg.sender._id,
                deviceId,
                ciphertext,
                store.current!
              );

              console.log("content", content);
              return {
                id: msg._id,
                content,
                senderId: msg.sender._id,
                name: msg.sender.name,
                createdAt: msg.createdAt,
                roomId,
              };
            } catch (err) {
              console.error(`Error decrypting message ${msg._id}:`, err);
              return null;
            }
          })
        );
        setRoomMessages((prev) => ({
          ...prev,
          [roomId]: decryptedMessages.filter(
            (msg): msg is Message => msg !== null
          ),
        }));
      } catch (error) {
        console.error("Error processing room messages:", error);
        setError("Failed to load messages");
      }
    });

    socket.on("newRoomMessage", (message) => {
      const roomId = message.roomId;
      setRoomMessages((prev) => ({
        ...prev,
        [roomId]: [...(prev[roomId] || []), message],
      }));
    });

    return () => {
      socket.off("room:messages");
      socket.off("newRoomMessage");
    };
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      socket.emit("joinRoom", { roomId: selectedRoomId });
    }
  }, [selectedRoomId]);

  // const handleSendMessage = async () => {
  //   if (!newMessage.trim() || !selectedRoomId || !store.current) {
  //     console.log("no room, store or mssg");
  //     return;
  //   }

  //   const currentRoom = rooms?.find((room) => room._id === selectedRoomId);
  //   if (!currentRoom) return;

  //   try {
  //     const encryptedPayloads = await encryptMessage(
  //       userId,
  //       currentRoom,
  //       newMessage,
  //       store.current
  //     );

  //     socket.emit("sendMessageToRoom", {
  //       roomId: selectedRoomId,
  //       encryptedPayloads: encryptedPayloads,
  //     });

  //     console.log("Encrypted messages", encryptedPayloads);

  //     setNewMessage("");
  //     setError(null);
  //   } catch (error) {
  //     console.error("Error encrypting message:", error);
  //     setError("Failed to send message");
  //   }
  // };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoomId || !store.current) {
      console.log("no room, store or mssg");
      return;
    }

    const currentRoom = rooms?.find(
      (room) => room._id === selectedRoomId.toString()
    );
    if (!currentRoom) return;

    try {
      const { roomId, ciphertext } = await encryptMessage(
        userId,
        currentRoom,
        newMessage,
        store.current!
      );

      socket.emit("sendMessageToRoom", {
        roomId: roomId,
        content: ciphertext,
      });

      console.log("Encrypted message:", roomId, ciphertext);
      setNewMessage("");
      setError(null);
    } catch (error) {
      console.error("Error encrypting message:", error);
      setError("Failed to send message");
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredRooms = rooms?.filter((room) =>
    (room.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  console.log(rooms, "rooms");
  console.log("selected room", selectedRoomId);
  const currentRoom = rooms?.find((room) => room._id === selectedRoomId);
  // const participants =
  //   currentRoom?.members?.filter((m) => m.userId !== userId) || [];

  // console.log(currentRoom, "current room");
  // console.log("participants", JSON.stringify(participants, null, 2));

  const currentMessages = selectedRoomId
    ? roomMessages[selectedRoomId] || []
    : [];

  return (
    <div className="flex h-screen bg-background">
      <div className="w-80 border-r border-border bg-muted/30">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-semibold text-foreground mb-3">
            Messages
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredRooms?.map((room) => (
              <div
                key={room._id}
                onClick={() => setSelectedRoomId(room._id)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                  selectedRoomId === room._id ? "bg-accent" : ""
                }`}
              >
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={room.avatar} />
                    <AvatarFallback> {getInitials(room.name)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground truncate">
                      {room.name || "Unnamed Room"}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {getDisplayTime(room.lastActivityAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {currentRoom?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-foreground">
                  {currentRoom?.name || "Select a Room"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {currentMessages.map((msg) => (
              <div key={msg._id}>
                <div className="max-w-[70%]">
                  <div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-background">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="resize-none"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              size="icon"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
