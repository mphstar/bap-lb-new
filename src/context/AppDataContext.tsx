"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useAppData } from "@/hooks/useAppData";
import { useAssessmentData } from "@/hooks/useAssessmentData";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { AppData as AppDataType, AssessmentForm, Archive as ArchiveType } from "@/types";

interface ActiveArchiveSession {
  id: string;
  name: string;
  createdAt: string;
  snapshot: any;
}

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
  updateTeknisiSignature: (sig: string | null) => void;
  clearAll: () => Promise<void>;
  reload: () => Promise<void>;
  assessmentForms: AssessmentForm[];
  setAssessmentForms: (forms: any) => void;
  assessmentSaving: boolean;
  userId: string | null;
  // Archive view-mode support
  activeArchive: ActiveArchiveSession | null;
  enterArchiveMode: (archiveId: string, name: string, createdAt: string, snapshot: any) => void;
  exitArchiveMode: () => void;
}

const AppDataContext = createContext<AppDataContextType | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  
  const userId = session?.user?.id ?? null;
  
  const {
    data: liveAppData,
    loading: dataLoading,
    saving: liveSaving,
    error: liveError,
    updateTemplate: liveUpdateTemplate,
    updateWeeks: liveUpdateWeeks,
    updateActiveWeek: liveUpdateActiveWeek,
    updateAcademicSettings: liveUpdateAcademicSettings,
    updateStudentMaster: liveUpdateStudentMaster,
    updateDosenList: liveUpdateDosenList,
    updateTeknisiSignature: liveUpdateTeknisiSignature,
    clearAll: liveClearAll,
    reload: liveReload
  } = useAppData(userId);

  const {
    forms: liveAssessmentForms,
    setForms: liveSetAssessmentForms,
    saving: liveAssessmentSaving,
    loading: assessmentLoading
  } = useAssessmentData(userId);

  // Archive inspection mode state (stored in sessionStorage so it persists per tab session)
  const [activeArchive, setActiveArchive] = useState<ActiveArchiveSession | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("bap_active_archive_session");
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const enterArchiveMode = useCallback((archiveId: string, name: string, createdAt: string, snapshot: any) => {
    const sessionObj: ActiveArchiveSession = { id: archiveId, name, createdAt, snapshot };
    setActiveArchive(sessionObj);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("bap_active_archive_session", JSON.stringify(sessionObj));
      } catch (e) {
        console.error("Failed to cache archive session", e);
      }
    }
  }, []);

  const exitArchiveMode = useCallback(() => {
    setActiveArchive(null);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("bap_active_archive_session");
      } catch (e) {}
    }
  }, []);

  // Compute read-only appData if archive mode is active
  const effectiveAppData = useMemo<AppDataType>(() => {
    if (!activeArchive || !activeArchive.snapshot) {
      return liveAppData;
    }

    const snap = activeArchive.snapshot;
    const templateData = snap.scheduleTemplates || [];
    const weeklyEntriesData = snap.weeklyEntries || [];
    const weeklyStudentsData = snap.weeklyStudents || [];

    // Reconstruct 16 weeks structure from snapshot
    const reconstructedWeeks = Array.from({ length: 16 }, (_, i) => {
      const weekNum = i + 1;
      return {
        weekNumber: weekNum,
        entries: templateData.map((tmpl: any) => {
          const entry = weeklyEntriesData.find(
            (e: any) => e.weekNumber === weekNum && e.scheduleId === tmpl.id
          );
          const students = entry
            ? weeklyStudentsData
                .filter((s: any) => s.weeklyEntryId === entry.id)
                .map((s: any, idx: number) => ({
                  id: idx + 1,
                  nim: s.nim,
                  name: s.name,
                  remarks: s.remarks || "ALPHA",
                }))
            : [];

          return {
            scheduleId: tmpl.id,
            pengajar: entry?.pengajar || tmpl.defaultPengajar || "",
            materi: entry?.materi || "",
            tanggal: entry?.tanggal || "",
            teknisi: entry?.teknisi || tmpl.defaultTeknisi || "",
            students,
          };
        }),
      };
    });

    return {
      scheduleTemplate: templateData.map((t: any) => ({
        id: t.id,
        no: Number(t.no) || 0,
        mataKuliah: t.mataKuliah || "",
        hari: t.hari || "",
        tempat: t.tempat || "",
        jam: t.jam || "",
        prodi: t.prodi || "",
        semester: t.semester || "",
        golongan: t.golongan || "",
        defaultPengajar: t.defaultPengajar || "",
        defaultTeknisi: t.defaultTeknisi || "",
      })),
      weeks: reconstructedWeeks,
      activeWeek: snap.activeWeek ?? 1,
      academicYear: snap.academicYear ?? "2025/2026",
      academicSemester: snap.academicSemester ?? "Genap",
      dosenList: snap.dosenList || [],
      studentMaster: snap.studentMaster || [],
      teknisiSignature: liveAppData.teknisiSignature || null,
    };
  }, [activeArchive, liveAppData]);

  const effectiveAssessmentForms = useMemo<AssessmentForm[]>(() => {
    if (!activeArchive || !activeArchive.snapshot) {
      return liveAssessmentForms;
    }
    return activeArchive.snapshot.assessmentForms || [];
  }, [activeArchive, liveAssessmentForms]);

  // Safe wrapper mutations (no-op or state-only in archive mode to guarantee safety)
  const [localActiveWeekOverride, setLocalActiveWeekOverride] = useState<number | null>(null);

  const updateActiveWeek = useCallback((week: number) => {
    if (activeArchive) {
      setLocalActiveWeekOverride(week);
    } else {
      liveUpdateActiveWeek(week);
    }
  }, [activeArchive, liveUpdateActiveWeek]);

  const appDataWithLocalWeek = useMemo(() => {
    if (activeArchive && localActiveWeekOverride !== null) {
      return { ...effectiveAppData, activeWeek: localActiveWeekOverride };
    }
    return effectiveAppData;
  }, [effectiveAppData, activeArchive, localActiveWeekOverride]);

  // Redirect to login if unauthenticated after session check loads
  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace("/login");
    }
  }, [session, sessionPending, router]);

  // Loading spinner while checking authentication or initial data loading
  if (sessionPending || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-3">
        <div className="relative flex items-center justify-center">
          <div className="size-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Memuat data BAP...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <AppDataContext.Provider value={{
      appData: appDataWithLocalWeek,
      loading: dataLoading || assessmentLoading,
      saving: activeArchive ? false : liveSaving,
      error: liveError,
      updateTemplate: activeArchive ? () => {} : liveUpdateTemplate,
      updateWeeks: activeArchive ? () => {} : liveUpdateWeeks,
      updateActiveWeek,
      updateAcademicSettings: activeArchive ? () => {} : liveUpdateAcademicSettings,
      updateStudentMaster: activeArchive ? () => {} : liveUpdateStudentMaster,
      updateDosenList: activeArchive ? () => {} : liveUpdateDosenList,
      updateTeknisiSignature: activeArchive ? () => {} : liveUpdateTeknisiSignature,
      clearAll: activeArchive ? async () => {} : liveClearAll,
      reload: liveReload,
      assessmentForms: effectiveAssessmentForms,
      setAssessmentForms: activeArchive ? () => {} : liveSetAssessmentForms,
      assessmentSaving: activeArchive ? false : liveAssessmentSaving,
      userId,
      activeArchive,
      enterArchiveMode,
      exitArchiveMode,
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
