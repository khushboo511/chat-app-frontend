import axios from "axios";
import { attachAuthInterceptor } from "./sharedInterceptor";

export const axiosChatApi = axios.create({
  baseURL: import.meta.env.BACKEND_CHAT_URL || "http://localhost:3016",
  withCredentials: true,
});

attachAuthInterceptor(axiosChatApi);
