import { SendKeysPayload, sendUserKeys } from "@/services/userKeys.service";
import { useMutation } from "@tanstack/react-query";

export const useSendUserKeys = () => {
  return useMutation({
    mutationFn: (payload: SendKeysPayload) => sendUserKeys(payload),
    onError: (error: any) => {
      console.error("Error sending user keys:", error?.message || error);
    },
    onSuccess: (data) => {
      console.log("User keys sent successfully:", data);
    },
  });
};
