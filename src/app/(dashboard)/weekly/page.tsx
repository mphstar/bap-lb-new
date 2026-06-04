"use client";

import WeeklyEditorPage from "@/components/pages/WeeklyEditorPage";
import { useAppDataContext } from "@/context/AppDataContext";

export default function Page() {
  const { appData, updateWeeks, updateStudentMaster } = useAppDataContext();
  return (
    <WeeklyEditorPage
      template={appData.scheduleTemplate}
      weeks={appData.weeks}
      onWeeksChange={updateWeeks}
      activeWeek={appData.activeWeek}
      dosenList={appData.dosenList}
      studentMaster={appData.studentMaster}
      onStudentMasterChange={updateStudentMaster}
    />
  );
}
