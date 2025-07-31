import { useTest } from "@/hooks/useTest";
import { FC, useEffect } from "react";

interface DashboardProps {}

const Dashboard: FC<DashboardProps> = ({}) => {
  const { data: protectedroute } = useTest();

  useEffect(() => {
    console.log(protectedroute, "protected route");
  }, []);
  return <div>Dashboard</div>;
};

export default Dashboard;
