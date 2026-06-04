import { NextResponse } from "next/server";
import { db, scheduleTemplates } from "@/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await db.query.scheduleTemplates.findMany({
      where: eq(scheduleTemplates.userId, user.id),
      orderBy: (templates, { asc }) => [asc(templates.no)],
    });

    return NextResponse.json(templates);
  } catch (error: any) {
    console.error("GET /api/schedule-templates error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const entries = Array.isArray(body) ? body : [];

    // Delete existing template entries for this user
    await db.delete(scheduleTemplates).where(eq(scheduleTemplates.userId, user.id));

    if (entries.length > 0) {
      // Map templates to Drizzle database structure
      const rows = entries.map((t: any) => ({
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

      const inserted = await db.insert(scheduleTemplates).values(rows).returning();
      return NextResponse.json(inserted);
    }

    return NextResponse.json([]);
  } catch (error: any) {
    console.error("POST /api/schedule-templates error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.delete(scheduleTemplates).where(eq(scheduleTemplates.userId, user.id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/schedule-templates error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
