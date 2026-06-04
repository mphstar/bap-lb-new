"use client";

import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/AppSidebar";
import { AppDataProvider, useAppDataContext } from "@/context/AppDataContext";
import { exportWeeklyData } from "@/utils/excelExporter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { DialogProvider, useDialog } from "@/context/DialogContext";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/template": "Jadwal Template",
  "/weekly": "Data Mingguan",
  "/mahasiswa": "Master Mahasiswa",
  "/dosen": "Master Dosen",
  "/preview": "Preview & Print",
  "/penilaian": "Form Penilaian",
  "/settings": "Pengaturan",
  "/jadwal-ujian": "Jadwal Ujian",
  "/catatan": "Catatan",
  "/archives": "Arsip Data",
};

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { showAlert, showConfirm } = useDialog();
  
  const {
    appData,
    loading,
    saving,
    error,
    clearAll,
    assessmentSaving
  } = useAppDataContext();

  const pageTitle = (pathname && PAGE_TITLES[pathname]) || "BAP System";

  const handleClearAll = () => {
    showConfirm(
      "Hapus Semua Data",
      "Apakah Anda yakin ingin menghapus semua data? Tindakan ini tidak bisa dibatalkan."
    ).then(async (confirmClear) => {
      if (!confirmClear) return;
      await clearAll();
      router.push("/template");
    });
  };

  const handleExportAll = () => {
    if (appData.scheduleTemplate.length === 0) {
      showAlert(
        "Ekspor Gagal",
        "Tidak ada data untuk diexport. Buat jadwal template terlebih dahulu."
      );
      return;
    }
    const weekNumbers = Array.from({ length: 16 }, (_, i) => i + 1);
    exportWeeklyData(appData.scheduleTemplate, appData.weeks, weekNumbers);
  };

  return (
    <SidebarProvider>
      <AppSidebar
        onClearAll={handleClearAll}
        onExportAll={handleExportAll}
        templateCount={appData.scheduleTemplate.length}
        activeWeek={appData.activeWeek}
        dosenCount={appData.dosenList.length}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 print:hidden bg-background relative">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-semibold">{pageTitle}</h1>
          {(saving || assessmentSaving) && (
            <>
              <div className="ml-auto flex items-center gap-2 text-xs text-primary font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden">
                <div className="h-full bg-primary animate-[saving-bar_1.5s_ease-in-out_infinite] w-1/3" />
              </div>
              <style>{`@keyframes saving-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
            </>
          )}
        </header>

        <main className="flex-1 p-6 print:p-0 bg-background overflow-y-auto">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <DialogProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </DialogProvider>
    </AppDataProvider>
  );
}
