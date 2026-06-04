"use client";

import DashboardPage from "@/components/pages/DashboardPage";
import { useAppDataContext } from "@/context/AppDataContext";

export default function Page() {
  const { appData } = useAppDataContext();
  return (
    <DashboardPage
      template={appData.scheduleTemplate}
      weeks={appData.weeks}
      activeWeek={appData.activeWeek}
    />
  );
}
