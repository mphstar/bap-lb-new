"use client";

import DosenMasterPage from "@/components/pages/DosenMasterPage";
import { useAppDataContext } from "@/context/AppDataContext";

export default function Page() {
  const { appData, updateDosenList } = useAppDataContext();
  return (
    <DosenMasterPage
      dosenList={appData.dosenList}
      onDosenListChange={updateDosenList}
      weeks={appData.weeks}
      scheduleTemplate={appData.scheduleTemplate}
    />
  );
}
