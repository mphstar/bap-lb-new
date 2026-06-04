import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Calendar,
    Edit3,
    Printer,
    Settings,
    Database,
    Trash2,
    Download,
    ClipboardList,
    Sun,
    Moon,
    LogOut,
    LayoutDashboard,
    BookOpen,
    StickyNote,
    GraduationCap,
    Award,
    Archive,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

interface AppSidebarProps {
    onClearAll: () => void;
    onExportAll: () => void;
    templateCount: number;
    activeWeek: number;
    dosenCount: number;
}

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
    description: string;
}

const UTAMA_ITEMS: NavItem[] = [
    {
        path: "/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="size-4" />,
        description: "Rekapitulasi data",
    },
];

const PERKULIAHAN_ITEMS: NavItem[] = [
    {
        path: "/template",
        label: "Jadwal Template",
        icon: <Calendar className="size-4" />,
        description: "Kelola jadwal dasar",
    },
    {
        path: "/weekly",
        label: "Data Mingguan",
        icon: <Edit3 className="size-4" />,
        description: "Edit pengajar & materi",
    },
    {
        path: "/jadwal-ujian",
        label: "Jadwal Ujian",
        icon: <BookOpen className="size-4" />,
        description: "Kelola jadwal UTS/UAS",
    },
];

const MASTER_ITEMS: NavItem[] = [
    {
        path: "/mahasiswa",
        label: "Master Mahasiswa",
        icon: <GraduationCap className="size-4" />,
        description: "Kelola data mahasiswa",
    },
    {
        path: "/dosen",
        label: "Master Dosen",
        icon: <Award className="size-4" />,
        description: "Kelola data dosen & ttd",
    },
];

const DOKUMEN_ITEMS: NavItem[] = [
    {
        path: "/preview",
        label: "Preview & Print",
        icon: <Printer className="size-4" />,
        description: "Pracetak dokumen BAP",
    },
    {
        path: "/penilaian",
        label: "Form Penilaian",
        icon: <ClipboardList className="size-4" />,
        description: "Buat & input penilaian",
    },
    {
        path: "/catatan",
        label: "Catatan",
        icon: <StickyNote className="size-4" />,
        description: "Simpan informasi penting",
    },
    {
        path: "/archives",
        label: "Arsip Data",
        icon: <Archive className="size-4" />,
        description: "Kelola arsip semester",
    },
];

const CONFIG_ITEMS: NavItem[] = [
    {
        path: "/settings",
        label: "Pengaturan",
        icon: <Settings className="size-4" />,
        description: "Konfigurasi aplikasi",
    },
];

export function AppSidebar({
    onClearAll,
    onExportAll,
    templateCount,
    activeWeek,
    dosenCount,
}: AppSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("bap-theme") === "dark" ||
                document.documentElement.classList.contains("dark");
        }
        return false;
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("bap-theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("bap-theme", "light");
        }
    }, [isDark]);

    return (
        <Sidebar collapsible="icon">
            {/* Header */}
            <SidebarHeader className="border-b border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="cursor-default hover:bg-transparent active:bg-transparent"
                        >
                            <div className="flex items-center justify-center rounded-lg bg-primary text-primary-foreground size-8 shrink-0">
                                <Database className="size-4" />
                            </div>
                            <div className="flex flex-col gap-0.5 leading-none min-w-0">
                                <span className="font-bold text-sm truncate">BAP System</span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                    Berita Acara Perkuliahan
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* Navigation */}
            <SidebarContent className="overflow-x-hidden">
                <SidebarGroup>
                    <SidebarGroupLabel>Utama</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {UTAMA_ITEMS.map((item) => (
                                <SidebarMenuItem key={item.path}>
                                    <SidebarMenuButton
                                        isActive={pathname === item.path}
                                        tooltip={item.label}
                                        onClick={() => router.push(item.path)}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                    <SidebarGroupLabel>Perkuliahan</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {PERKULIAHAN_ITEMS.map((item) => (
                                <SidebarMenuItem key={item.path}>
                                    <SidebarMenuButton
                                        isActive={pathname === item.path}
                                        tooltip={item.label}
                                        onClick={() => router.push(item.path)}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                    <SidebarGroupLabel>Master Data</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {MASTER_ITEMS.map((item) => (
                                <SidebarMenuItem key={item.path}>
                                    <SidebarMenuButton
                                        isActive={pathname === item.path}
                                        tooltip={item.label}
                                        onClick={() => router.push(item.path)}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                    <SidebarGroupLabel>Dokumen & Catatan</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {DOKUMEN_ITEMS.map((item) => (
                                <SidebarMenuItem key={item.path}>
                                    <SidebarMenuButton
                                        isActive={pathname === item.path}
                                        tooltip={item.label}
                                        onClick={() => router.push(item.path)}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                    <SidebarGroupLabel>Konfigurasi</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {CONFIG_ITEMS.map((item) => (
                                <SidebarMenuItem key={item.path}>
                                    <SidebarMenuButton
                                        isActive={pathname === item.path}
                                        tooltip={item.label}
                                        onClick={() => router.push(item.path)}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                {/* Status Info */}
                <SidebarGroup>
                    <SidebarGroupLabel>Status</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <div className="px-2 py-1 space-y-2 group-data-[collapsible=icon]:hidden overflow-hidden">
                            <div className="flex items-center justify-between text-xs min-w-0">
                                <span className="text-muted-foreground truncate">Jadwal</span>
                                <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
                                    {templateCount} entri
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs min-w-0">
                                <span className="text-muted-foreground truncate">Dosen</span>
                                <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
                                    {dosenCount} orang
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs min-w-0">
                                <span className="text-muted-foreground truncate">Minggu Aktif</span>
                                <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                                    Minggu {activeWeek}
                                </Badge>
                            </div>
                        </div>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip={isDark ? "Mode Terang" : "Mode Gelap"}
                            onClick={() => setIsDark(!isDark)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                            <span>{isDark ? "Mode Terang" : "Mode Gelap"}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Export Semua Minggu (1-16)"
                            onClick={onExportAll}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <Download className="size-4" />
                            <span>Export Excel</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Hapus Semua Data"
                            onClick={onClearAll}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="size-4" />
                            <span>Reset Data</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Logout"
                            onClick={async () => {
                                await authClient.signOut({
                                    fetchOptions: {
                                        onSuccess: () => {
                                            router.push("/login");
                                        }
                                    }
                                });
                            }}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <LogOut className="size-4" />
                            <span>Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
