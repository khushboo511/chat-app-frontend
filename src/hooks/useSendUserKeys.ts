import { SendKeysPayload, sendUserKeys } from "@/services/userKeys.service";
import { useMutation } from "@tanstack/react-query";

export const useCreateUserKeys = () => {
  return useMutation({
    mutationFn: (payload: SendKeysPayload) => sendUserKeys(payload),
    onSuccess: (data) => {
      console.log("User keys sent successfully:", data);
    },
  });
};
