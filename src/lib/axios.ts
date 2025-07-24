import axios from "axios";

export const axiosApi = axios.create({
  baseURL: import.meta.env.BACKEND_BASE_URL || "http://localhost:3000",
  withCredentials: true,
});
