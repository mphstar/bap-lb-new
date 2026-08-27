"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useAppData } from "@/hooks/useAppData";
import { useAssessmentData } from "@/hooks/useAssessmentData";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { AppData as AppDataType, AssessmentForm } from "@/types";

interface AppDataContextType {
  appData: AppDataType;
  loading: boolean;
  saving: boolean;
  error: Error | null;
  updateTemplate: (template: any[], smartWeeksData?: any) => void;
  updateWeeks: (weeks: any[]) => void;
  updateActiveWeek: (activeWeek: number) => void;
  updateAcademicSettings: (academicYear: string, academicSemester: string) => void;
  updateStudentMaster: (studentMaster: any[]) => void;
  updateDosenList: (dosenList: any[]) => void;
  clearAll: () => Promise<void>;
  reload: () => Promise<void>;
  assessmentForms: AssessmentForm[];
  setAssessmentForms: (forms: any) => void;
  assessmentSaving: boolean;
  userId: string | null;
}

const AppDataContext = createContext<AppDataContextType | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  
  const userId = session?.user?.id ?? null;
  
  const {
    data: appData,
    loading: dataLoading,
    saving,
    error,
    updateTemplate,
    updateWeeks,
    updateActiveWeek,
    updateAcademicSettings,
    updateStudentMaster,
    updateDosenList,
    clearAll,
    reload
  } = useAppData(userId);

  const {
    forms: assessmentForms,
    setForms: setAssessmentForms,
    saving: assessmentSaving,
    loading: assessmentLoading
  } = useAssessmentData(userId);

  // Redirect to login if unauthenticated after session check loads
  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace("/login");
    }
  }, [session, sessionPending, router]);

  // Loading spinner while checking authentication
  if (sessionPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <AppDataContext.Provider value={{
      appData,
      loading: dataLoading || assessmentLoading,
      saving,
      error,
      updateTemplate,
      updateWeeks,
      updateActiveWeek,
      updateAcademicSettings,
      updateStudentMaster,
      updateDosenList,
      clearAll,
      reload,
      assessmentForms,
      setAssessmentForms,
      assessmentSaving,
      userId
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppDataContext = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppDataContext must be used within an AppDataProvider");
  }
  return context;
};
