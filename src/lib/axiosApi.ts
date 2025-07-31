import axios from "axios";
import { attachAuthInterceptor } from "./sharedInterceptor";

export const axiosApi = axios.create({
  baseURL: import.meta.env.BACKEND_API_URL || "http://localhost:3000",
  withCredentials: true,
});

// let isRefreshing = false;
// let failedQueue: any[] = [];

// const processQueue = (error: any, token: string | null = null) => {
//   failedQueue.forEach((prom) => {
//     if (error) prom.reject(error);
//     else prom.resolve(token);
//   });
//   failedQueue = [];
// };

// axiosApi.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     if (
//       error.response?.status === 401 &&
//       !originalRequest._retry &&
//       !originalRequest.url.includes("/auth/refresh-token")
//     ) {
//       originalRequest._retry = true;

//       if (isRefreshing) {
//         return new Promise((resolve, reject) => {
//           failedQueue.push({ resolve, reject });
//         })
//           .then(() => axiosApi(originalRequest))
//           .catch((err) => Promise.reject(err));
//       }

//       isRefreshing = true;

//       try {
//         console.log("[Auth] Refreshing token...");
//         await axiosApi.post("/auth/refresh-token");
//         processQueue(null);
//         return axiosApi(originalRequest);
//       } catch (err) {
//         processQueue(err, null);
//         console.warn("[Auth] Refresh failed. Redirecting to login.");
//         window.location.href = "/login";
//         return Promise.reject(err);
//       } finally {
//         isRefreshing = false;
//       }
//     }

//     return Promise.reject(error);
//   }
// );

attachAuthInterceptor(axiosApi);
