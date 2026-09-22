"use client";

import React, { useState } from "react";
import { Plus, Trash2, Edit2, Lock, Globe, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomSidebar, CustomSidebarItem } from "@/hooks/useCustomSidebar";
import { CUSTOM_ICON_OPTIONS, renderCustomIcon } from "@/components/CustomIconRenderer";
import { useDialog } from "@/context/DialogContext";

interface CustomSidebarManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomSidebarManagerModal: React.FC<CustomSidebarManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { items, addItem, updateItem, deleteItem } = useCustomSidebar();
  const { showAlert, showConfirm } = useDialog();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    href: string;
    icon: string;
    order: number;
    isPrivate: boolean;
  }>({
    title: "",
    href: "",
    icon: "Link",
    order: items.length + 1,
    isPrivate: false,
  });

  const resetForm = () => {
    setForm({
      title: "",
      href: "",
      icon: "Link",
      order: items.length + 1,
      isPrivate: false,
    });
    setEditingId(null);
    setIsCreating(false);
  };

  const startCreate = () => {
    setForm({
      title: "",
      href: "",
      icon: "Link",
      order: items.length + 1,
      isPrivate: false,
    });
    setEditingId(null);
    setIsCreating(true);
  };

  const startEdit = (item: CustomSidebarItem) => {
    setForm({
      title: item.title,
      href: item.href,
      icon: item.icon,
      order: item.order,
      isPrivate: item.isPrivate,
    });
    setEditingId(item.id);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.href.trim()) {
      showAlert("Validasi Gagal", "Judul dan URL / Link wajib diisi.");
      return;
    }

    try {
      if (editingId) {
        await updateItem(editingId, form);
      } else {
        await addItem(form);
      }
      resetForm();
    } catch (err: any) {
      showAlert("Gagal", err.message);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await showConfirm("Hapus Menu", "Apakah Anda yakin ingin menghapus menu kustom ini?");
    if (!confirm) return;

    try {
      await deleteItem(id);
      if (editingId === id) resetForm();
    } catch (err: any) {
      showAlert("Gagal", err.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Kelola Menu Sidebar Kustom</DialogTitle>
          <DialogDescription>
            Tambahkan menu kustom ke sidebar. Pilihan privasi menentukan apakah menu hanya terlihat untuk akun Anda atau publik.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Form for Create / Edit */}
          {(isCreating || editingId) ? (
            <div className="rounded-lg border border-rule p-4 bg-muted/20 space-y-3">
              <h4 className="font-semibold text-sm">
                {editingId ? "Edit Menu" : "Tambah Menu Baru"}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground">Judul Menu</label>
                  <Input
                    placeholder="misal: SIM Polije"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground">URL / Href (Internal / Eksternal)</label>
                  <Input
                    placeholder="https://... atau /dashboard"
                    value={form.href}
                    onChange={(e) => setForm({ ...form, href: e.target.value })}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground">Urutan</label>
                  <Input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground">Status Akses / Privasi</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isPrivate: !form.isPrivate })}
                    className={`mt-1 flex w-full items-center justify-between rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                      form.isPrivate
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {form.isPrivate ? <Lock className="size-3.5" /> : <Globe className="size-3.5" />}
                      {form.isPrivate ? "Privat (Akun ini saja)" : "Publik (Berbagi)"}
                    </span>
                    <span className="text-[10px] underline">Ubah</span>
                  </button>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Pilih Ikon</label>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                    {CUSTOM_ICON_OPTIONS.map((opt) => {
                      const selected = form.icon.toLowerCase() === opt.name.toLowerCase();
                      return (
                        <button
                          key={opt.name}
                          type="button"
                          title={opt.label}
                          onClick={() => setForm({ ...form, icon: opt.name })}
                          className={`flex items-center justify-center p-2 rounded-md border transition-all ${
                            selected
                              ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                              : "border-rule hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <opt.Icon className="size-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="size-4 mr-1" /> Batal
                </Button>
                <Button variant="default" size="sm" onClick={handleSave}>
                  <Check className="size-4 mr-1" /> Simpan
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-full" onClick={startCreate}>
              <Plus className="size-4 mr-1" /> Tambah Menu Baru
            </Button>
          )}

          {/* List of Custom Menu Items */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6 border border-dashed rounded-md">
                Belum ada menu kustom. Klik "Tambah Menu Baru" untuk membuat.
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-md border border-rule bg-panel hover:bg-muted/20 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="p-1.5 rounded-md bg-muted text-foreground shrink-0">
                      {renderCustomIcon(item.icon)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold truncate">{item.title}</span>
                        {item.isPrivate ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">
                            <Lock className="size-2.5" /> Privat
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-medium">
                            <Globe className="size-2.5" /> Publik
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{item.href}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground px-1.5 font-mono">#{item.order}</span>
                    {item.isOwner && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEdit(item)}
                          title="Edit"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500 hover:text-red-600"
                          title="Hapus"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
