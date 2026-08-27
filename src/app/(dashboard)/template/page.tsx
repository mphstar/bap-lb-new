"use client";

import ScheduleTemplatePage from "@/components/pages/ScheduleTemplatePage";
import { useAppDataContext } from "@/context/AppDataContext";

export default function Page() {
  const { appData, updateTemplate } = useAppDataContext();
  return (
    <ScheduleTemplatePage
      template={appData.scheduleTemplate}
      onTemplateChange={updateTemplate}
      dosenList={appData.dosenList}
      academicYear={appData.academicYear}
      academicSemester={appData.academicSemester}
    />
  );
}
