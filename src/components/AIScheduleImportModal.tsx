"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  ArrowLeft,
  Check,
  AlertCircle,
  FileText,
} from "lucide-react";
import type { ScheduleEntry } from "@/types";
import { generateId } from "@/utils/storage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";

const DAY_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

interface AIScheduleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (entries: ScheduleEntry[], appendMode: boolean) => void;
  existingCount: number;
}

export const AIScheduleImportModal: React.FC<AIScheduleImportModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  existingCount,
}) => {
  const [step, setStep] = useState<"input" | "review">("input");
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedEntries, setExtractedEntries] = useState<ScheduleEntry[]>([]);
  const [appendMode, setAppendMode] = useState(false);

  const handleReset = () => {
    setStep("input");
    setRawText("");
    setError(null);
    setExtractedEntries([]);
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleParse = async () => {
    if (!rawText.trim()) {
      setError("Silakan tempel (paste) teks jadwal terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/parse-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengekstrak data dari AI.");
      }

      if (!Array.isArray(json.data) || json.data.length === 0) {
        throw new Error("AI tidak menemukan format jadwal dalam teks tersebut. Coba perjelas teksnya.");
      }

      const formatted: ScheduleEntry[] = json.data.map((item: any, idx: number) => ({
        id: generateId(),
        no: idx + 1,
        mataKuliah: item.mataKuliah || "",
        hari: item.hari || "Senin",
        jam: item.jam || "",
        tempat: item.tempat || "",
        prodi: item.prodi || "",
        semester: item.semester || "",
        golongan: item.golongan || "",
        defaultPengajar: item.defaultPengajar || "",
        defaultTeknisi: item.defaultTeknisi || "",
      }));

      setExtractedEntries(formatted);
      setStep("review");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat memproses data AI.");
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (index: number, field: keyof ScheduleEntry, value: string) => {
    const updated = [...extractedEntries];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedEntries(updated);
  };

  const removeEntry = (index: number) => {
    const updated = extractedEntries
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, no: i + 1 }));
    setExtractedEntries(updated);
  };

  const addNewEntry = () => {
    const newEntry: ScheduleEntry = {
      id: generateId(),
      no: extractedEntries.length + 1,
      mataKuliah: "",
      hari: "Senin",
      jam: "",
      tempat: "",
      prodi: "",
      semester: "",
      golongan: "",
      defaultPengajar: "",
      defaultTeknisi: "",
    };
    setExtractedEntries([...extractedEntries, newEntry]);
  };

  const handleSave = () => {
    if (extractedEntries.length === 0) {
      setError("Tidak ada data jadwal untuk disimpan.");
      return;
    }
    onConfirm(extractedEntries, appendMode);
    handleClose();
  };

  const fillExample = () => {
    const sample = `JADWAL PRAKTIKUM SEMESTER GENAP
1. Pemrograman Web Lanjut | Senin 07.00 - 09.30 | Lab RPL | TIF Smt 4 Gol A | Dosen: Bintang Pamungkas, S.Kom | Teknisi: Agus
2. Kecerdasan Buatan | Senin 09.30 - 12.00 | Lab AI | TIF Smt 6 Gol B | Dosen: Dr. Hendra, M.Kom | Teknisi: Agus
3. Jaringan Komputer | Selasa 13.00 - 15.30 | Lab Jaringan | MIF Smt 2 Gol A | Dosen: Siti Aminah, M.T | Teknisi: Budi`;
    setRawText(sample);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={step === "review" ? "max-w-4xl" : "max-w-xl"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5 text-amber-500" />
            <span>Smart Import Jadwal AI</span>
          </DialogTitle>
          <DialogDescription>
            {step === "input"
              ? "Tempel teks jadwal tidak terstruktur (dari WhatsApp, Word, Catatan, atau Website), lalu biarkan AI mengubahnya menjadi data tabel terstruktur."
              : "Review hasil ekstraksi AI. Anda dapat mengubah, menambah, atau menghapus baris sebelum menyimpannya ke database."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-control border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === "input" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Tempel teks jadwal di bawah:</span>
                <button
                  type="button"
                  onClick={fillExample}
                  className="text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <FileText className="size-3" />
                  Isi contoh teks
                </button>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Contoh:&#10;Senin jam 07:00-09:30 Pemrograman Web Lab AI TIF 4 A Dosen: Bintang&#10;Selasa 10.00 - 12.00 Basis Data Lab RPL TIF 2 B..."
                rows={8}
                className="w-full rounded-control border border-rule bg-background p-3 text-sm font-mono focus-visible:outline-2 focus-visible:outline-ring"
              />

              <div className="rounded-control bg-panel-2 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">💡 Tips:</p>
                <p>• Format teks bebas — AI akan mengenali Mata Kuliah, Hari, Jam, Ruangan, Prodi, Semester, Golongan, Dosen, dan Teknisi secara otomatis.</p>
                <p>• Data yang diekstrak akan ditampilkan dalam tabel preview terlebih dahulu agar Anda dapat mereview dan mengedit jika ada kesalahan.</p>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Ditemukan {extractedEntries.length} entri jadwal
                </span>
                <Button size="sm" variant="outline" onClick={addNewEntry}>
                  <Plus className="size-3.5" /> Tambah Baris
                </Button>
              </div>

              <div className="hm-scrollbar max-h-[340px] overflow-auto rounded-control border border-rule bg-background">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 text-muted-foreground sticky top-0 border-b border-rule">
                    <tr>
                      <th className="px-2 py-2 w-8 text-center">No</th>
                      <th className="px-2 py-2 min-w-[140px] text-left">Mata Kuliah</th>
                      <th className="px-2 py-2 w-24 text-left">Hari</th>
                      <th className="px-2 py-2 w-28 text-left">Jam</th>
                      <th className="px-2 py-2 w-20 text-left">Tempat</th>
                      <th className="px-2 py-2 w-16 text-left">Prodi</th>
                      <th className="px-2 py-2 w-14 text-left">Smt</th>
                      <th className="px-2 py-2 w-14 text-left">Gol</th>
                      <th className="px-2 py-2 min-w-[120px] text-left">Pengajar</th>
                      <th className="px-2 py-2 min-w-[100px] text-left">Teknisi</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedEntries.map((entry, idx) => (
                      <tr key={entry.id} className="border-b border-rule/50 hover:bg-muted/20">
                        <td className="px-2 py-1.5 text-center text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={entry.mataKuliah}
                            onChange={(e) => updateEntry(idx, "mataKuliah", e.target.value)}
                            placeholder="Mata Kuliah"
                            className="w-full rounded border border-rule/60 bg-background px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <select
                            value={entry.hari}
                            onChange={(e) => updateEntry(idx, "hari", e.target.value)}
                            className="w-full rounded border border-rule/60 bg-background px-1 py-1 text-xs"
                          >
                            {DAY_ORDER.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={entry.jam}
                            onChange={(e) => updateEntry(idx, "jam", e.target.value)}
                            placeholder="07.00 - 09.00"
                            className="w-full rounded border border-rule/60 bg-background px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={entry.tempat}
                            onChange={(e) => updateEntry(idx, "tempat", e.target.value)}
                            placeholder="Lab AI"
                            className="w-full rounded border border-rule/60 bg-background px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={entry.prodi}
                            onChange={(e) => updateEntry(idx, "prodi", e.target.value)}
                            placeholder="TIF"
                            className="w-full rounded border border-rule/60 bg-background px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={entry.semester}
                            onChange={(e) => updateEntry(idx, "semester", e.target.value)}
                            placeholder="4"
                            className="w-full rounded border border-rule/60 bg-background px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={entry.golongan}
                            onChange={(e) => updateEntry(idx, "golongan", e.target.value)}
                            placeholder="A"
                            className="w-full rounded border border-rule/60 bg-background px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={entry.defaultPengajar}
                            onChange={(e) => updateEntry(idx, "defaultPengajar", e.target.value)}
                            placeholder="Dosen"
                            className="w-full rounded border border-rule/60 bg-background px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={entry.defaultTeknisi}
                            onChange={(e) => updateEntry(idx, "defaultTeknisi", e.target.value)}
                            placeholder="Teknisi"
                            className="w-full rounded border border-rule/60 bg-background px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeEntry(idx)}
                            className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10"
                            title="Hapus baris"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {existingCount > 0 && (
                <div className="flex items-center gap-3 pt-2 text-xs">
                  <span className="text-muted-foreground">Mode Simpan:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="saveMode"
                      checked={!appendMode}
                      onChange={() => setAppendMode(false)}
                      className="accent-primary"
                    />
                    <span>Ganti Seluruh Jadwal ({existingCount} entri lama akan diganti)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="saveMode"
                      checked={appendMode}
                      onChange={() => setAppendMode(true)}
                      className="accent-primary"
                    />
                    <span>Tambahkan ke Jadwal yang Ada</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter className="justify-between sm:justify-between">
          {step === "input" ? (
            <>
              <Button variant="ghost" onClick={handleClose} disabled={loading}>
                Batal
              </Button>
              <Button onClick={handleParse} disabled={loading || !rawText.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Menganalisis dengan AI…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    <span>Ekstrak Jadwal</span>
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("input")}>
                <ArrowLeft className="size-4" /> Edit Teks Kembali
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleClose}>
                  Batal
                </Button>
                <Button onClick={handleSave} disabled={extractedEntries.length === 0}>
                  <Check className="size-4" />
                  <span>Simpan ke Database ({extractedEntries.length})</span>
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
