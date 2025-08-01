import { axiosChatApi } from "@/lib/axiosChatApi";
import { useQuery } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useParams } from "react-router-dom";

export const getUserMessages = async (roomId: string) => {
  try {
    const token = Cookies.get("accessToken");

    console.log(token);
    const response = await axiosChatApi.get(`/messages/room/${roomId}`);
    console.log("response.data from API:", response.data);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(
      error?.response?.data?.message || "Unable to fetch user rooms"
    );
  }
};

export const useGetUserAllMessages = (roomId: string) => {
  // const { roomId } = useParams<{ roomId: string }>();
  return useQuery({
    queryKey: ["userMessages", roomId],
    queryFn: () => getUserMessages(roomId),
    staleTime: 1000 * 60 * 5,
  });
};
