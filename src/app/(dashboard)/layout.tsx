"use client";

/* Hallmark · genre: modern-minimal · macrostructure: Workbench
 * design-system: design.md · designed-as-app · nav: N3 side-rail (floating inset)
 *
 * There is no chrome bar. Page identity lives in the content column via
 * <PageHeader>, which each page renders itself — that also removes the old
 * duplicate title (layout <h1> plus an in-page <h2> on nearly every route).
 * The save indicator became a floating pill because it no longer has a bar
 * to sit in.
 */

import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppDataProvider, useAppDataContext } from "@/context/AppDataContext";
import { exportWeeklyData } from "@/utils/excelExporter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, ArrowUp } from "lucide-react";
import { DialogProvider, useDialog } from "@/context/DialogContext";
import { AIAssistantWidget } from "@/components/AIAssistantWidget";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

function SavingPill({ children }: { children: React.ReactNode }) {
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-20 md:bottom-5 right-5 z-30 flex items-center gap-2.5 overflow-hidden rounded-control border border-rule bg-panel px-3.5 py-2 text-xs font-medium text-foreground shadow-lg print:hidden"
        >
            <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
            <span className="whitespace-nowrap">{children}</span>
            <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/15"
            >
                <span className="block h-full w-1/3 bg-primary [animation:hm-saving-sweep_1.4s_var(--ease-in-out)_infinite]" />
            </span>
        </div>
    );
}

function MobileFloatingScrollTop() {
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
            setShowScrollTop(scrollY > 250);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (!showScrollTop) return null;

    return (
        <div className="fixed bottom-20 left-4 z-40 md:hidden print:hidden">
            <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={scrollToTop}
                aria-label="Kembali ke atas"
                className="size-10 rounded-full shadow-lg bg-panel/95 backdrop-blur-md border border-rule text-foreground hover:bg-panel-2 transition-transform active:scale-95 animate-in fade-in zoom-in-75 duration-200"
            >
                <ArrowUp className="size-4 text-primary" />
            </Button>
        </div>
    );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { showAlert, showConfirm } = useDialog();

    const { appData, saving, error, clearAll, assessmentSaving } =
        useAppDataContext();

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
            {/* Desktop Sidebar (hidden on mobile) */}
            <div className="hidden md:block">
                <AppSidebar
                    onClearAll={handleClearAll}
                    onExportAll={handleExportAll}
                    templateCount={appData.scheduleTemplate.length}
                    activeWeek={appData.activeWeek}
                    dosenCount={appData.dosenList.length}
                />
            </div>

            <SidebarInset className="bg-ground flex flex-col min-h-screen overflow-x-hidden pb-20 md:pb-0">
                <main className="flex-1 overflow-x-hidden print:overflow-visible">
                    {error && (
                        <div className="w-full px-5 pt-7 sm:px-8 lg:px-10 print:hidden">
                            <Alert variant="destructive">
                                <AlertCircle className="size-4" />
                                <AlertTitle>Terjadi kesalahan</AlertTitle>
                                <AlertDescription>{error.message}</AlertDescription>
                            </Alert>
                        </div>
                    )}
                    {children}
                </main>
            </SidebarInset>

            <MobileFloatingScrollTop />
            <MobileBottomNav />
            <AIAssistantWidget />

            {(saving || assessmentSaving) && <SavingPill>Menyimpan…</SavingPill>}
        </SidebarProvider>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AppDataProvider>
            <DialogProvider>
                <DashboardLayoutContent>{children}</DashboardLayoutContent>
            </DialogProvider>
        </AppDataProvider>
    );
}
