"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Trash2,
  Users,
  Award,
  PenTool,
  Check,
  RefreshCw,
} from "lucide-react";
import type { MasterDosen, WeekData, ScheduleEntry } from "@/types";
import SignaturePad from "@/components/SignaturePad";
import { useDialog } from "@/context/DialogContext";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  PageHeader,
  Panel,
  PanelHeader,
  PanelBody,
} from "@/components/shell";

interface DosenMasterPageProps {
  dosenList: MasterDosen[];
  onDosenListChange: (list: MasterDosen[]) => void;
  weeks?: WeekData[];
  scheduleTemplate?: ScheduleEntry[];
}

const DosenMasterPage: React.FC<DosenMasterPageProps> = ({
  dosenList,
  onDosenListChange,
  weeks = [],
  scheduleTemplate = [],
}) => {
  const { showAlert, showConfirm } = useDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  // Track lecturer currently being edited
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleImportFromWeekly = async () => {
    const uniqueNames = new Set<string>();

    // Extract from weekly entries
    weeks.forEach((w) => {
      w.entries?.forEach((entry) => {
        if (entry.pengajar && entry.pengajar.trim()) {
          uniqueNames.add(entry.pengajar.trim());
        }
      });
    });

    // Extract from schedule templates (defaultPengajar)
    scheduleTemplate.forEach((entry) => {
      if (entry.defaultPengajar && entry.defaultPengajar.trim()) {
        uniqueNames.add(entry.defaultPengajar.trim());
      }
    });

    const newNames = Array.from(uniqueNames).filter(
      (name) => !dosenList.some((d) => d.name.toLowerCase() === name.toLowerCase())
    );

    if (newNames.length === 0) {
      showAlert(
        "Sinkronisasi Selesai",
        "Semua nama pengajar/dosen dari data jadwal sudah terdaftar di master data."
      );
      return;
    }

    const isConfirmed = await showConfirm(
      "Sinkronisasi Dosen",
      `Ditemukan ${newNames.length} nama pengajar baru dari data jadwal:\n\n${newNames.join(
        "\n"
      )}\n\nTambahkan mereka ke master data dosen?`
    );

    if (isConfirmed) {
      const updatedList = [
        ...dosenList,
        ...newNames.map((name) => ({
          name,
          signature: "",
        })),
      ];
      onDosenListChange(updatedList);
      showAlert("Sinkronisasi Berhasil", `Berhasil menambahkan ${newNames.length} dosen baru.`);
    }
  };

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
    <PageShell>
      <PageHeader
        title="Master Dosen"
        meta={`${dosenList.length} dosen terdaftar — nama dan tanda tangan untuk dokumen BAP`}
        actions={
          <Button variant="default" onClick={handleImportFromWeekly}>
            <RefreshCw /> Ambil dari jadwal
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left panel: add / edit form */}
        <Panel className="flex flex-col">
          <PanelHeader
            icon={<PenTool />}
            title={editingId ? "Edit dosen & tanda tangan" : "Tambah dosen baru"}
            meta={
              editingId
                ? "Perbarui nama atau gambar tanda tangan dosen terpilih."
                : "Masukkan nama dosen dan gambar tanda tangannya."
            }
          />

          <PanelBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Dosen beserta Gelar (misal: Ir. Budi Santoso, M.T.)"
                className="w-full border border-input rounded-control px-3 py-2 text-sm bg-background"
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditingId(null);
                    setName("");
                    setSignature(null);
                  }}
                >
                  Batal
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={handleSaveDosen}
                disabled={!name.trim()}
              >
                <Check />
                {editingId ? "Simpan perubahan" : "Simpan dosen"}
              </Button>
            </div>
          </PanelBody>
        </Panel>

        {/* Right panel: directory list */}
        <Panel className="flex h-full flex-col">
          <PanelHeader
            icon={<Users />}
            title="Direktori dosen"
            meta={`${dosenList.length} dosen terdaftar`}
          />

          <div className="border-b border-rule p-3">
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
                className="w-full border rounded-md pl-8 pr-3 py-1.5 text-sm bg-background"
              />
            </div>
          </div>

          <div className="hm-scroll max-h-[500px] flex-1 overflow-y-auto">
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
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleEdit(d)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDelete(d)}
                            aria-label={`Hapus ${d.name}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
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
        </Panel>
      </div>
    </PageShell>
  );
};

export default DosenMasterPage;
