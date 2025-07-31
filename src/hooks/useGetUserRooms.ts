import { useQuery } from "@tanstack/react-query";
import { getUserRoomsTemp } from "@/services/rooms.service";

export const useGetUserRooms = () => {
  return useQuery({
    queryKey: ["userRooms"],
    queryFn: getUserRoomsTemp,
    staleTime: 1000 * 60 * 5,
  });
};
