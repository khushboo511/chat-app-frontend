import { test } from "@/services/rooms.service";
import { useQuery } from "@tanstack/react-query";

export const useTest = () => {
  return useQuery({
    queryKey: ["test"],
    queryFn: test,
    staleTime: 1000 * 60 * 5,
  });
};
