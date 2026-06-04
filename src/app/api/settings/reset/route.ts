import { NextResponse } from "next/server";
import { db, userData, scheduleTemplates, dosenList, studentMaster, weeklyEntries, assessmentForms, notes, examSchedules } from "@/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.transaction(async (tx) => {
      // 1. Delete preferences
      await tx.delete(userData).where(eq(userData.userId, user.id));

      // 2. Delete schedule templates
      await tx.delete(scheduleTemplates).where(eq(scheduleTemplates.userId, user.id));

      // 3. Delete dosen list
      await tx.delete(dosenList).where(eq(dosenList.userId, user.id));

      // 4. Delete student master
      await tx.delete(studentMaster).where(eq(studentMaster.userId, user.id));

      // 5. Delete weekly entries (cascades to weekly students)
      await tx.delete(weeklyEntries).where(eq(weeklyEntries.userId, user.id));

      // 6. Delete assessment forms
      await tx.delete(assessmentForms).where(eq(assessmentForms.userId, user.id));

      // 7. Delete notes
      await tx.delete(notes).where(eq(notes.userId, user.id));

      // 8. Delete exam schedules (cascades to exam schedule entries and exam schedule notes)
      await tx.delete(examSchedules).where(eq(examSchedules.userId, user.id));
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/settings/reset error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
