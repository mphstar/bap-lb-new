"use client";

/* Hallmark · nav: N3 side-rail (floating inset) · genre: modern-minimal
 * design-system: design.md · designed-as-app
 *
 * Shell notes:
 * · The rail floats — rounded panel with a hairline, inset from the viewport.
 * · Group labels are micro-caps (.hm-eyebrow); groups separate by gap, not by
 *   a drawn rule. The old build used five <SidebarSeparator>s, which made the
 *   rail read as a stack of boxes.
 * · The active item is a NEUTRAL fill, never indigo. The accent budget is
 *   spent on the CTA pill and the focus ring only.
 * · The CTA slot holds the one GLOBAL action (Export Excel). Page-specific
 *   actions — import, create note — belong in <PageHeader>, not here. The rail
 *   must mean the same thing on every route.
 * · Reset / Logout live in the account menu behind the chevron.
 *
 * Metrics are matched to the user's reference shell:
 *   column 288px (256px panel + 16px inset) · inner padding 12px
 *   nav item 40px tall, 46px pitch · icon 18px · label 15px
 *   divider under the header and above the account block, inset to the items.
 */

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Calendar,
    Edit3,
    Printer,
    Settings,
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
    ChevronsUpDown,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { BapLogo } from "@/components/BapLogo";

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
    useSidebar,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        label: "Utama",
        items: [
            {
                path: "/dashboard",
                label: "Dashboard",
                icon: <LayoutDashboard />,
            },
        ],
    },
    {
        label: "Perkuliahan",
        items: [
            { path: "/template", label: "Jadwal Template", icon: <Calendar /> },
            { path: "/weekly", label: "Data Mingguan", icon: <Edit3 /> },
            { path: "/jadwal-ujian", label: "Jadwal Ujian", icon: <BookOpen /> },
        ],
    },
    {
        label: "Master Data",
        items: [
            {
                path: "/mahasiswa",
                label: "Master Mahasiswa",
                icon: <GraduationCap />,
            },
            { path: "/dosen", label: "Master Dosen", icon: <Award /> },
        ],
    },
    {
        label: "Dokumen",
        items: [
            { path: "/preview", label: "Preview & Print", icon: <Printer /> },
            { path: "/penilaian", label: "Form Penilaian", icon: <ClipboardList /> },
            { path: "/catatan", label: "Catatan", icon: <StickyNote /> },
            { path: "/archives", label: "Arsip Data", icon: <Archive /> },
        ],
    },
    {
        label: "Konfigurasi",
        items: [{ path: "/settings", label: "Pengaturan", icon: <Settings /> }],
    },
];

function useDarkMode() {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== "undefined") {
            return (
                localStorage.getItem("bap-theme") === "dark" ||
                document.documentElement.classList.contains("dark")
            );
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

    return [isDark, setIsDark] as const;
}

