import { axiosApi } from "@/lib/axiosApi";

export const sendMagicLink = async (email: string) => {
  const response = await axiosApi.post("/auth/request-login", { email });
  return response.data;
};
