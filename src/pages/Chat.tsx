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
import { useGetUserAllMessages } from "@/services/message.service";

interface Message {
  _id: string;
  content: string;
  userId: {
    name: string;
    email: string;
  };
  createdAt: string;
  roomId: string;
  decryptedContent?: string;
  keyVersion?: number;
}

const socket: Socket = io("http://localhost:3016", {
  withCredentials: true,
  query: {
    userId: "688c9441a32bcf8f56cf2aea",
  },
});

const currentUser = {
  _id: "688c9441a32bcf8f56cf2aea",
  name: "Khushboo Chauadhary",
  email: "khushboochauadhary@gmail.com",
};

export default function Chat() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: rooms } = useGetUserRooms();
  const [roomMessages, setRoomMessages] = useState<Record<string, Message[]>>(
    {}
  );
  const [decryptedApiMessages, setDecryptedApiMessages] = useState<Message[]>(
    []
  );
  const [isDecrypting, setIsDecrypting] = useState(false);
  const userId = "687601737beb50c26dce8f8a";

  const { data: userMessagesFromApi } = useGetUserAllMessages(selectedRoomId);

  const [fingerprint, setFingerprint] = useState("");
  const [error, setError] = useState<string | null>(null);

  const deviceId = getOrCreateDeviceId();
  const deviceName = getDeviceName();

  // Decrypt API messages when they change
  useEffect(() => {
    const decryptApiMessages = async () => {
      if (!userMessagesFromApi?.messages || !selectedRoomId || !rooms) return;

      setIsDecrypting(true);
      try {
        const store = await SignalProtocolStore.initialize(userId);
        const room = rooms.find((room) => room._id === selectedRoomId);

        if (!room || !store) {
          setIsDecrypting(false);
          return;
        }

        const decryptedMessages: Message[] = [];

        for (const message of userMessagesFromApi.messages) {
          try {
            const keyVersion = await store.getLatestRoomKeyVersion(
              room._id.toString()
            );
            const decryptedContent = await decryptMessage(
              userId,
              room.deviceId,
              room._id.toString(),
              message.content,
              keyVersion,
              store
            );

            decryptedMessages.push({
              ...message,
              decryptedContent,
              userId: {
                _id: message.userId,
                name: currentUser.name,
                email: currentUser.email,
              },
            });
          } catch (err) {
            console.error("Failed to decrypt message:", err);
            decryptedMessages.push({
              ...message,
              decryptedContent: "Failed to decrypt message",
            });
          }
        }

        setDecryptedApiMessages(decryptedMessages);
      } catch (error) {
        console.error("Error decrypting API messages:", error);
        setError("Failed to decrypt messages");
      } finally {
        setIsDecrypting(false);
      }
    };

    decryptApiMessages();
  }, [userMessagesFromApi, selectedRoomId, rooms, userId]);

  useEffect(() => {
    generateUserKeys(userId, deviceId, deviceName)
      .then(async (s) => {
        // Keys generated successfully
      })
      .catch((err) => {
        console.error("Error initializing keys:", err);
        setError("Failed to initialize encryption keys");
      });

    socket.on("newRoomMessage", async (message) => {
      const roomId = message.roomId;

      try {
        const store = await SignalProtocolStore.initialize(userId);
        const room = rooms?.find((room) => room._id === roomId);

        if (room && store) {
          const keyVersion = await store.getLatestRoomKeyVersion(
            room._id.toString()
          );
          const decryptedContent = await decryptMessage(
            userId,
            room.deviceId,
            room._id.toString(),
            message.content,
            keyVersion,
            store
          );

          const normalizedMessage: Message = {
            ...message,
            decryptedContent,
            userId: {
              _id: message.userId,
              name: currentUser.name,
              email: currentUser.email,
            },
          };

          setRoomMessages((prev) => ({
            ...prev,
            [roomId]: [...(prev[roomId] || []), normalizedMessage],
          }));
        } else {
          const fallbackMessage: Message = {
            ...message,
            decryptedContent: "Failed to decrypt",
            userId: {
              _id: message.userId,
              name: currentUser.name,
              email: currentUser.email,
            },
          };

          setRoomMessages((prev) => ({
            ...prev,
            [roomId]: [...(prev[roomId] || []), fallbackMessage],
          }));
        }
      } catch (error) {
        console.error("Error decrypting real-time message:", error);

        const errorMessage: Message = {
          ...message,
          decryptedContent: "Failed to decrypt",
          userId: {
            _id: message.userId,
            name: currentUser.name,
            email: currentUser.email,
          },
        };

        setRoomMessages((prev) => ({
          ...prev,
          [roomId]: [...(prev[roomId] || []), errorMessage],
        }));
      }
    });

    return () => {
      socket.off("room:messages");
      socket.off("newRoomMessage");
    };
  }, [userId, rooms]);

  useEffect(() => {
    if (selectedRoomId) {
      socket.emit("joinRoom", { roomId: selectedRoomId });
    }
  }, [selectedRoomId]);

  const handleSendMessage = async () => {
    const store = await SignalProtocolStore.initialize(userId);

    if (!newMessage.trim() || !selectedRoomId || !store) {
      return;
    }

    const currentRoom = rooms?.find(
      (room) => room._id === selectedRoomId.toString()
    );
    if (!currentRoom) return;

    try {
      const { roomId, ciphertext, keyVersion } = await encryptMessage(
        userId,
        currentRoom,
        newMessage,
        store!
      );

      socket.emit("sendMessageToRoom", {
        roomId: roomId,
        content: ciphertext,
        keyVersion,
      });

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

  const currentRoom = rooms?.find((room) => room._id === selectedRoomId);

  const currentRoomMessages = selectedRoomId
    ? roomMessages[selectedRoomId] || []
    : [];
  const allMessages = [...decryptedApiMessages, ...currentRoomMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  console.log(allMessages, "all messages");

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
                    <AvatarFallback>{getInitials(room.name)}</AvatarFallback>
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
                {isDecrypting && (
                  <p className="text-xs text-muted-foreground">
                    Decrypting messages...
                  </p>
                )}
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
            {allMessages.map((msg) => {
              const isOwnMessage =
                msg.userId.email === "khushboochauadhary@gmail.com";
              return (
                <div
                  key={msg._id}
                  className={`flex ${
                    isOwnMessage ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] ${
                      isOwnMessage ? "order-2" : "order-1"
                    }`}
                  >
                    {!isOwnMessage && (
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {msg.userId.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground font-medium">
                          {msg.user.name}
                        </span>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.decryptedContent || msg.content}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-background">
          {error && (
            <div className="mb-2 text-sm text-red-500 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
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
