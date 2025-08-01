import {
  generateRoomSharedKey,
  SignalProtocolStore,
} from "@/encryption/signal-protocol";
import { createRoom, CreateRoomPayload } from "@/services/rooms.service";
import { useMutation } from "@tanstack/react-query";

export const useCreateRoom = () => {
  return useMutation({
    mutationFn: async (payload: CreateRoomPayload) => {
      const userId = "688c9441a32bcf8f56cf2aea";
      const store = await SignalProtocolStore.initialize(userId);

      const room = await createRoom(payload);

      await generateRoomSharedKey(room._id, room, store);

      return room;
    },
    onError: (error: any) => {
      console.error(
        "Error creating room or sending keys:",
        error?.message || error
      );
    },
    onSuccess: (data) => {
      console.log("Room created and shared keys sent successfully:", data);
    },
  });
};
