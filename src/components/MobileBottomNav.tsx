"use client";

import React, { useState } from "react";
import Link from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Edit3,
  Award,
  Printer,
  MoreHorizontal,
  GraduationCap,
  BookOpen,
  ClipboardList,
  StickyNote,
  Archive,
  Settings,
  X,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileNavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: MobileNavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/template", label: "Jadwal", icon: Calendar },
  { path: "/weekly", label: "Mingguan", icon: Edit3 },
  { path: "/dosen", label: "Dosen", icon: Award },
  { path: "/preview", label: "Preview", icon: Printer },
];

const MORE_NAV = [
  { path: "/mahasiswa", label: "Master Mahasiswa", icon: GraduationCap },
  { path: "/jadwal-ujian", label: "Jadwal Ujian", icon: BookOpen },
  { path: "/penilaian", label: "Form Penilaian", icon: ClipboardList },
  { path: "/catatan", label: "Catatan", icon: StickyNote },
  { path: "/archives", label: "Arsip Data", icon: Archive },
  { path: "/settings", label: "Pengaturan", icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  };

  const isMoreActive = MORE_NAV.some((item) => pathname === item.path);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Navigasi Mobile"
        className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-panel/95 backdrop-blur-lg border-t border-rule shadow-[0_-4px_16px_rgba(0,0,0,0.06)] print:hidden pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-6 h-16 max-w-md mx-auto items-center px-1">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => router.push(item.path)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 h-full py-1 text-center transition-colors",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 inset-x-3 h-0.5 bg-primary rounded-full" />
                )}
                <Icon className={cn("size-5 transition-transform active:scale-90", isActive && "stroke-[2.25]")} />
                <span className="text-[10px] leading-tight truncate w-full px-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More Menu Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 h-full py-1 text-center transition-colors",
              isMoreActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isMoreActive && (
              <span className="absolute top-0 inset-x-3 h-0.5 bg-primary rounded-full" />
            )}
            <MoreHorizontal className="size-5 transition-transform active:scale-90" />
            <span className="text-[10px] leading-tight truncate w-full px-0.5">
              Lainnya
            </span>
          </button>
        </div>
      </nav>

      {/* "Lainnya" Mobile Drawer Sheet */}
      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-4 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-3 border-b border-rule">
            <SheetTitle className="text-base font-semibold flex items-center justify-between">
              <span>Menu Lainnya</span>
            </SheetTitle>
          </SheetHeader>

          {/* User Info Tile */}
          {session?.user && (
            <div className="mt-3 p-3 rounded-panel bg-panel-2 border border-rule flex items-center gap-3">
              <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {session.user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          )}

          {/* More Nav Links Grid */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {MORE_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    setIsMoreOpen(false);
                    router.push(item.path);
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-panel border text-left transition-colors",
                    isActive
                      ? "bg-primary/10 border-primary text-primary font-medium"
                      : "bg-panel border-rule text-foreground hover:bg-panel-2"
                  )}
                >
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Logout Action */}
          <div className="mt-5 pt-3 border-t border-rule">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-control text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors"
            >
              <LogOut className="size-4" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
