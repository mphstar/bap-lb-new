"use client";

import PreviewPrintPage from "@/components/pages/PreviewPrintPage";
import { useAppDataContext } from "@/context/AppDataContext";

export default function Page() {
  const { appData, updateTeknisiSignature } = useAppDataContext();
  return (
    <PreviewPrintPage
      template={appData.scheduleTemplate}
      weeks={appData.weeks}
      activeWeek={appData.activeWeek}
      dosenList={appData.dosenList}
      academicYear={appData.academicYear}
      academicSemester={appData.academicSemester}
      teknisiSignature={appData.teknisiSignature ?? null}
      onTeknisiSignatureChange={updateTeknisiSignature}
    />
  );
}
