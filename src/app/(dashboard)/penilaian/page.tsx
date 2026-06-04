"use client";

import AssessmentPage from "@/components/pages/AssessmentPage";
import { useAppDataContext } from "@/context/AppDataContext";

export default function Page() {
  const { userId, appData } = useAppDataContext();
  return (
    <AssessmentPage
      userId={userId}
      studentMaster={appData.studentMaster}
    />
  );
}
