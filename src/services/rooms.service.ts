import { axiosChatApi } from "@/lib/axiosChatApi";

export enum RoomTypeEnum {
  DM = "dm",
  GROUP = "group",
}

export interface CreateRoomPayload {
  name?: string;
  type: RoomTypeEnum;
  memberIds: string[];
}

export const getUserRooms = async (userId: string) => {
  const response = await axiosChatApi.get(`/user/${userId}`);
  return response.data;
};

export const getUserRoomsTemp = async () => {
  try {
    const response = await axiosChatApi.get(`/room/user`);
    console.log("response.data from API:", response.data);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(
      error?.response?.data?.message || "Unable to fetch user rooms"
    );
  }
};

export const test = async () => {
  try {
    const response = await axiosChatApi.get(`/room/protected`);
    console.log("response.data from API:", response.data);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(error?.response?.data?.message || "Not found");
  }
};

export const createRoom = async (payload: CreateRoomPayload) => {
  try {
    const response = await axiosChatApi.post(`/room/createRoom`, payload, {
      withCredentials: true,
    });
    console.log("response.data from API:", response.data);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(error?.response?.data?.message || "Not found");
  }
};
