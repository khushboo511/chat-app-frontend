import { SignalProtocolStore } from "@/encryption/signal-protocol";
import { useCreateRoom } from "@/hooks/useCreateRoom";
import { useCreateUserKeys } from "@/hooks/useSendUserKeys";
import { useTest } from "@/hooks/useTest";
import { RoomTypeEnum } from "@/services/rooms.service";
import { FC, useEffect, useRef } from "react";

interface DashboardProps {}

const Dashboard: FC<DashboardProps> = ({}) => {
  const { data: protectedroute } = useTest();
  const { mutate, isPending } = useCreateRoom();

  const handleCreateRoom = () => {
    mutate({
      name: "New Room",
      type: RoomTypeEnum.DM,
      memberIds: ["6874e1725bdf18aa80e1270d", "688c9441a32bcf8f56cf2aea"],
    });
  };

  useEffect(() => {
    console.log(protectedroute, "protected route");
  }, []);
  return (
    <div>
      <button
        onClick={handleCreateRoom}
        disabled={isPending}
        className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create Room"}
      </button>
    </div>
  );
};

export default Dashboard;
