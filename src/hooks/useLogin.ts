import { sendMagicLink } from "@/services/login.service";
import { useMutation } from "@tanstack/react-query";

export const useMagicLink = () => {
    const sendMagicLinkMutation = useMutation({
        mutationFn: ({ email }: { email: string }) => sendMagicLink(email),
        onError: (error: Error) => {
        console.error('Send magic link error:', error.message);
      },
    });
    return { sendMagicLinkMutation };
};