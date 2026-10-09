import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isAIConfigured, chatWithAI } from "@/lib/ai";
import { db, scheduleTemplates, weeklyEntries, weeklyStudents, studentMaster, notes, examSchedules, examScheduleEntries, dosenList, assessmentForms, archives } from "@/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { buildWeeklyPatches } from "@/lib/weeklyImport";

const Type = {
  OBJECT: "object",
  STRING: "string",
  INTEGER: "integer",
  NUMBER: "number",
  BOOLEAN: "boolean",
  ARRAY: "array",
} as const;

// Definitions of tools available to AI (strictly scoped to current user session)
const functionDeclarations: any[] = [
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
      properties: {
        formId: {
          type: Type.STRING,
          description: "ID form penilaian spesifik jika ingin melihat detail isinya (opsional)",
        },
      },
    },
  },
  {
    name: "saveAssessmentGrades",
    description: "Menginputkan atau memperbarui nilai mahasiswa ke dalam form penilaian (Assessment Form). Bisa membuat form penilaian baru secara otomatis jika belum ada, atau memperbarui nilai/komponen/mata kuliah di form yang sudah ada.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        formName: {
          type: Type.STRING,
          description: "Nama form penilaian (contoh: 'Penilaian Jaringan Komputer', 'Nilai Praktikum Semester 4')",
        },
        formId: {
          type: Type.STRING,
          description: "ID form jika ingin memperbarui form yang sudah ada (opsional)",
        },
        subjects: {
          type: Type.ARRAY,
          description: "Daftar mata kuliah dan komponen penilaiannya",
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: "Nama mata kuliah / modul (contoh: 'Workshop Jaringan Komputer')",
              },
              columns: {
                type: Type.ARRAY,
                description: "Daftar nama kolom penilaian (contoh: ['Tugas 1', 'UTS', 'UAS', 'Kuis'])",
                items: {
                  type: Type.STRING,
                },
              },
              notes: {
                type: Type.STRING,
                description: "Catatan opsional di bawah tabel mata kuliah",
              },
            },
            required: ["name", "columns"],
          },
        },
        students: {
          type: Type.ARRAY,
          description: "Daftar mahasiswa yang dinilai",
          items: {
            type: Type.OBJECT,
            properties: {
              nim: { type: Type.STRING, description: "NIM mahasiswa" },
              nama: { type: Type.STRING, description: "Nama lengkap mahasiswa" },
            },
            required: ["nim", "nama"],
          },
        },
        grades: {
          type: Type.ARRAY,
          description: "Daftar nilai mahasiswa yang dimasukkan",
          items: {
            type: Type.OBJECT,
            properties: {
              nim: { type: Type.STRING, description: "NIM mahasiswa" },
              subjectName: { type: Type.STRING, description: "Nama mata kuliah" },
              columnName: { type: Type.STRING, description: "Nama kolom/komponen penilaian" },
              value: { type: Type.STRING, description: "Nilai yang diberikan (angka atau huruf)" },
            },
            required: ["nim", "subjectName", "columnName", "value"],
          },
        },
      },
      required: ["formName", "subjects", "students", "grades"],
    },
  },
  {
    name: "executeAutonomousQuery",
    description: "Tool eksplorasi mandiri query database PostgreSQL. Mengeksekusi query SELECT atau INSERT/UPDATE data secara fleksibel. CATATAN KEAMANAN: 1) Hanya boleh mengakses tabel operasional sistem (schedule_templates, student_master, dosen_list, weekly_entries, weekly_students, assessment_forms, notes, exam_schedules, exam_schedule_entries, archives). 2) WAJIB SELALU sertakan filter user_id = CURRENT_USER_ID di mana CURRENT_USER_ID akan diinjeksikan secara aman oleh sistem. 3) DILARANG KERAS menjalankan DROP, TRUNCATE, DELETE data massal yang fatal, atau mengubah tabel autentikasi (user, session, account).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        operation: {
          type: Type.STRING,
          description: "Jenis operasi: 'select', 'insert', 'update'",
        },
        table: {
          type: Type.STRING,
          description: "Nama tabel yang dioperasikan: 'schedule_templates', 'student_master', 'dosen_list', 'weekly_entries', 'weekly_students', 'assessment_forms', 'notes', 'exam_schedules', 'exam_schedule_entries', 'archives'",
        },
        filters: {
          type: Type.OBJECT,
          description: "Filter pencarian data (key-value) untuk SELECT atau WHERE clause UPDATE",
        },
        data: {
          type: Type.OBJECT,
          description: "Data payload untuk INSERT atau UPDATE (key-value)",
        },
        limit: {
          type: Type.INTEGER,
          description: "Limit jumlah data yang dikembalikan pada query SELECT (default: 50)",
        },
      },
      required: ["operation", "table"],
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
  {
    name: "updateWeeklyEntries",
    description: "Memperbarui data mingguan (materi dan pengajar) untuk minggu 1-16 secara massal dari tabel/Excel. WAJIB menentukan cakupan jadwal lewat scope (minimal mataKuliah). Satu objek 'weeks' = satu minggu, berisi materi minggu itu dan peta pengampu per golongan (urutan pertemuan). Jangan mengirim sel satu per satu. Jika data banyak, panggil tool ini beberapa kali per kelompok minggu.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        scope: {
          type: Type.OBJECT,
          description: "Cakupan jadwal yang boleh diubah. Minimal salah satu field harus diisi. Semua field yang diisi harus cocok (AND).",
          properties: {
            mataKuliah: {
              type: Type.STRING,
              description: "Nama mata kuliah (pencocokan mengandung, tidak case-sensitive).",
            },
            prodi: {
              type: Type.STRING,
              description: "Program studi (mis. 'TIF', 'MIF', 'TKK').",
            },
            semester: {
              type: Type.STRING,
              description: "Semester (mis. '2', '4', '6').",
            },
            golongan: {
              type: Type.STRING,
              description: "Golongan/kelas (mis. 'A', 'B', 'Inter').",
            },
          },
        },
        weeks: {
          type: Type.ARRAY,
          description: "Daftar data per minggu (1 objek per baris minggu).",
          items: {
            type: Type.OBJECT,
            properties: {
              weekNumber: {
                type: Type.INTEGER,
                description: "Nomor minggu (1 s/d 16)",
              },
              materi: {
                type: Type.STRING,
                description: "Materi minggu tersebut. Ambil HANYA dari kolom Materi. JANGAN menyertakan kolom Keterangan/deskripsi.",
              },
              pengampu: {
                type: Type.OBJECT,
                description: "Peta golongan -> pengampu. Nilai boleh satu nama (string) bila semua pertemuan sama, atau daftar nama sesuai urutan pertemuan (Pertemuan 1, Pertemuan 2, ...). Contoh: { \"A\": \"Elly\", \"B\": [\"Elly\", \"Denny T\"], \"Inter\": \"Munih\" }. Kosongkan bila minggu tersebut tanpa pengampu (mis. UTS/UAS).",
                additionalProperties: true,
              },
            },
            required: ["weekNumber"],
          },
        },
      },
      required: ["scope", "weeks"],
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

    // System instruction explaining role, concise response style, and boundaries
    const systemInstruction = `Anda adalah asisten AI cerdas & otonom untuk Sistem Informasi Manajemen BAP & Jadwal Laboratorium.
Pengguna saat ini: ${user.name || user.email || "Pengguna"}.

KAPABILITAS OTONOM & PENILAIAN MAHASISWA:
1. INPUT NILAI & ASSESSMENT:
   - Anda dapat secara mandiri mencari form penilaian atau menginputkan nilai mahasiswa ke dalam form penilaian menggunakan tool 'saveAssessmentGrades' atau 'executeAutonomousQuery'.
   - Jika pengguna memberikan daftar nilai mahasiswa (contoh: "masukkan nilai mahasiswa berikut untuk matkul X..."), Anda dapat mengekstrak data nama, nim, komponen nilai (misal: Tugas, UTS, UAS, Praktik), dan langsung menyimpannya ke form penilaian.

2. EKSPLORASI DATABASE MANDIRI ('executeAutonomousQuery'):
   - Anda dapat melakukan query SELECT mandiri terhadap tabel operasional untuk mengumpulkan informasi yang dibutuhkan sebelum memproses data.
   - Tabel yang diizinkan: 'schedule_templates', 'student_master', 'dosen_list', 'weekly_entries', 'weekly_students', 'assessment_forms', 'notes', 'exam_schedules', 'exam_schedule_entries', 'archives'.

3. KEAMANAN & ISOLASI DATA (MUTLAK):
   - Anda HANYA memiliki akses ke data akun pengguna saat ini (user.id). Sistem akan selalu mengisolasi data per user.
   - DILARANG KERAS melakukan aksi penghapusan fatal atau data deletion massal (DROP, TRUNCATE, DELETE massal).
   - Data akun pengguna lain 100% terisolasi dan tidak bisa diakses.

4. SINKRONISASI NAMA DOSEN/PENGAJAR:
   - Ketika memperbarui entri mingguan ('updateWeeklyEntries') atau membuat jadwal baru ('createSchedule'), cocokkan nama singkat dosen (seperti 'Elly', 'Denny', 'Munih') dengan nama lengkap resmi dosen yang ada di master data dosen jika memungkinkan.

PEDOMAN GAYA MENJAWAB (PENTING):
1. RINGKAS & TO THE POINT UNTUK AKSI (MUTATION):
   - Jika pengguna meminta melakukan suatu aksi (seperti menginputkan nilai, menambah jadwal 'createSchedule', mengurutkan jadwal 'reorderScheduleTemplates', atau mengubah data mingguan 'updateWeeklyEntries'), CUKUP berikan pesan konfirmasi singkat bahwa aksi telah berhasil dijalankan di database.
   - JANGAN menampilkan atau mencantumkan tabel daftar data yang panjang kecuali jika pengguna secara eksplisit memintanya (contoh: "tampilkan daftarnya", "apa saja jadwalnya").
2. HANYA TAMPILKAN DATA JIKA DIMINTA EKSPLISIT:
   - Tampilkan tabel atau rincian data hanya jika pengguna bertanya/meminta informasi (misal: "tampilkan jadwal hari Senin", "rekap BAP minggu 2", "apa saja arsip saya").
3. Gunakan Bahasa Indonesia yang baik, lugas, ramah, dan profesional.

PANDUAN TOOL 'updateWeeklyEntries' (impor data mingguan dari Excel/tabel):
- Tujuan: mengisi kolom Materi dan Pengajar untuk minggu 1-16 pada jadwal DALAM CAKUPAN tertentu.
- WAJIB menentukan cakupan lewat field scope: minimal salah satu dari mataKuliah, prodi, semester, atau golongan. Data Excel biasanya hanya untuk SATU mata kuliah — pastikan scope diisi agar matkul lain tidak ikut terubah. Contoh: "Workshop Tata Kelola prodi TIF semester 6" -> scope: { mataKuliah: "Workshop Tata Kelola", prodi: "TIF", semester: "6" }.
- Bentuk data: kirim array 'weeks', SATU objek per baris minggu (bukan per sel). Tiap objek: { weekNumber, materi, pengampu }.
  - materi: ambil HANYA dari kolom "Materi". JANGAN menyertakan kolom "Keterangan"/deskripsi agar tidak panjang.
  - pengampu: objek peta golongan -> pengampu. Bila semua pertemuan memakai orang yang sama, cukup satu string: { "A": "Elly", "Inter": "Munih" }. Bila berbeda antar pertemuan, kirim array berurutan: { "A": ["Elly", "Denny T"] } (indeks 0 = Pertemuan 1, indeks 1 = Pertemuan 2, dst). Untuk minggu tanpa pengampu (mis. UTS/UAS), kosongkan pengampu.
- Golongan yang tidak ada di jadwal akan dilewati dan dilaporkan (unmatched). Jangan mengarang golongan.
- Bila data besar (>8 minggu), panggil tool beberapa kali (mis. per 4-8 minggu).
- Setelah selesai, laporkan jumlah entri yang diperbarui dan sebutkan entri yang dilewati (unmatched) bila ada.`;

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
            let filtered = forms;
            if (args.formId) {
              filtered = filtered.filter((f) => f.formId === args.formId || f.id === args.formId);
            }
            return {
              count: filtered.length,
              forms: filtered.map((f) => {
                const parsedData = typeof f.data === "string" ? JSON.parse(f.data) : f.data;
                return {
                  id: f.formId,
                  name: f.name,
                  studentsCount: parsedData?.students?.length || 0,
                  subjectsCount: parsedData?.subjects?.length || 0,
                  subjects: parsedData?.subjects || [],
                  students: parsedData?.students || [],
                  grades: parsedData?.grades || {},
                };
              }),
            };
          }

          case "saveAssessmentGrades": {
            const formName = (args.formName || "Form Penilaian").trim();
            const rawSubjects = Array.isArray(args.subjects) ? args.subjects : [];
            const rawStudents = Array.isArray(args.students) ? args.students : [];
            const rawGrades = Array.isArray(args.grades) ? args.grades : [];

            if (rawSubjects.length === 0 || rawStudents.length === 0) {
              return { success: false, error: "Daftar mata kuliah atau mahasiswa tidak boleh kosong." };
            }

            // Find existing form if formId or formName matches
            let existingForm = null;
            if (args.formId) {
              existingForm = await db.query.assessmentForms.findFirst({
                where: and(eq(assessmentForms.userId, user.id), eq(assessmentForms.formId, args.formId)),
              });
            }
            if (!existingForm) {
              existingForm = await db.query.assessmentForms.findFirst({
                where: and(eq(assessmentForms.userId, user.id), eq(assessmentForms.name, formName)),
              });
            }

            const existingData = existingForm
              ? typeof existingForm.data === "string"
                ? JSON.parse(existingForm.data)
                : existingForm.data
              : { students: [], subjects: [], grades: {} };

            // 1. Build Subjects and Column Map
            const subjectsList = [...(existingData.subjects || [])];
            const subjectIdMap: Record<string, string> = {};

            rawSubjects.forEach((sub: any) => {
              let existingSub = subjectsList.find(
                (s: any) => s.mataKuliah.toLowerCase().trim() === sub.name.toLowerCase().trim()
              );
              if (!existingSub) {
                const subId = `subj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                const cols = (sub.columns || []).map((colName: string) => ({
                  id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  name: colName,
                }));
                existingSub = {
                  id: subId,
                  mataKuliah: sub.name,
                  columns: cols,
                  notes: sub.notes || "",
                };
                subjectsList.push(existingSub);
              } else {
                // Merge new columns if not already present
                (sub.columns || []).forEach((colName: string) => {
                  const hasCol = existingSub.columns.some(
                    (c: any) => c.name.toLowerCase().trim() === colName.toLowerCase().trim()
                  );
                  if (!hasCol) {
                    existingSub.columns.push({
                      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                      name: colName,
                    });
                  }
                });
              }
              subjectIdMap[sub.name.toLowerCase().trim()] = existingSub.id;
            });

            // 2. Build Students Map
            const studentsList = [...(existingData.students || [])];
            rawStudents.forEach((st: any) => {
              const existingSt = studentsList.find(
                (s: any) => s.nim.trim() === st.nim.trim()
              );
              if (!existingSt) {
                studentsList.push({
                  no: studentsList.length + 1,
                  nim: st.nim.trim(),
                  nama: st.nama.trim(),
                });
              }
            });

            // 3. Build & Apply Grades Map: subjectId -> nim -> columnId -> value
            const gradesMap = { ...(existingData.grades || {}) };

            let gradesInsertedCount = 0;
            rawGrades.forEach((g: any) => {
              const subObj = subjectsList.find(
                (s: any) => s.mataKuliah.toLowerCase().trim() === g.subjectName.toLowerCase().trim()
              );
              if (!subObj) return;

              const colObj = subObj.columns.find(
                (c: any) => c.name.toLowerCase().trim() === g.columnName.toLowerCase().trim()
              );
              if (!colObj) return;

              const nim = g.nim.trim();
              if (!gradesMap[subObj.id]) gradesMap[subObj.id] = {};
              if (!gradesMap[subObj.id][nim]) gradesMap[subObj.id][nim] = {};

              gradesMap[subObj.id][nim][colObj.id] = String(g.value);
              gradesInsertedCount++;
            });

            const targetFormId = existingForm ? existingForm.formId : `form-${Date.now()}`;
            const updatedPayload = {
              students: studentsList,
              subjects: subjectsList,
              grades: gradesMap,
            };

            if (existingForm) {
              await db
                .update(assessmentForms)
                .set({
                  name: formName,
                  data: updatedPayload,
                  updatedAt: new Date(),
                })
                .where(eq(assessmentForms.id, existingForm.id));
            } else {
              await db.insert(assessmentForms).values({
                userId: user.id,
                formId: targetFormId,
                name: formName,
                data: updatedPayload,
                updatedAt: new Date(),
              });
            }

            return {
              success: true,
              formId: targetFormId,
              formName,
              totalMahasiswa: studentsList.length,
              totalMataKuliah: subjectsList.length,
              gradesUpdated: gradesInsertedCount,
              message: `Berhasil menginputkan ${gradesInsertedCount} nilai mahasiswa ke dalam form penilaian "${formName}".`,
            };
          }

          case "executeAutonomousQuery": {
            const operation = (args.operation || "").toLowerCase().trim();
            const table = (args.table || "").toLowerCase().trim();

            const ALLOWED_TABLES = [
              "schedule_templates",
              "student_master",
              "dosen_list",
              "weekly_entries",
              "weekly_students",
              "assessment_forms",
              "notes",
              "exam_schedules",
              "exam_schedule_entries",
              "archives",
            ];

            if (!ALLOWED_TABLES.includes(table)) {
              return {
                success: false,
                error: `Tabel '${table}' tidak diizinkan untuk diakses langsung demi alasan keamanan.`,
              };
            }

            if (operation === "select") {
              const filters = args.filters && typeof args.filters === "object" ? args.filters : {};
              const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 100);

              // Mapping table to drizzle schema
              switch (table) {
                case "schedule_templates": {
                  const res = await db.query.scheduleTemplates.findMany({
                    where: eq(scheduleTemplates.userId, user.id),
                    limit,
                  });
                  return { success: true, count: res.length, data: res };
                }
                case "student_master": {
                  const res = await db.query.studentMaster.findMany({
                    where: eq(studentMaster.userId, user.id),
                    limit,
                  });
                  return { success: true, count: res.length, data: res };
                }
                case "dosen_list": {
                  const res = await db.query.dosenList.findMany({
                    where: eq(dosenList.userId, user.id),
                    limit,
                  });
                  return { success: true, count: res.length, data: res };
                }
                case "assessment_forms": {
                  const res = await db.query.assessmentForms.findMany({
                    where: eq(assessmentForms.userId, user.id),
                    limit,
                  });
                  return { success: true, count: res.length, data: res };
                }
                case "notes": {
                  const res = await db.query.notes.findMany({
                    where: eq(notes.userId, user.id),
                    limit,
                  });
                  return { success: true, count: res.length, data: res };
                }
                case "weekly_entries": {
                  const res = await db.query.weeklyEntries.findMany({
                    where: eq(weeklyEntries.userId, user.id),
                    limit,
                  });
                  return { success: true, count: res.length, data: res };
                }
                case "exam_schedules": {
                  const res = await db.query.examSchedules.findMany({
                    where: eq(examSchedules.userId, user.id),
                    limit,
                  });
                  return { success: true, count: res.length, data: res };
                }
                case "archives": {
                  const res = await db.query.archives.findMany({
                    where: eq(archives.userId, user.id),
                    limit,
                  });
                  return { success: true, count: res.length, data: res };
                }
                default:
                  return { success: false, error: `Tabel ${table} belum didukung untuk SELECT.` };
              }
            } else if (operation === "insert" || operation === "update") {
              // Safe record mutation with strict userId injection
              const payload = args.data && typeof args.data === "object" ? args.data : {};
              if (Object.keys(payload).length === 0) {
                return { success: false, error: "Payload data untuk operasi mutation tidak boleh kosong." };
              }

              if (table === "notes") {
                if (operation === "insert") {
                  const inserted = await db.insert(notes).values({
                    userId: user.id,
                    title: payload.title || "Catatan AI",
                    content: payload.content || "",
                    color: payload.color || "default",
                    pinned: Boolean(payload.pinned),
                  }).returning();
                  return { success: true, message: "Catatan berhasil dibuat.", data: inserted };
                } else if (operation === "update" && args.filters?.id) {
                  const updated = await db.update(notes).set({
                    ...payload,
                    updatedAt: new Date(),
                  }).where(and(eq(notes.userId, user.id), eq(notes.id, args.filters.id))).returning();
                  return { success: true, message: "Catatan berhasil diperbarui.", data: updated };
                }
              } else if (table === "student_master") {
                if (operation === "insert" && payload.nim && payload.name) {
                  const inserted = await db.insert(studentMaster).values({
                    userId: user.id,
                    nim: payload.nim,
                    name: payload.name,
                    prodi: payload.prodi || "",
                    semester: payload.semester || "",
                    golongan: payload.golongan || "",
                  }).returning();
                  return { success: true, message: "Mahasiswa berhasil ditambahkan.", data: inserted };
                }
              } else if (table === "dosen_list") {
                if (operation === "insert" && payload.name) {
                  const inserted = await db.insert(dosenList).values({
                    userId: user.id,
                    name: payload.name,
                    signature: payload.signature || null,
                  }).returning();
                  return { success: true, message: "Dosen berhasil ditambahkan.", data: inserted };
                }
              }

              return {
                success: false,
                error: `Operasi ${operation} pada tabel ${table} membutuhkan parameter yang valid.`,
              };
            }

            return { success: false, error: `Operasi '${operation}' tidak diizinkan.` };
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

          case "updateWeeklyEntries": {
            const rawWeeks = Array.isArray(args.weeks) ? args.weeks : [];
            if (rawWeeks.length === 0) {
              return { success: false, error: "Tidak ada data mingguan yang dikirim." };
            }

            const [templates, masterDosenList] = await Promise.all([
              db.query.scheduleTemplates.findMany({
                where: eq(scheduleTemplates.userId, user.id),
              }),
              db.query.dosenList.findMany({
                where: eq(dosenList.userId, user.id),
              }),
            ]);

            let patches, unmatched, scopedSchedules;
            try {
              ({ patches, unmatched, scopedSchedules } = buildWeeklyPatches(
                templates,
                args.scope && typeof args.scope === "object" ? args.scope : {},
                rawWeeks,
                masterDosenList
              ));
            } catch (e: any) {
              return { success: false, error: e.message, scope: args.scope };
            }

            let updatedCount = 0;
            for (const p of patches) {
              const setObj: any = { updatedAt: new Date() };
              if (p.materi !== undefined) setObj.materi = p.materi;
              if (p.pengajar !== undefined) setObj.pengajar = p.pengajar;

              await db
                .insert(weeklyEntries)
                .values({
                  userId: user.id,
                  weekNumber: p.weekNumber,
                  scheduleId: p.scheduleId,
                  materi: p.materi ?? "",
                  pengajar: p.pengajar ?? "",
                })
                .onConflictDoUpdate({
                  target: [
                    weeklyEntries.userId,
                    weeklyEntries.weekNumber,
                    weeklyEntries.scheduleId,
                  ],
                  set: setObj,
                });

              updatedCount++;
            }

            return {
              success: updatedCount > 0,
              updatedCount,
              scopedSchedules,
              unmatchedCount: unmatched.length,
              unmatched: unmatched.slice(0, 20),
              message:
                `Berhasil memperbarui ${updatedCount} entri mingguan pada ${scopedSchedules} jadwal dalam cakupan.` +
                (unmatched.length
                  ? ` ${unmatched.length} entri dilewati (lihat unmatched).`
                  : ""),
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

    if (!isAIConfigured()) {
      throw new Error(
        "Tidak ada AI provider yang aktif. Silakan atur OPENAI_API_KEY di file .env."
      );
    }

    const reply = await chatWithAI({
      messages,
      systemInstruction,
      tools: functionDeclarations,
      executeFunction,
    });

    return NextResponse.json({
      success: true,
      reply,
      provider: `openai (${process.env.OPENAI_MODEL || "default"})`,
    });
  } catch (error: any) {
    console.error("POST /api/ai/chat error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Gagal memproses percakapan AI. Pastikan OPENAI_API_KEY valid.",
      },
      { status: 500 }
    );
  }
}
