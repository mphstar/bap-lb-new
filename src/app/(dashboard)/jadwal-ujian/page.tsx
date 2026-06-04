"use client";

import ExamSchedulePage from "@/components/pages/ExamSchedulePage";
import { useAppDataContext } from "@/context/AppDataContext";

export default function Page() {
  const { userId } = useAppDataContext();
  return (
    <ExamSchedulePage
      userId={userId}
    />
  );
}
