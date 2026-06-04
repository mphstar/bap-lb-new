"use client";

import StudentMasterPage from "@/components/pages/StudentMasterPage";
import { useAppDataContext } from "@/context/AppDataContext";

export default function Page() {
  const { appData, updateStudentMaster } = useAppDataContext();
  return (
    <StudentMasterPage
      studentMaster={appData.studentMaster}
      onStudentMasterChange={updateStudentMaster}
      weeks={appData.weeks}
      scheduleTemplate={appData.scheduleTemplate}
    />
  );
}
