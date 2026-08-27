import { NextResponse } from "next/server";
import { db, userData } from "@/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let record = await db.query.userData.findFirst({
      where: eq(userData.userId, user.id),
    });

    if (!record) {
      // Create default
      const [newRecord] = await db
        .insert(userData)
        .values({
          userId: user.id,
          activeWeek: 1,
        })
        .returning();
      record = newRecord;
    }

    return NextResponse.json({
      activeWeek: record.activeWeek,
      academicYear: record.academicYear || "2025/2026",
      academicSemester: record.academicSemester || "Genap",
    });
  } catch (error: any) {
    console.error("GET /api/user-data error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { activeWeek, academicYear, academicSemester } = await req.json();
    
    // Fetch existing preferences first to avoid overwriting with null
    const existing = await db.query.userData.findFirst({
      where: eq(userData.userId, user.id),
    });

    const targetWeek = typeof activeWeek === "number" && activeWeek >= 1 && activeWeek <= 16
      ? activeWeek
      : (existing?.activeWeek ?? 1);
    const targetYear = typeof academicYear === "string" && academicYear.trim()
      ? academicYear.trim()
      : (existing?.academicYear ?? "2025/2026");
    const targetSemester = typeof academicSemester === "string" && academicSemester.trim()
      ? academicSemester.trim()
      : (existing?.academicSemester ?? "Genap");

    const record = await db
      .insert(userData)
      .values({
        userId: user.id,
        activeWeek: targetWeek,
        academicYear: targetYear,
        academicSemester: targetSemester,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userData.userId,
        set: {
          activeWeek: targetWeek,
          academicYear: targetYear,
          academicSemester: targetSemester,
          updatedAt: new Date()
        },
      })
      .returning();

    return NextResponse.json({ success: true, data: record[0] });
  } catch (error: any) {
    console.error("POST /api/user-data error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
