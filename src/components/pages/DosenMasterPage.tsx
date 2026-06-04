"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Trash2,
  Users,
  Award,
  PenTool,
  Check,
} from "lucide-react";
import type { MasterDosen } from "@/types";
import SignaturePad from "@/components/SignaturePad";
import { useDialog } from "@/context/DialogContext";

interface DosenMasterPageProps {
  dosenList: MasterDosen[];
  onDosenListChange: (list: MasterDosen[]) => void;
}

const DosenMasterPage: React.FC<DosenMasterPageProps> = ({
  dosenList,
  onDosenListChange,
}) => {
  const { showAlert, showConfirm } = useDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  // Track lecturer currently being edited
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSaveDosen = () => {
    if (!name.trim()) return;

    if (editingId) {
      // Update existing lecturer
      const updated = dosenList.map((d) =>
        d.id === editingId || (!d.id && d.name === name.trim()) // fallback if id is missing
          ? { ...d, name: name.trim(), signature: signature || "" }
          : d
      );
      onDosenListChange(updated);
      setEditingId(null);
      setName("");
      setSignature(null);
    } else {
      // Add new lecturer
      if (dosenList.some((d) => d.name.toLowerCase() === name.trim().toLowerCase())) {
        showAlert("Dosen Sudah Terdaftar", "Nama dosen tersebut sudah ada di daftar master data.");
        return;
      }

      onDosenListChange([
        ...dosenList,
        {
          name: name.trim(),
          signature: signature || "",
        },
      ]);
      setName("");
      setSignature(null);
    }
  };

  const handleEdit = (dosen: MasterDosen) => {
    setEditingId(dosen.id || dosen.name); // use name as fallback if no id exists
    setName(dosen.name);
    setSignature(dosen.signature || null);
  };

  const handleDelete = async (dosen: MasterDosen) => {
    const isConfirmed = await showConfirm('Hapus Dosen', `Apakah Anda yakin ingin menghapus dosen "${dosen.name}" dari master data?`);
    if (!isConfirmed) return;
    onDosenListChange(
      dosenList.filter((d) => d.name !== dosen.name)
    );
    if (editingId === (dosen.id || dosen.name)) {
      setEditingId(null);
      setName("");
      setSignature(null);
    }
  };

  const filteredDosen = useMemo(() => {
    if (!searchQuery.trim()) return dosenList;
    const q = searchQuery.toLowerCase();
    return dosenList.filter((d) => d.name.toLowerCase().includes(q));
  }, [dosenList, searchQuery]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Award className="text-primary" size={24} />
          Master Data Dosen
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola direktori nama dosen beserta tanda tangan digital untuk penandatanganan dokumen BAP.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Add / Edit Form */}
        <div className="bg-card rounded-xl border shadow-sm flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <PenTool size={16} className="text-primary" />
              {editingId ? "Edit Dosen & Tanda Tangan" : "Tambah Dosen Baru"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {editingId
                ? "Perbarui nama atau gambar tanda tangan dosen terpilih."
                : "Masukkan nama dosen dan gambar tanda tangannya."}
            </p>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Dosen beserta Gelar (misal: Ir. Budi Santoso, M.T.)"
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Tanda Tangan Digital
              </label>
              <div className="border rounded-lg overflow-hidden bg-background">
                <SignaturePad
                  label="Tanda Tangan"
                  value={signature}
                  onChange={setSignature}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setName("");
                    setSignature(null);
                  }}
                  className="flex-1 border px-4 py-2 rounded-lg font-medium text-sm hover:bg-muted transition-colors"
                >
                  Batal
                </button>
              )}
              <button
                onClick={handleSaveDosen}
                disabled={!name.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Check size={16} />
                {editingId ? "Simpan Perubahan" : "Simpan Dosen"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Card: Directory List */}
        <div className="bg-card rounded-xl border shadow-sm flex flex-col h-full">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Users size={16} className="text-primary" />
                Direktori Dosen
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {dosenList.length} dosen terdaftar
              </p>
            </div>
          </div>

          <div className="p-3 border-b">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Dosen..."
                className="w-full border rounded-md pl-8 pr-3 py-1.5 text-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px]">
            {filteredDosen.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50 z-10">
                  <tr className="text-left text-muted-foreground font-medium border-b">
                    <th className="px-4 py-2 w-12 text-center">No</th>
                    <th className="px-3 py-2">Nama Dosen</th>
                    <th className="px-3 py-2 text-center w-28">Tanda Tangan</th>
                    <th className="px-3 py-2 w-20 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDosen.map((d, idx) => (
                    <tr
                      key={d.name}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground text-center">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3 font-medium text-foreground">
                        {d.name}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {d.signature ? (
                          <div className="inline-block border rounded bg-white p-1">
                            <img
                              src={d.signature}
                              alt={`Paraf ${d.name}`}
                              className="h-8 max-w-[90px] object-contain mx-auto"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Belum Ada
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(d)}
                            className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            className="text-muted-foreground hover:text-red-600 p-1 rounded transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Users size={36} className="mb-2 opacity-40" />
                <p className="text-sm font-medium">
                  {searchQuery ? "Tidak ada hasil pencarian" : "Belum ada data dosen"}
                </p>
                <p className="text-xs mt-1">
                  {searchQuery ? "Coba kata kunci lain" : "Tambah dosen di panel sebelah kiri"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DosenMasterPage;
