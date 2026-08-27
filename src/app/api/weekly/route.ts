import { NextResponse } from "next/server";
import { db, userData, scheduleTemplates, dosenList, studentMaster, weeklyEntries, weeklyStudents } from "@/db";
import { eq, and, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

// GET: Loads all AppData for the authenticated user
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user data (active week)
    let userPref = await db.query.userData.findFirst({
      where: eq(userData.userId, user.id),
    });

    if (!userPref) {
      // Initialize if missing
      const [newPref] = await db
        .insert(userData)
        .values({ userId: user.id, activeWeek: 1 })
        .returning();
      userPref = newPref;
    }

    const activeWeek = userPref.activeWeek;

    // 2. Fetch all other collections in parallel
    const [templatesData, dosenData, studentsMasterData, entriesData] = await Promise.all([
      db.query.scheduleTemplates.findMany({
        where: eq(scheduleTemplates.userId, user.id),
        orderBy: (st, { asc }) => [asc(st.no)],
      }),
      db.query.dosenList.findMany({
        where: eq(dosenList.userId, user.id),
      }),
      db.query.studentMaster.findMany({
        where: eq(studentMaster.userId, user.id),
      }),
      db.query.weeklyEntries.findMany({
        where: eq(weeklyEntries.userId, user.id),
        orderBy: (we, { asc }) => [asc(we.weekNumber)],
      }),
    ]);

    const scheduleTemplate = templatesData.map(t => ({
      id: t.scheduleId,
      no: t.no,
      mataKuliah: t.mataKuliah,
      hari: t.hari,
      tempat: t.tempat,
      jam: t.jam,
      prodi: t.prodi,
      semester: t.semester,
      golongan: t.golongan,
      defaultPengajar: t.defaultPengajar,
      defaultTeknisi: t.defaultTeknisi,
    }));

    const dosenListRecords = dosenData.map(d => ({
      id: d.id,
      name: d.name,
      signature: d.signature || "",
    }));

    const studentMasterRecords = studentsMasterData.map(s => ({
      nim: s.nim,
      name: s.name,
      prodi: s.prodi,
      semester: s.semester,
      golongan: s.golongan,
    }));

    // 3. Fetch weekly students in batch if weekly entries exist
    const entryIds = entriesData.map(e => e.id);
    const studentsByEntryId = new Map<string, any[]>();

    if (entryIds.length > 0) {
      const allWeeklyStudents = await db.query.weeklyStudents.findMany({
        where: inArray(weeklyStudents.weeklyEntryId, entryIds),
        orderBy: (ws, { asc }) => [asc(ws.studentNo)],
      });

      for (const s of allWeeklyStudents) {
        const list = studentsByEntryId.get(s.weeklyEntryId) || [];
        list.push({
          id: s.studentNo,
          nim: s.nim,
          name: s.name,
          remarks: s.remarks,
        });
        studentsByEntryId.set(s.weeklyEntryId, list);
      }
    }

    // 4. Build 1-16 weeks structured layout
    const weeksMap = new Map<number, any>();
    for (let i = 1; i <= 16; i++) {
      weeksMap.set(i, {
        weekNumber: i,
        entries: scheduleTemplate.map(tmpl => ({
          scheduleId: tmpl.id,
          pengajar: tmpl.defaultPengajar,
          materi: "",
          tanggal: "",
          teknisi: tmpl.defaultTeknisi,
          students: [],
        })),
      });
    }

    // Merge actual database records into the weeks map
    for (const we of entriesData) {
      const week = weeksMap.get(we.weekNumber);
      if (week) {
        const entryIdx = week.entries.findIndex((e: any) => e.scheduleId === we.scheduleId);
        if (entryIdx !== -1) {
          week.entries[entryIdx] = {
            scheduleId: we.scheduleId,
            pengajar: we.pengajar,
            materi: we.materi,
            tanggal: we.tanggal,
            teknisi: we.teknisi,
            students: studentsByEntryId.get(we.id) || [],
          };
        }
      }
    }

    const weeks = Array.from(weeksMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);

    const academicYear = userPref.academicYear || "2025/2026";
    const academicSemester = userPref.academicSemester || "Genap";

    return NextResponse.json({
      scheduleTemplate,
      weeks,
      activeWeek,
      academicYear,
      academicSemester,
      dosenList: dosenListRecords,
      studentMaster: studentMasterRecords,
    });
  } catch (error: any) {
    console.error("GET /api/weekly error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Saves / Synchronizes the entire AppData state inside a single transaction
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      scheduleTemplate = [],
      weeks = [],
      activeWeek = 1,
      academicYear = "2025/2026",
      academicSemester = "Genap",
      dosenList: dosenData = [],
      studentMaster: studentsMasterData = []
    } = body;

    await db.transaction(async (tx) => {
      // 1. Sync User Preferences (active week, academicYear, academicSemester)
      await tx
        .insert(userData)
        .values({
          userId: user.id,
          activeWeek,
          academicYear: academicYear || "2025/2026",
          academicSemester: academicSemester || "Genap",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userData.userId,
          set: {
            activeWeek,
            academicYear: academicYear || "2025/2026",
            academicSemester: academicSemester || "Genap",
            updatedAt: new Date()
          },
        });

      // 2. Sync Schedule Templates
      await tx.delete(scheduleTemplates).where(eq(scheduleTemplates.userId, user.id));
      if (scheduleTemplate.length > 0) {
        const templateRows = scheduleTemplate.map((t: any) => ({
          userId: user.id,
          scheduleId: t.id || t.scheduleId,
          no: Number(t.no) || 0,
          mataKuliah: t.mataKuliah || t.mata_kuliah || "",
          hari: t.hari || "",
          tempat: t.tempat || "",
          jam: t.jam || "",
          prodi: t.prodi || "",
          semester: t.semester || "",
          golongan: t.golongan || "",
          defaultPengajar: t.defaultPengajar || t.default_pengajar || "",
          defaultTeknisi: t.defaultTeknisi || t.default_teknisi || "",
        }));
        await tx.insert(scheduleTemplates).values(templateRows);
      }

      // 3. Sync Dosen List
      await tx.delete(dosenList).where(eq(dosenList.userId, user.id));
      if (dosenData.length > 0) {
        const dosenRows = dosenData.map((d: any) => {
          const name = typeof d === 'string' ? d : String(d.name || "");
          const signature = typeof d === 'string' ? "" : String(d.signature || "");
          return {
            userId: user.id,
            name,
            signature,
          };
        });
        await tx.insert(dosenList).values(dosenRows);
      }

      // 4. Sync Student Master
      await tx.delete(studentMaster).where(eq(studentMaster.userId, user.id));
      if (studentsMasterData.length > 0) {
        const masterRows = studentsMasterData.map((s: any) => ({
          userId: user.id,
          nim: String(s.nim || ""),
          name: String(s.name || ""),
          prodi: String(s.prodi || ""),
          semester: String(s.semester || ""),
          golongan: String(s.golongan || ""),
        }));
        await tx.insert(studentMaster).values(masterRows);
      }

      // 5. Filter Active Weekly Entries to Save
      const activeEntriesToSave: any[] = [];
      for (const week of weeks) {
        if (!week.entries || week.entries.length === 0) continue;

        const activeEntries = week.entries.filter((e: any) => {
          const tmpl = scheduleTemplate.find((t: any) => t.id === e.scheduleId);
          const isPengajarDifferent = e.pengajar && tmpl && e.pengajar !== tmpl.defaultPengajar;
          const isTeknisiDifferent = e.teknisi && tmpl && e.teknisi !== tmpl.defaultTeknisi;
          return (
            (e.materi && e.materi.trim() !== "") ||
            (e.tanggal && e.tanggal.trim() !== "") ||
            (e.students && e.students.length > 0) ||
            isPengajarDifferent ||
            isTeknisiDifferent
          );
        });

        for (const e of activeEntries) {
          activeEntriesToSave.push({
            userId: user.id,
            weekNumber: week.weekNumber,
            scheduleId: e.scheduleId,
            pengajar: e.pengajar || "",
            materi: e.materi || "",
            tanggal: e.tanggal || "",
            teknisi: e.teknisi || "",
            _students: e.students || [],
          });
        }
      }

      if (activeEntriesToSave.length === 0) {
        // Clear all weekly entries if none are active
        await tx.delete(weeklyEntries).where(eq(weeklyEntries.userId, user.id));
      } else {
        // Upsert all active weekly entries one by one or batch upsert
        const savedEntries: any[] = [];
        for (const entry of activeEntriesToSave) {
          const { _students, ...payload } = entry;
          
          // Drizzle doesn't support bulk upsert with composite onConflict target cleanly in all drivers,
          // so single upserts ensure perfect cross-dialect safety.
          const [saved] = await tx
            .insert(weeklyEntries)
            .values(payload)
            .onConflictDoUpdate({
              target: [weeklyEntries.userId, weeklyEntries.weekNumber, weeklyEntries.scheduleId], // composite unique constraint
              set: {
                pengajar: payload.pengajar,
                materi: payload.materi,
                tanggal: payload.tanggal,
                teknisi: payload.teknisi,
                updatedAt: new Date(),
              },
            })
            .returning();
          
          savedEntries.push({ ...saved, _students });
        }

        // Delete students linked to updated entries
        const savedIds = savedEntries.map(e => e.id);
        if (savedIds.length > 0) {
          await tx.delete(weeklyStudents).where(inArray(weeklyStudents.weeklyEntryId, savedIds));
        }

        // Insert new weekly students
        const studentRows: any[] = [];
        for (const entry of savedEntries) {
          if (entry._students && entry._students.length > 0) {
            for (const s of entry._students) {
              studentRows.push({
                weeklyEntryId: entry.id,
                studentNo: Number(s.id) || 0,
                nim: s.nim || "",
                name: s.name || "",
                remarks: s.remarks || "",
              });
            }
          }
        }

        if (studentRows.length > 0) {
          await tx.insert(weeklyStudents).values(studentRows);
        }

        // Delete ghost weekly entries (entries in DB that are no longer active in our current save state)
        const allUserEntries = await tx.query.weeklyEntries.findMany({
          where: eq(weeklyEntries.userId, user.id),
          columns: { id: true },
        });

        const idsToDelete = allUserEntries
          .map(e => e.id)
          .filter(id => !savedIds.includes(id));

        if (idsToDelete.length > 0) {
          await tx.delete(weeklyEntries).where(inArray(weeklyEntries.id, idsToDelete));
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/weekly error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
