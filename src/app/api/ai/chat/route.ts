import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getGeminiClient, generateContentWithFallback } from "@/lib/gemini";
import { isDeepSeekConfigured, chatWithDeepSeek } from "@/lib/deepseek";
import { db, scheduleTemplates, weeklyEntries, weeklyStudents, studentMaster, notes, examSchedules, examScheduleEntries, dosenList, assessmentForms, archives } from "@/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { Type, FunctionDeclaration } from "@google/genai";

// Definitions of tools available to AI (strictly scoped to current user session)
const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "getScheduleTemplates",
    description: "Mengambil daftar seluruh jadwal perkuliahan / template jadwal milik user saat ini (hari, jam, mata kuliah, prodi, semester, golongan, tempat, dosen default, teknisi default).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        hari: {
          type: Type.STRING,
          description: "Filter berdasarkan hari spesifik (contoh: 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat')",
        },
        mataKuliah: {
          type: Type.STRING,
          description: "Filter pencarian nama mata kuliah (opsional)",
        },
      },
    },
  },
  {
    name: "getWeeklyBapEntries",
    description: "Mengambil catatan Berita Acara Perkuliahan (BAP) per minggu (1 s/d 16), termasuk materi kuliah, tanggal, dosen pengajar, teknisi, serta rekap presensi kehadiran dan daftar mahasiswa yang hadir/tidak hadir (sakit, izin, alpa).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        weekNumber: {
          type: Type.INTEGER,
          description: "Nomor minggu (1 s/d 16). Jika dikosongkan, akan mengambil semua minggu.",
        },
        scheduleId: {
          type: Type.STRING,
          description: "ID jadwal spesifik (opsional)",
        },
      },
    },
  },
  {
    name: "getStudentAttendance",
    description: "Mengambil data detail presensi/kehadiran mahasiswa pada minggu tertentu atau jadwal tertentu (termasuk daftar nama mahasiswa yang hadir, sakit, izin, atau alpa).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        weekNumber: {
          type: Type.INTEGER,
          description: "Nomor minggu perkuliahan (1 s/d 16)",
        },
        scheduleId: {
          type: Type.STRING,
          description: "ID jadwal spesifik (opsional)",
        },
        onlyAbsent: {
          type: Type.BOOLEAN,
          description: "Jika true, hanya tampilkan mahasiswa yang tidak hadir (sakit, izin, alpa).",
        },
      },
    },
  },
  {
    name: "getStudentMaster",
    description: "Mengambil master data seluruh mahasiswa terdaftar (NIM, Nama, Prodi, Semester, Golongan).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        keyword: {
          type: Type.STRING,
          description: "Pencarian nama atau NIM mahasiswa (opsional)",
        },
        prodi: {
          type: Type.STRING,
          description: "Filter program studi (opsional, misal: 'TIF', 'MIF')",
        },
      },
    },
  },
  {
    name: "getNotes",
    description: "Mengambil catatan pribadi / sticky notes milik user.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        pinnedOnly: {
          type: Type.BOOLEAN,
          description: "Jika true, hanya mengambil catatan yang disematkan (pinned).",
        },
      },
    },
  },
  {
    name: "getExamSchedules",
    description: "Mengambil daftar jadwal ujian (UTS/UAS) beserta entri detail ujiannya (hari, tanggal, jam, ruangan, mata kuliah, pengawas).",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "getDosenList",
    description: "Mengambil daftar master dosen pengajar yang terdaftar pada akun user.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "getAssessmentForms",
    description: "Mengambil daftar form penilaian mahasiswa yang telah dibuat oleh user.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "getArchives",
    description: "Mengambil daftar seluruh arsip data / backup snapshot yang pernah disimpan oleh user beserta ringkasan isinya.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "getArchiveDetail",
    description: "Membuka dan membaca rincian lengkap isi data yang tersimpan di dalam suatu snapshot arsip tertentu (termasuk jadwal template, catatan materi BAP, notes, dosen, dan ujian yang diarsipkan).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        archiveId: {
          type: Type.STRING,
          description: "ID unik arsip (UUID)",
        },
        archiveName: {
          type: Type.STRING,
          description: "Nama arsip jika ID tidak diketahui (opsional)",
        },
      },
    },
  },
  {
    name: "createSchedule",
    description: "Menambahkan satu atau lebih entri jadwal perkuliahan ke dalam database jadwal template user saat ini. Panggil fungsi ini jika user meminta untuk menambahkan, menginputkan, atau memasukkan data jadwal baru dari teks percakapan.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        schedules: {
          type: Type.ARRAY,
          description: "Daftar jadwal perkuliahan yang akan diinputkan",
          items: {
            type: Type.OBJECT,
            properties: {
              mataKuliah: {
                type: Type.STRING,
                description: "Nama mata kuliah atau kegiatan praktikum",
              },
              hari: {
                type: Type.STRING,
                description: "Hari perkuliahan (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)",
              },
              jam: {
                type: Type.STRING,
                description: "Jam perkuliahan (contoh: '07.00 - 09.30')",
              },
              tempat: {
                type: Type.STRING,
                description: "Ruangan atau lab perkuliahan",
              },
              prodi: {
                type: Type.STRING,
                description: "Program studi (contoh: 'TIF', 'MIF', 'TKK')",
              },
              semester: {
                type: Type.STRING,
                description: "Semester (contoh: '2', '4', '6')",
              },
              golongan: {
                type: Type.STRING,
                description: "Golongan / Kelas (contoh: 'A', 'B', 'C')",
              },
              defaultPengajar: {
                type: Type.STRING,
                description: "Nama dosen pengajar",
              },
              defaultTeknisi: {
                type: Type.STRING,
                description: "Nama teknisi / laboran jika ada",
              },
            },
            required: ["mataKuliah", "hari", "jam"],
          },
        },
      },
      required: ["schedules"],
    },
  },
  {
    name: "reorderScheduleTemplates",
    description: "Mengurutkan nomor urutan (no) jadwal template di database secara permanen berdasarkan urutan hari (Senin sampai Minggu) dan jam perkuliahan.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        sortBy: {
          type: Type.STRING,
          description: "Kriteria pengurutan: 'hari_dan_jam' (default)",
        },
      },
    },
  },
];

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Pesan chat tidak boleh kosong." },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    // System instruction explaining role, concise response style, and boundaries
    const systemInstruction = `Anda adalah asisten AI cerdas untuk Sistem Informasi Manajemen BAP & Jadwal Laboratorium.
Pengguna saat ini: ${user.name || user.email || "Pengguna"}.

PEDOMAN GAYA MENJAWAB (PENTING):
1. RINGKAS & TO THE POINT UNTUK AKSI (MUTATION):
   - Jika pengguna meminta melakukan suatu aksi (seperti menambah jadwal 'createSchedule', mengurutkan jadwal 'reorderScheduleTemplates'), CUKUP berikan pesan konfirmasi singkat bahwa aksi telah berhasil dijalankan di database.
   - JANGAN menampilkan atau mencantumkan tabel daftar data yang panjang kecuali jika pengguna secara eksplisit memintanya (contoh: "tampilkan daftarnya", "apa saja jadwalnya").
2. HANYA TAMPILKAN DATA JIKA DIMINTA EKSPLISIT:
   - Tampilkan tabel atau rincian data hanya jika pengguna bertanya/meminta informasi (misal: "tampilkan jadwal hari Senin", "rekap BAP minggu 2", "apa saja arsip saya").
3. JUJUR DAN TO THE POINT TENTANG BATASAN (JIKA TIDAK ADA TOOL):
   - Jika pengguna meminta aksi yang TIDAK ADA tool/fungsinya di sistem (contoh: menghapus jadwal via chat, mengedit jadwal lama, menginput nilai form penilaian, atau mereset data), LANGSUNG jelaskan TO THE POINT dalam 1-2 kalimat bahwa aksi tersebut belum didukung via chat, dan arahkan ke menu halaman UI yang tepat.
   - JANGAN berpura-pura atau berhalusinasi seolah-olah aksi sudah selesai jika tidak ada tool yang dieksekusi.
4. ISOLASI DATA USER:
   - Anda hanya memiliki akses ke data milik pengguna saat ini. Data pengguna lain 100% tidak bisa diakses.
5. Gunakan Bahasa Indonesia yang baik, lugas, ramah, dan profesional.`;

    // Tool execution handler (strictly filtered by user.id)
    const executeFunction = async (name: string, args: any) => {
      try {
        switch (name) {
          case "getScheduleTemplates": {
            const list = await db.query.scheduleTemplates.findMany({
              where: eq(scheduleTemplates.userId, user.id),
              orderBy: (t, { asc }) => [asc(t.no)],
            });
            let filtered = list;
            if (args.hari) {
              filtered = filtered.filter(
                (item) =>
                  item.hari.toLowerCase() === args.hari.toLowerCase()
              );
            }
            if (args.mataKuliah) {
              filtered = filtered.filter((item) =>
                item.mataKuliah
                  .toLowerCase()
                  .includes(args.mataKuliah.toLowerCase())
              );
            }
            return {
              count: filtered.length,
              schedules: filtered.map((s) => ({
                id: s.scheduleId,
                no: s.no,
                mataKuliah: s.mataKuliah,
                hari: s.hari,
                jam: s.jam,
                tempat: s.tempat,
                prodi: s.prodi,
                semester: s.semester,
                golongan: s.golongan,
                pengajar: s.defaultPengajar,
                teknisi: s.defaultTeknisi,
              })),
            };
          }

          case "getWeeklyBapEntries": {
            let whereClause = eq(weeklyEntries.userId, user.id);
            if (args.weekNumber) {
              whereClause = and(
                eq(weeklyEntries.userId, user.id),
                eq(weeklyEntries.weekNumber, Number(args.weekNumber))
              )!;
            }
            if (args.scheduleId) {
              whereClause = and(
                whereClause,
                eq(weeklyEntries.scheduleId, args.scheduleId)
              )!;
            }
            const entries = await db.query.weeklyEntries.findMany({
              where: whereClause,
              orderBy: (w, { asc }) => [asc(w.weekNumber)],
            });

            // Fetch students for these entries
            const entryIds = entries.map((e) => e.id);
            const students = entryIds.length > 0
              ? await db.query.weeklyStudents.findMany({
                  where: inArray(weeklyStudents.weeklyEntryId, entryIds),
                  orderBy: (s, { asc }) => [asc(s.studentNo)],
                })
              : [];

            return {
              count: entries.length,
              entries: entries.map((e) => {
                const entryStudents = students.filter((s) => s.weeklyEntryId === e.id);
                const absent = entryStudents.filter(
                  (s) => s.remarks && s.remarks.toLowerCase() !== "hadir"
                );
                return {
                  weekNumber: e.weekNumber,
                  scheduleId: e.scheduleId,
                  materi: e.materi,
                  tanggal: e.tanggal,
                  pengajar: e.pengajar,
                  teknisi: e.teknisi,
                  totalMahasiswa: entryStudents.length,
                  jumlahHadir: entryStudents.length - absent.length,
                  jumlahTidakHadir: absent.length,
                  mahasiswaTidakHadir: absent.map((s) => ({
                    no: s.studentNo,
                    nim: s.nim,
                    name: s.name,
                    status: s.remarks,
                  })),
                };
              }),
            };
          }

          case "getStudentAttendance": {
            let whereClause = eq(weeklyEntries.userId, user.id);
            if (args.weekNumber) {
              whereClause = and(
                eq(weeklyEntries.userId, user.id),
                eq(weeklyEntries.weekNumber, Number(args.weekNumber))
              )!;
            }
            if (args.scheduleId) {
              whereClause = and(
                whereClause,
                eq(weeklyEntries.scheduleId, args.scheduleId)
              )!;
            }

            const entries = await db.query.weeklyEntries.findMany({
              where: whereClause,
              orderBy: (w, { asc }) => [asc(w.weekNumber)],
            });

            const entryIds = entries.map((e) => e.id);
            const allStudents = entryIds.length > 0
              ? await db.query.weeklyStudents.findMany({
                  where: inArray(weeklyStudents.weeklyEntryId, entryIds),
                  orderBy: (s, { asc }) => [asc(s.studentNo)],
                })
              : [];

            const result = entries.map((e) => {
              let studentsList = allStudents.filter((s) => s.weeklyEntryId === e.id);
              if (args.onlyAbsent) {
                studentsList = studentsList.filter(
                  (s) => s.remarks && s.remarks.toLowerCase() !== "hadir"
                );
              }
              return {
                weekNumber: e.weekNumber,
                scheduleId: e.scheduleId,
                materi: e.materi,
                tanggal: e.tanggal,
                pengajar: e.pengajar,
                totalStudents: studentsList.length,
                students: studentsList.map((s) => ({
                  no: s.studentNo,
                  nim: s.nim,
                  name: s.name,
                  status: s.remarks || "Hadir",
                })),
              };
            });

            return {
              count: result.length,
              attendanceData: result,
            };
          }

          case "getStudentMaster": {
            let whereClause = eq(studentMaster.userId, user.id);
            if (args.prodi) {
              whereClause = and(
                eq(studentMaster.userId, user.id),
                eq(studentMaster.prodi, args.prodi)
              )!;
            }
            const list = await db.query.studentMaster.findMany({
              where: whereClause,
            });

            let filtered = list;
            if (args.keyword) {
              const kw = args.keyword.toLowerCase();
              filtered = filtered.filter(
                (s) =>
                  s.name.toLowerCase().includes(kw) ||
                  s.nim.toLowerCase().includes(kw)
              );
            }

            return {
              count: filtered.length,
              students: filtered.map((s) => ({
                nim: s.nim,
                name: s.name,
                prodi: s.prodi,
                semester: s.semester,
                golongan: s.golongan,
              })),
            };
          }

          case "getNotes": {
            const list = await db.query.notes.findMany({
              where: eq(notes.userId, user.id),
              orderBy: (n, { desc }) => [desc(n.pinned), desc(n.createdAt)],
            });
            const filtered = args.pinnedOnly
              ? list.filter((n) => n.pinned)
              : list;
            return {
              count: filtered.length,
              notes: filtered.map((n) => ({
                id: n.id,
                title: n.title,
                content: n.content,
                pinned: n.pinned,
                createdAt: n.createdAt,
              })),
            };
          }

          case "getExamSchedules": {
            const exams = await db.query.examSchedules.findMany({
              where: eq(examSchedules.userId, user.id),
            });
            const examEntries = await db.query.examScheduleEntries.findMany({
              where: eq(examScheduleEntries.userId, user.id),
            });
            return {
              examCount: exams.length,
              exams: exams.map((ex) => ({
                id: ex.id,
                name: ex.name,
                entries: examEntries
                  .filter((entry) => entry.examScheduleId === ex.id)
                  .map((e) => ({
                    mataKuliah: e.mataKuliah,
                    kodeMk: e.kodeMk,
                    hari: e.hari,
                    tanggal: e.tanggal,
                    jam: e.jam,
                    ruang: e.ruang,
                    semester: e.semester,
                    golongan: e.golongan,
                    pengawas: e.pengawas,
                  })),
              })),
            };
          }

          case "getDosenList": {
            const list = await db.query.dosenList.findMany({
              where: eq(dosenList.userId, user.id),
            });
            return {
              count: list.length,
              dosen: list.map((d) => ({ name: d.name })),
            };
          }

          case "getAssessmentForms": {
            const forms = await db.query.assessmentForms.findMany({
              where: eq(assessmentForms.userId, user.id),
            });
            return {
              count: forms.length,
              forms: forms.map((f) => ({
                id: f.formId,
                name: f.name,
                data: f.data,
              })),
            };
          }

          case "getArchives": {
            const list = await db.query.archives.findMany({
              where: eq(archives.userId, user.id),
              orderBy: (a, { desc }) => [desc(a.createdAt)],
            });
            return {
              count: list.length,
              archives: list.map((a) => {
                const snapshot = (a.data as any) || {};
                const scheduleTemplatesList = snapshot.scheduleTemplates || [];
                const notesList = snapshot.notes || [];
                const weeklyEntriesList = snapshot.weeklyEntries || [];
                return {
                  id: a.id,
                  name: a.name,
                  createdAt: a.createdAt,
                  summary: {
                    totalSchedules: scheduleTemplatesList.length,
                    totalNotes: notesList.length,
                    totalWeeklyEntries: weeklyEntriesList.length,
                    sampleSchedules: scheduleTemplatesList.slice(0, 10).map((s: any) => ({
                      mataKuliah: s.mataKuliah || s.mata_kuliah,
                      hari: s.hari,
                      jam: s.jam,
                      tempat: s.tempat,
                      pengajar: s.defaultPengajar || s.default_pengajar,
                    })),
                  },
                };
              }),
            };
          }

          case "getArchiveDetail": {
            let record;
            if (args.archiveId) {
              record = await db.query.archives.findFirst({
                where: and(eq(archives.userId, user.id), eq(archives.id, args.archiveId)),
              });
            } else if (args.archiveName) {
              record = await db.query.archives.findFirst({
                where: and(eq(archives.userId, user.id), eq(archives.name, args.archiveName)),
              });
            } else {
              // Get latest archive
              record = await db.query.archives.findFirst({
                where: eq(archives.userId, user.id),
                orderBy: (a, { desc }) => [desc(a.createdAt)],
              });
            }

            if (!record) {
              return { success: false, error: "Arsip tidak ditemukan." };
            }

            const data = (record.data as any) || {};
            return {
              success: true,
              id: record.id,
              name: record.name,
              createdAt: record.createdAt,
              activeWeek: data.activeWeek,
              scheduleTemplates: data.scheduleTemplates || [],
              weeklyEntries: data.weeklyEntries || [],
              notes: data.notes || [],
              examSchedules: data.examSchedules || [],
              dosenList: data.dosenList || [],
            };
          }

          case "createSchedule": {
            const items = Array.isArray(args.schedules) ? args.schedules : [];
            if (items.length === 0) {
              return { success: false, error: "Tidak ada data jadwal yang valid untuk dimasukkan." };
            }

            // Get current existing schedules for this user
            const existing = await db.query.scheduleTemplates.findMany({
              where: eq(scheduleTemplates.userId, user.id),
              orderBy: (t, { desc }) => [desc(t.no)],
            });
            const maxNo = existing.length > 0 ? Math.max(...existing.map((e) => e.no)) : 0;

            const normalizeStr = (str?: string) => (str || "").toLowerCase().replace(/[\s\.\:\-–—]/g, "");

            const conflicts: any[] = [];
            const validItemsToInsert: any[] = [];

            for (const item of items) {
              const itemHari = (item.hari || "Senin").trim();
              const itemJam = (item.jam || "").trim();
              const normHari = normalizeStr(itemHari);
              const normJam = normalizeStr(itemJam);

              // 1. Cek bentrok dengan jadwal yang sudah ada di database
              const existingConflict = existing.find(
                (e) => normalizeStr(e.hari) === normHari && normalizeStr(e.jam) === normJam
              );

              // 2. Cek duplikasi antar baris dalam request yang sama
              const batchConflict = validItemsToInsert.find(
                (v) => normalizeStr(v.hari) === normHari && normalizeStr(v.jam) === normJam
              );

              if (existingConflict) {
                conflicts.push({
                  mataKuliah: item.mataKuliah,
                  hari: itemHari,
                  jam: itemJam,
                  reason: `Hari ${existingConflict.hari} jam ${existingConflict.jam} sudah ada jadwal "${existingConflict.mataKuliah}" (${existingConflict.tempat || "Tanpa ruang"}).`,
                });
              } else if (batchConflict) {
                conflicts.push({
                  mataKuliah: item.mataKuliah,
                  hari: itemHari,
                  jam: itemJam,
                  reason: `Duplikasi input dalam permintaan yang sama untuk hari ${itemHari} jam ${itemJam}.`,
                });
              } else {
                validItemsToInsert.push(item);
              }
            }

            if (validItemsToInsert.length === 0) {
              return {
                success: false,
                count: 0,
                error: `Semua (${conflicts.length}) jadwal ditolak karena hari dan jamnya sudah ada di database Anda (bentrok / duplikat).`,
                conflicts,
              };
            }

            const now = Date.now();
            const rowsToInsert = validItemsToInsert.map((item: any, idx: number) => ({
              userId: user.id,
              scheduleId: `sched-${now}-${idx + 1}`,
              no: maxNo + idx + 1,
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

            const inserted = await db.insert(scheduleTemplates).values(rowsToInsert).returning();
            return {
              success: true,
              count: inserted.length,
              conflictsCount: conflicts.length,
              message: conflicts.length > 0
                ? `Berhasil menambahkan ${inserted.length} jadwal. Sebanyak ${conflicts.length} jadwal tidak dimasukkan karena hari dan jamnya sudah terdaftar.`
                : `Berhasil menambahkan ${inserted.length} entri jadwal baru ke database.`,
              insertedSchedules: inserted.map((s) => ({
                no: s.no,
                mataKuliah: s.mataKuliah,
                hari: s.hari,
                jam: s.jam,
                tempat: s.tempat,
                pengajar: s.defaultPengajar,
              })),
              conflicts,
            };
          }

          case "reorderScheduleTemplates": {
            const list = await db.query.scheduleTemplates.findMany({
              where: eq(scheduleTemplates.userId, user.id),
            });

            if (list.length === 0) {
              return { success: false, error: "Tidak ada jadwal untuk diurutkan." };
            }

            const dayRank: Record<string, number> = {
              senin: 1,
              selasa: 2,
              rabu: 3,
              kamis: 4,
              jumat: 5,
              sabtu: 6,
              minggu: 7,
            };

            const sorted = [...list].sort((a, b) => {
              const dA = dayRank[a.hari.toLowerCase().trim()] || 99;
              const dB = dayRank[b.hari.toLowerCase().trim()] || 99;
              if (dA !== dB) return dA - dB;
              return a.jam.localeCompare(b.jam);
            });

            // Update `no` column in database
            await Promise.all(
              sorted.map((item, idx) =>
                db
                  .update(scheduleTemplates)
                  .set({ no: idx + 1 })
                  .where(eq(scheduleTemplates.id, item.id))
              )
            );

            return {
              success: true,
              count: sorted.length,
              message: `Berhasil mengurutkan ${sorted.length} jadwal berdasarkan hari (Senin - Jumat) dan jam di database.`,
            };
          }

          default:
            return { error: `Tool ${name} tidak ditemukan.` };
        }
      } catch (err: any) {
        console.error(`Error executing tool ${name}:`, err);
        return { error: err.message || "Gagal mengeksekusi query database." };
      }
    };

    // Check if primary provider is specified
    const preferredProvider = process.env.AI_PROVIDER?.toLowerCase();

    if (preferredProvider === "deepseek" && isDeepSeekConfigured()) {
      try {
        const reply = await chatWithDeepSeek({
          messages,
          systemInstruction,
          tools: functionDeclarations,
          executeFunction,
        });
        return NextResponse.json({ success: true, reply, provider: "deepseek" });
      } catch (dsErr: any) {
        console.error("DeepSeek primary chat error:", dsErr);
      }
    }

    // Try Gemini first if key exists
    let geminiError: any = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();

        // Format conversation history for Gemini API
        const contents: any[] = messages.map((m: { role: string; content: string }) => ({
          role: m.role === "assistant" || m.role === "model" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        // Multi-turn tool execution loop (max 5 turns)
        let turns = 0;
        const maxTurns = 5;

        while (turns < maxTurns) {
          turns++;

          const { response } = await generateContentWithFallback(ai, {
            contents: contents,
            config: {
              systemInstruction,
              tools: [{ functionDeclarations }],
            },
          });

          const functionCalls = response.functionCalls;

          if (!functionCalls || functionCalls.length === 0) {
            return NextResponse.json({
              success: true,
              reply: response.text || "Tidak ada respons dari AI.",
            });
          }

          const candidateContent = response.candidates?.[0]?.content;
          if (candidateContent) {
            contents.push(candidateContent);
          }

          const functionResponseParts = [];
          for (const call of functionCalls) {
            const fnName = call.name || "";
            const result = await executeFunction(fnName, call.args || {});
            functionResponseParts.push({
              functionResponse: {
                name: fnName,
                response: result,
              },
            });
          }

          contents.push({
            role: "user",
            parts: functionResponseParts,
          });
        }

        return NextResponse.json({
          success: true,
          reply: "Selesai memproses data.",
        });
      } catch (err: any) {
        console.warn("Gemini chat failed, attempting DeepSeek fallback...", err.message);
        geminiError = err;
      }
    }

    // Fallback to DeepSeek if configured
    if (isDeepSeekConfigured()) {
      try {
        const reply = await chatWithDeepSeek({
          messages,
          systemInstruction,
          tools: functionDeclarations,
          executeFunction,
        });
        return NextResponse.json({
          success: true,
          reply,
          provider: "deepseek (fallback)",
        });
      } catch (dsErr: any) {
        console.error("DeepSeek fallback chat error:", dsErr);
        throw dsErr;
      }
    }

    if (geminiError) {
      throw geminiError;
    }

    throw new Error("Tidak ada AI provider yang aktif. Silakan atur GEMINI_API_KEY atau DEEPSEEK_API_KEY di file .env.");
  } catch (error: any) {
    console.error("POST /api/ai/chat error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Gagal memproses percakapan AI. Pastikan GEMINI_API_KEY atau DEEPSEEK_API_KEY valid.",
      },
      { status: 500 }
    );
  }
}
