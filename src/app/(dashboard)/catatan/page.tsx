"use client";

import NotesPage from "@/components/pages/NotesPage";
import { useAppDataContext } from "@/context/AppDataContext";

export default function Page() {
  const { userId } = useAppDataContext();
  return (
    <NotesPage
      userId={userId}
    />
  );
}
