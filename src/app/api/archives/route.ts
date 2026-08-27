import { NextResponse } from "next/server";
import { db, userData, scheduleTemplates, studentMaster, dosenList, weeklyEntries, weeklyStudents, assessmentForms, notes, examSchedules, examScheduleEntries, examScheduleNotes, archives } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

// Helper function to capture the current active data snapshot for a user
async function getActiveDataSnapshot(userId: string) {
  // 1. Fetch preferences (active week, academicYear, academicSemester)
  const userPref = await db.query.userData.findFirst({
    where: eq(userData.userId, userId),
  });
  const activeWeek = userPref?.activeWeek ?? 1;
  const academicYear = userPref?.academicYear ?? "2025/2026";
  const academicSemester = userPref?.academicSemester ?? "Genap";

  // 2. Fetch other tables in parallel
  const [
    templatesData,
    studentsMasterData,
    dosenData,
    entriesData,
    assessmentsData,
    notesData,
    examsData,
  ] = await Promise.all([
    db.query.scheduleTemplates.findMany({
      where: eq(scheduleTemplates.userId, userId),
    }),
    db.query.studentMaster.findMany({
      where: eq(studentMaster.userId, userId),
    }),
    db.query.dosenList.findMany({
      where: eq(dosenList.userId, userId),
    }),
    db.query.weeklyEntries.findMany({
      where: eq(weeklyEntries.userId, userId),
    }),
    db.query.assessmentForms.findMany({
      where: eq(assessmentForms.userId, userId),
    }),
    db.query.notes.findMany({
      where: eq(notes.userId, userId),
    }),
    db.query.examSchedules.findMany({
      where: eq(examSchedules.userId, userId),
    }),
  ]);

  // 3. Fetch weekly students in batch if weekly entries exist
  const entryIds = entriesData.map((e) => e.id);
  let weeklyStudentsData: any[] = [];
  if (entryIds.length > 0) {
    weeklyStudentsData = await db.query.weeklyStudents.findMany({
      where: inArray(weeklyStudents.weeklyEntryId, entryIds),
    });
  }

  // 4. Fetch exam schedule entries and notes
  const examIds = examsData.map((ex) => ex.id);
  let examEntriesData: any[] = [];
  let examNotesData: any[] = [];
  if (examIds.length > 0) {
    examEntriesData = await db.query.examScheduleEntries.findMany({
      where: inArray(examScheduleEntries.examScheduleId, examIds),
    });

    const entryIds = examEntriesData.map((en) => en.id);
    if (entryIds.length > 0) {
      examNotesData = await db.query.examScheduleNotes.findMany({
        where: inArray(examScheduleNotes.entryId, entryIds),
      });
    }
  }

  return {
    activeWeek,
    academicYear,
    academicSemester,
    scheduleTemplates: templatesData,
    studentMaster: studentsMasterData,
    dosenList: dosenData,
    weeklyEntries: entriesData,
    weeklyStudents: weeklyStudentsData,
    assessmentForms: assessmentsData,
    notes: notesData,
    examSchedules: examsData,
    examScheduleEntries: examEntriesData,
    examScheduleNotes: examNotesData,
  };
}

// GET: Retrieve list of archives
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await db.query.archives.findMany({
      where: eq(archives.userId, user.id),
      columns: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: (ar, { desc }) => [desc(ar.createdAt)],
    });

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("GET /api/archives error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new archive from current active state and reset active tables
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama arsip diperlukan" }, { status: 400 });
    }

    // Capture the entire active state
    const snapshot = await getActiveDataSnapshot(user.id);

    // Run archiving and reset inside transaction
    await db.transaction(async (tx) => {
      // 1. Insert archive record
      await tx.insert(archives).values({
        userId: user.id,
        name: name.trim(),
        data: snapshot,
      });

      // 2. Clear all active tables
      await tx.delete(scheduleTemplates).where(eq(scheduleTemplates.userId, user.id));
      await tx.delete(studentMaster).where(eq(studentMaster.userId, user.id));
      await tx.delete(dosenList).where(eq(dosenList.userId, user.id));
      await tx.delete(weeklyEntries).where(eq(weeklyEntries.userId, user.id)); // cascades to weeklyStudents
      await tx.delete(assessmentForms).where(eq(assessmentForms.userId, user.id));
      await tx.delete(notes).where(eq(notes.userId, user.id));
      await tx.delete(examSchedules).where(eq(examSchedules.userId, user.id)); // cascades to examScheduleEntries and notes

      // 3. Reset active week to 1
      await tx
        .insert(userData)
        .values({ userId: user.id, activeWeek: 1 })
        .onConflictDoUpdate({
          target: userData.userId,
          set: { activeWeek: 1, updatedAt: new Date() },
        });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/archives error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Export snapshot capturing function for use in restore endpoints
export { getActiveDataSnapshot };
