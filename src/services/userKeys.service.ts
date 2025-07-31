import { axiosApi } from "@/lib/axiosApi";

export interface SignedPreKey {
  keyId: number;
  publicKey: string;
  signature: string;
}

export interface OneTimePreKey {
  keyId: number;
  publicKey: string;
}

export interface SendKeysPayload {
  userId: string;
  deviceId: string;
  deviceName: string;
  identityPublicKey: string;
  signedPreKey: SignedPreKey;
  oneTimePreKeys: OneTimePreKey[];
  registrationId: number;
}
export const sendUserKeys = async (payload: SendKeysPayload) => {
  const response = await axiosApi.post("/user/api/keys", payload, {
    withCredentials: true,
  });

  return response.data;
};
