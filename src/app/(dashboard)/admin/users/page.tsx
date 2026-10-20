"use client";

/* Hallmark · genre: modern-minimal · macrostructure: Workbench
 * design-system: design.md · Superadmin User Management
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  KeyRound,
  Shield,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle,
  Calendar,
  Layers,
  MoreVertical,
  X,
  Eye,
  EyeOff,
  UserPlus,
} from "lucide-react";
import {
  PageShell,
  PageHeader,
  PageSections,
  Panel,
  PanelHeader,
  PanelBody,
  StatTile,
  EmptyState,
} from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDialog } from "@/context/DialogContext";
import { authClient } from "@/lib/auth-client";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "teknisi";
  banned?: boolean | null;
  banReason?: string | null;
  createdAt: string;
  updatedAt: string;
  templateCount?: number;
  weeklyCount?: number;
}

export default function AdminUsersPage() {
  const { showAlert, showConfirm } = useDialog();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "teknisi" | "superadmin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned">("all");

  // Create User Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [createRole, setCreateRole] = useState<"teknisi" | "superadmin">("teknisi");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reset Password Modal State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Change Role Modal State
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [roleTargetUser, setRoleTargetUser] = useState<AdminUser | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<"teknisi" | "superadmin">("teknisi");
  const [roleLoading, setRoleLoading] = useState(false);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error("Gagal memuat data pengguna.");
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error(err);
      showAlert("Error", err.message || "Terjadi kesalahan saat memuat daftar teknisi.");
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const isUserBanned = Boolean(u.banned);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "banned" && isUserBanned) ||
        (statusFilter === "active" && !isUserBanned);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Metrics
  const stats = useMemo(() => {
    const total = users.length;
    const teknisi = users.filter((u) => u.role === "teknisi").length;
    const superadmin = users.filter((u) => u.role === "superadmin").length;
    const nonaktif = users.filter((u) => Boolean(u.banned)).length;
    return { total, teknisi, superadmin, nonaktif };
  }, [users]);

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createName.trim()) {
      setCreateError("Nama lengkap wajib diisi.");
      return;
    }
    if (!createEmail.trim()) {
      setCreateError("Email wajib diisi.");
      return;
    }
    if (createPassword.length < 6) {
      setCreateError("Password minimal 6 karakter.");
      return;
    }
    if (createPassword !== createConfirmPassword) {
      setCreateError("Konfirmasi password tidak cocok.");
      return;
    }

    try {
      setCreateLoading(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          role: createRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat akun.");
      }

      setIsCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateConfirmPassword("");
      setCreateRole("teknisi");
      showAlert("Berhasil", `Akun ${createRole === "superadmin" ? "Superadmin" : "Teknisi"} berhasil dibuat.`);
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.message || "Terjadi kesalahan.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    setResetError(null);

    if (resetPassword.length < 6) {
      setResetError("Password baru minimal 6 karakter.");
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetError("Konfirmasi password tidak cocok.");
      return;
    }

    try {
      setResetLoading(true);
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset-password",
          userId: targetUser.id,
          newPassword: resetPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mereset password.");
      }

      setIsResetOpen(false);
      setResetPassword("");
      setResetConfirmPassword("");
      setTargetUser(null);
      showAlert("Berhasil", `Password untuk ${targetUser.email} berhasil diperbarui.`);
    } catch (err: any) {
      setResetError(err.message || "Terjadi kesalahan.");
    } finally {
      setResetLoading(false);
    }
  };

  // Handle Change Role Submit
  const handleChangeRoleSubmit = async () => {
    if (!roleTargetUser) return;
    try {
      setRoleLoading(true);
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-role",
          userId: roleTargetUser.id,
          role: newSelectedRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengubah role.");
      }

      setIsRoleOpen(false);
      setRoleTargetUser(null);
      showAlert("Berhasil", "Role pengguna berhasil diperbarui.");
      fetchUsers();
    } catch (err: any) {
      showAlert("Gagal", err.message || "Terjadi kesalahan.");
    } finally {
      setRoleLoading(false);
    }
  };

  // Handle Toggle Ban/Active
  const handleToggleStatus = async (user: AdminUser) => {
    const isCurrentlyBanned = Boolean(user.banned);
    const actionText = isCurrentlyBanned ? "mengaktifkan kembali" : "menonaktifkan";
    const confirmed = await showConfirm(
      `${isCurrentlyBanned ? "Aktifkan" : "Nonaktifkan"} Akun`,
      `Apakah Anda yakin ingin ${actionText} akun ${user.name} (${user.email})?`
    );

    if (!confirmed) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-status",
          userId: user.id,
          banned: !isCurrentlyBanned,
          banReason: isCurrentlyBanned ? null : "Dinonaktifkan oleh Super Admin",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengubah status akun.");
      }

      showAlert("Sukses", data.message);
      fetchUsers();
    } catch (err: any) {
      showAlert("Error", err.message || "Gagal mengubah status akun.");
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: AdminUser) => {
    if (user.id === currentUserId) {
      showAlert("Akses Ditolak", "Anda tidak dapat menghapus akun Anda sendiri.");
      return;
    }

    const confirmed = await showConfirm(
      "Hapus Akun Pengguna",
      `TINDAKAN INI TIDAK BISA DIBATALKAN.\n\nApakah Anda yakin ingin menghapus akun ${user.name} (${user.email}) beserta seluruh data jadwal dan BAP terkait?`
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/users?userId=${user.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus user.");
      }

      showAlert("Sukses", "Akun pengguna berhasil dihapus.");
      fetchUsers();
    } catch (err: any) {
      showAlert("Error", err.message || "Gagal menghapus user.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Kelola Teknisi"
        meta={`${stats.teknisi} Teknisi Lab · ${stats.superadmin} Superadmin terdaftar`}
        actions={
          <Button
            type="button"
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="h-9 gap-1.5 rounded-control bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95"
          >
            <UserPlus className="size-4" />
            <span>Tambah Teknisi</span>
          </Button>
        }
      />

      <PageSections>
        {/* Metric Summary Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatTile
            label="Total Pengguna"
            value={stats.total}
            meta="Akun terdaftar"
            icon={<Users className="size-4" />}
          />
          <StatTile
            label="Teknisi Lab"
            value={stats.teknisi}
            meta="Operator aktif"
            icon={<Layers className="size-4" />}
          />
          <StatTile
            label="Superadmin"
            value={stats.superadmin}
            meta="Akses penuh"
            icon={<ShieldCheck className="size-4" />}
          />
          <StatTile
            label="Nonaktif"
            value={stats.nonaktif}
            meta="Akun dibekukan"
            icon={<Ban className="size-4" />}
          />
        </div>

        {/* Main User List Panel */}
        <Panel>
          <PanelHeader
            title="Daftar Akun Teknisi & Pengguna"
            meta="Kelola peran, kredensial, dan status operasional akun laboratorium"
            action={
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative min-w-[200px] sm:min-w-[240px]">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Cari nama atau email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8.5 pl-8 text-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* Filter Role */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="h-8.5 rounded-control border border-rule bg-panel px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">Semua Peran</option>
                  <option value="teknisi">Hanya Teknisi</option>
                  <option value="superadmin">Hanya Superadmin</option>
                </select>

                {/* Filter Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="h-8.5 rounded-control border border-rule bg-panel px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="banned">Dinonaktifkan</option>
                </select>
              </div>
            }
          />

          <PanelBody className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="size-7 animate-spin text-primary" />
                <p className="mt-3 text-xs font-medium">Memuat data pengguna...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  variant="bare"
                  size="compact"
                  icon={<Users className="size-6" />}
                  title="Tidak ada pengguna yang cocok"
                  description={
                    searchQuery
                      ? `Tidak ditemukan akun dengan kata kunci "${searchQuery}".`
                      : "Belum ada akun teknisi yang terdaftar."
                  }
                  actions={
                    searchQuery ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("");
                          setRoleFilter("all");
                          setStatusFilter("all");
                        }}
                      >
                        Reset Filter
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-rule bg-panel-2/60 text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                    <tr>
                      <th className="px-5 py-3">Pengguna</th>
                      <th className="px-4 py-3">Peran (Role)</th>
                      <th className="px-4 py-3">Data Dikelola</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Terdaftar</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule font-normal">
                    {filteredUsers.map((u) => {
                      const isSelf = u.id === currentUserId;
                      const isBanned = Boolean(u.banned);
                      const initial = u.name.charAt(0).toUpperCase();

                      return (
                        <tr
                          key={u.id}
                          className="transition-colors hover:bg-panel-2/40"
                        >
                          {/* Nama & Email */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tile text-tile-ink font-semibold border border-rule text-xs">
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate font-semibold text-foreground text-sm">
                                    {u.name}
                                  </span>
                                  {isSelf && (
                                    <span className="rounded bg-brand-soft px-1.5 py-0.2 text-[10px] font-medium text-brand">
                                      Anda
                                    </span>
                                  )}
                                </div>
                                <span className="block truncate text-xs text-muted-foreground font-mono">
                                  {u.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                u.role === "superadmin"
                                  ? "bg-brand-soft text-brand border border-brand/20 font-semibold"
                                  : "bg-tile text-foreground border border-rule"
                              }`}
                            >
                              {u.role === "superadmin" ? (
                                <>
                                  <ShieldCheck className="size-3 text-brand" />
                                  Superadmin
                                </>
                              ) : (
                                "Teknisi Lab"
                              )}
                            </span>
                          </td>

                          {/* Data counts */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="size-3 text-muted-foreground" />
                                <span>{u.templateCount ?? 0} Jadwal Template</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Layers className="size-3 text-muted-foreground" />
                                <span>{u.weeklyCount ?? 0} BAP Terisi</span>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                                isBanned
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/50"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  isBanned ? "bg-rose-500" : "bg-emerald-500"
                                }`}
                              />
                              {isBanned ? "Dinonaktifkan" : "Aktif"}
                            </span>
                          </td>

                          {/* Date Created */}
                          <td className="px-4 py-3.5 text-muted-foreground font-mono text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-control hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
                                  aria-label="Menu Aksi"
                                >
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setTargetUser(u);
                                    setResetError(null);
                                    setResetPassword("");
                                    setResetConfirmPassword("");
                                    setIsResetOpen(true);
                                  }}
                                >
                                  <KeyRound className="size-4" />
                                  Reset Password
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onSelect={() => {
                                    setRoleTargetUser(u);
                                    setNewSelectedRole(u.role);
                                    setIsRoleOpen(true);
                                  }}
                                  disabled={isSelf}
                                >
                                  <Shield className="size-4" />
                                  Ubah Role
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onSelect={() => handleToggleStatus(u)}
                                  disabled={isSelf}
                                  className={isBanned ? "text-emerald-600" : "text-amber-600"}
                                >
                                  {isBanned ? (
                                    <>
                                      <CheckCircle2 className="size-4" />
                                      Aktifkan Akun
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="size-4" />
                                      Nonaktifkan Akun
                                    </>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => handleDeleteUser(u)}
                                  disabled={isSelf}
                                >
                                  <Trash2 className="size-4" />
                                  Hapus Akun
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PanelBody>
        </Panel>
      </PageSections>

      {/* Modal: Tambah Teknisi Baru */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Akun Teknisi Baru</DialogTitle>
            <DialogDescription>
              Buatkan akun baru untuk teknisi lab atau administrator.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit}>
            <DialogBody className="space-y-4">
              {createError && (
                <div className="flex items-center gap-2 rounded-control border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Nama Lengkap Teknisi <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Ahmad Fauzi (Lab RPL)"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Alamat Email <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="teknisi.lab@gmail.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Password Awal <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showCreatePassword ? "text" : "password"}
                      placeholder="Min. 6 karakter"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCreatePassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Konfirmasi Password <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type={showCreatePassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={createConfirmPassword}
                    onChange={(e) => setCreateConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Peran (Role)
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as any)}
                  className="w-full h-9 rounded-control border border-rule bg-panel px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="teknisi">Teknisi Lab (Akses Reguler BAP)</option>
                  <option value="superadmin">Superadmin (Akses Pengelola Penuh)</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Teknisi hanya mengelola jadwal dan BAP lab mereka sendiri.
                </p>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={createLoading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createLoading}
                className="bg-primary text-primary-foreground min-w-[90px]"
              >
                {createLoading ? <Loader2 className="size-3.5 animate-spin" /> : "Simpan Akun"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Reset Password */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password Pengguna</DialogTitle>
            <DialogDescription>
              Atur ulang kata sandi baru untuk akun {targetUser?.name} ({targetUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPasswordSubmit}>
            <DialogBody className="space-y-4">
              {resetError && (
                <div className="flex items-center gap-2 rounded-control border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Password Baru <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showResetPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showResetPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Konfirmasi Password Baru <span className="text-destructive">*</span>
                </label>
                <Input
                  type={showResetPassword ? "text" : "password"}
                  placeholder="Ulangi password baru"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsResetOpen(false)}
                disabled={resetLoading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={resetLoading}
                className="bg-primary text-primary-foreground min-w-[90px]"
              >
                {resetLoading ? <Loader2 className="size-3.5 animate-spin" /> : "Perbarui Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Ubah Role */}
      <Dialog open={isRoleOpen} onOpenChange={setIsRoleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Peran (Role)</DialogTitle>
            <DialogDescription>
              Tentukan hak akses untuk {roleTargetUser?.name}.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Pilih Peran
              </label>
              <select
                value={newSelectedRole}
                onChange={(e) => setNewSelectedRole(e.target.value as any)}
                className="w-full h-9 rounded-control border border-rule bg-panel px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="teknisi">Teknisi Lab (Akses Reguler BAP)</option>
                <option value="superadmin">Superadmin (Akses Pengelola Penuh)</option>
              </select>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRoleOpen(false)}
              disabled={roleLoading}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleChangeRoleSubmit}
              disabled={roleLoading}
              className="bg-primary text-primary-foreground"
            >
              {roleLoading ? <Loader2 className="size-3.5 animate-spin" /> : "Terapkan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