export function AppSidebar({
    onClearAll,
    onExportAll,
    templateCount,
    activeWeek,
    dosenCount,
}: AppSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isDark, setIsDark] = useDarkMode();
    const { toggleSidebar, state } = useSidebar();
    const { data: session } = authClient.useSession();

    const userName = session?.user?.name?.trim() || "Akun";
    const userEmail = session?.user?.email ?? "";
    const initial = userName.charAt(0).toUpperCase();

    const handleSignOut = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => router.push("/login"),
            },
        });
    };

    return (
        <Sidebar variant="floating" collapsible="icon">
            {/* Wordmark + rail controls, per the reference header row */}
            <SidebarHeader className="px-3 pb-0 pt-3 group-data-[collapsible=icon]:px-2">
                <div className="flex items-center gap-2.5 border-b border-sidebar-border pb-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-b-0">
                    {state === "collapsed" ? (
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            aria-label="Buka panel samping"
                            title="Buka panel samping"
                            className="group/mark flex size-10 shrink-0 items-center justify-center rounded-control transition-colors duration-[180ms] ease-out hover:bg-sidebar-accent"
                        >
                            <BapLogo className="size-6 group-hover/mark:hidden" />
                            <PanelLeftOpen
                                aria-hidden
                                className="hidden size-[1.125rem] text-foreground group-hover/mark:block"
                            />
                        </button>
                    ) : (
                        <BapLogo className="size-7" />
                    )}

                    <div className="min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                        <p className="truncate text-sm font-semibold">BAP System</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5 group-data-[collapsible=icon]:hidden">
                        <button
                            type="button"
                            onClick={() => setIsDark(!isDark)}
                            aria-label={isDark ? "Mode terang" : "Mode gelap"}
                            className="flex size-7 items-center justify-center rounded-control text-muted-foreground transition-colors duration-[180ms] ease-out hover:bg-sidebar-accent hover:text-foreground active:bg-tile [&_svg]:size-4"
                        >
                            {isDark ? <Sun /> : <Moon />}
                        </button>
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            aria-label="Tutup panel samping"
                            className="hidden size-7 items-center justify-center rounded-control text-muted-foreground transition-colors duration-[180ms] ease-out hover:bg-sidebar-accent hover:text-foreground active:bg-tile md:flex [&_svg]:size-4"
                        >
                            <PanelLeftClose />
                        </button>
                    </div>
                </div>
            </SidebarHeader>

            {/* Navigation — groups separate by gap, no drawn rules */}
            <SidebarContent className="hm-scroll gap-0 overflow-x-hidden px-3 pt-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-3">
                {NAV_GROUPS.map((group) => (
                    <SidebarGroup key={group.label} className="px-0 pb-3 pt-0">
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-1.5">
                                {group.items.map((item) => (
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
                ))}

                {/* Ambient counts. Quiet metadata, not a card — the reference
                    has no equivalent, but this data earns its place here. */}
                {/* <div className="mt-auto space-y-1.5 border-t border-sidebar-border px-3 pb-1 pt-3 group-data-[collapsible=icon]:hidden">
                    {[
                        { label: "Jadwal", value: `${templateCount} entri` },
                        { label: "Dosen", value: `${dosenCount} orang` },
                        { label: "Minggu aktif", value: `Minggu ${activeWeek}` },
                    ].map((row) => (
                        <div
                            key={row.label}
                            className="flex items-center justify-between gap-2 text-xs"
                        >
                            <span className="truncate text-muted-foreground">
                                {row.label}
                            </span>
                            <span
                                data-numeric
                                className="shrink-0 font-medium text-foreground"
                            >
                                {row.value}
                            </span>
                        </div>
                    ))}
                </div> */}
            </SidebarContent>

            {/* The rail navigates. It carries no action button of its own —
                page actions live in <PageHeader>, and the one global action
                (Export Excel) sits in the account menu. */}
            <SidebarFooter className="gap-0 px-3 pb-3 group-data-[collapsible=icon]:px-2">
                <div className="border-t border-sidebar-border pt-3">
                    <p className="hm-eyebrow mb-1.5 px-1 group-data-[collapsible=icon]:hidden">
                        Akun
                    </p>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                title={userName}
                                className="flex w-full items-center gap-2.5 overflow-hidden rounded-control p-1.5 text-left transition-colors duration-[180ms] ease-out hover:bg-sidebar-accent active:bg-tile group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                            >
                                <span
                                    aria-hidden
                                    className="flex size-8 shrink-0 items-center justify-center rounded-full border border-rule bg-tile text-xs font-semibold uppercase text-tile-ink"
                                >
                                    {initial}
                                </span>
                                <span className="min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                                    <span className="block truncate text-sm font-semibold">
                                        {userName}
                                    </span>
                                    {userEmail ? (
                                        <span className="block truncate text-xs font-normal text-muted-foreground">
                                            {userEmail}
                                        </span>
                                    ) : null}
                                </span>
                                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                            side="top"
                            align="start"
                            className="min-w-60"
                        >
                            <DropdownMenuLabel className="font-normal">
                                <span className="block truncate text-sm font-semibold">
                                    {userName}
                                </span>
                                {userEmail ? (
                                    <span className="block truncate text-xs font-normal text-muted-foreground">
                                        {userEmail}
                                    </span>
                                ) : null}
                            </DropdownMenuLabel>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onSelect={onExportAll}>
                                <Download />
                                Export Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => router.push("/settings")}>
                                <Settings />
                                Pengaturan
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={onClearAll}
                            >
                                <Trash2 />
                                Reset data
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleSignOut}>
                                <LogOut />
                                Keluar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
