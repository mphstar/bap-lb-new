import { NextResponse } from "next/server";
import { db, userData, scheduleTemplates, studentMaster, dosenList, weeklyEntries, weeklyStudents, assessmentForms, notes, examSchedules, examScheduleEntries, examScheduleNotes, archives } from "@/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { getActiveDataSnapshot } from "../route";

// Helper to convert date strings in JSON back into Date objects for insertion
const clean = (row: any) => {
  if (!row) return row;
  const c = { ...row };
  if (c.createdAt) c.createdAt = new Date(c.createdAt);
  if (c.updatedAt) c.updatedAt = new Date(c.updatedAt);
  return c;
};

// DELETE: Delete a specific archive
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Delete the archive entry
    const result = await db
      .delete(archives)
      .where(and(eq(archives.id, id), eq(archives.userId, user.id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Arsip tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/archives/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Restore a specific archive
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    if (action !== "restore") {
      return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
    }

    // 1. Load the archive
    const archive = await db.query.archives.findFirst({
      where: and(eq(archives.id, id), eq(archives.userId, user.id)),
    });

    if (!archive) {
      return NextResponse.json({ error: "Arsip tidak ditemukan" }, { status: 404 });
    }

    const snapshot = archive.data as any;

    // 2. Capture the current active state for backup
    const currentActiveState = await getActiveDataSnapshot(user.id);

    // 3. Perform restoration inside a transaction
    await db.transaction(async (tx) => {
      // a. Create backup archive so active data is not lost
      const backupName = `Cadangan sebelum memulihkan - ${archive.name}`;
      await tx.insert(archives).values({
        userId: user.id,
        name: backupName,
        data: currentActiveState,
      });

      // b. Clear all current active operational data
      await tx.delete(scheduleTemplates).where(eq(scheduleTemplates.userId, user.id));
      await tx.delete(studentMaster).where(eq(studentMaster.userId, user.id));
      await tx.delete(dosenList).where(eq(dosenList.userId, user.id));
      await tx.delete(weeklyEntries).where(eq(weeklyEntries.userId, user.id)); // cascades to weeklyStudents
      await tx.delete(assessmentForms).where(eq(assessmentForms.userId, user.id));
      await tx.delete(notes).where(eq(notes.userId, user.id));
      await tx.delete(examSchedules).where(eq(examSchedules.userId, user.id)); // cascades to entries/notes

      // c. Restore data from snapshot
      // Dosen List
      if (snapshot.dosenList && snapshot.dosenList.length > 0) {
        await tx.insert(dosenList).values(snapshot.dosenList.map(clean));
      }

      // Student Master
      if (snapshot.studentMaster && snapshot.studentMaster.length > 0) {
        await tx.insert(studentMaster).values(snapshot.studentMaster.map(clean));
      }

      // Schedule Templates
      if (snapshot.scheduleTemplates && snapshot.scheduleTemplates.length > 0) {
        await tx.insert(scheduleTemplates).values(snapshot.scheduleTemplates.map(clean));
      }

      // Weekly Entries & Weekly Students
      if (snapshot.weeklyEntries && snapshot.weeklyEntries.length > 0) {
        await tx.insert(weeklyEntries).values(snapshot.weeklyEntries.map(clean));
      }
      if (snapshot.weeklyStudents && snapshot.weeklyStudents.length > 0) {
        await tx.insert(weeklyStudents).values(snapshot.weeklyStudents.map(clean));
      }

      // Assessment Forms
      if (snapshot.assessmentForms && snapshot.assessmentForms.length > 0) {
        await tx.insert(assessmentForms).values(snapshot.assessmentForms.map(clean));
      }

      // Sticky Notes
      if (snapshot.notes && snapshot.notes.length > 0) {
        await tx.insert(notes).values(snapshot.notes.map(clean));
      }

      // Exam Schedules, entries, notes
      if (snapshot.examSchedules && snapshot.examSchedules.length > 0) {
        await tx.insert(examSchedules).values(snapshot.examSchedules.map(clean));
      }
      if (snapshot.examScheduleEntries && snapshot.examScheduleEntries.length > 0) {
        await tx.insert(examScheduleEntries).values(snapshot.examScheduleEntries.map(clean));
      }
      if (snapshot.examScheduleNotes && snapshot.examScheduleNotes.length > 0) {
        await tx.insert(examScheduleNotes).values(snapshot.examScheduleNotes.map(clean));
      }

      // d. Update active week and academic period
      const targetActiveWeek = snapshot.activeWeek ?? 1;
      const targetAcademicYear = snapshot.academicYear ?? "2025/2026";
      const targetAcademicSemester = snapshot.academicSemester ?? "Genap";
      await tx
        .insert(userData)
        .values({
          userId: user.id,
          activeWeek: targetActiveWeek,
          academicYear: targetAcademicYear,
          academicSemester: targetAcademicSemester,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userData.userId,
          set: {
            activeWeek: targetActiveWeek,
            academicYear: targetAcademicYear,
            academicSemester: targetAcademicSemester,
            updatedAt: new Date()
          },
        });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/archives/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
