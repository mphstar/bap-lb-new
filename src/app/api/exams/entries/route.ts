import { NextResponse } from "next/server";
import { db, examScheduleEntries } from "@/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get("scheduleId");

    if (!scheduleId) {
      return NextResponse.json({ error: "scheduleId is required" }, { status: 400 });
    }

    const list = await db.query.examScheduleEntries.findMany({
      where: and(
        eq(examScheduleEntries.examScheduleId, scheduleId),
        eq(examScheduleEntries.userId, user.id)
      ),
      orderBy: (ese, { asc }) => [asc(ese.hari), asc(ese.jam)],
    });

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("GET /api/exams/entries error:", error);
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
    const { scheduleId, hari, tanggal, jam, semester, golongan, kodeMk, mataKuliah, ruang } = body;

    if (!scheduleId) {
      return NextResponse.json({ error: "scheduleId is required" }, { status: 400 });
    }

    const [newEntry] = await db
      .insert(examScheduleEntries)
      .values({
        examScheduleId: scheduleId,
        userId: user.id,
        hari: hari || "",
        tanggal: tanggal || "",
        jam: jam || "",
        semester: semester || "",
        golongan: golongan || "",
        kodeMk: kodeMk || "",
        mataKuliah: mataKuliah || "",
        ruang: ruang || "",
      })
      .returning();

    return NextResponse.json(newEntry);
  } catch (error: any) {
    console.error("POST /api/exams/entries error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Map frontend fields (e.g. kode_mk, mata_kuliah) to Drizzle schema camelCase equivalents
    const dbUpdates: any = {
      updatedAt: new Date(),
    };
    if (updates.hari !== undefined) dbUpdates.hari = updates.hari;
    if (updates.tanggal !== undefined) dbUpdates.tanggal = updates.tanggal;
    if (updates.jam !== undefined) dbUpdates.jam = updates.jam;
    if (updates.semester !== undefined) dbUpdates.semester = updates.semester;
    if (updates.golongan !== undefined) dbUpdates.golongan = updates.golongan;
    if (updates.kodeMk !== undefined) dbUpdates.kodeMk = updates.kodeMk;
    if (updates.kode_mk !== undefined) dbUpdates.kodeMk = updates.kode_mk;
    if (updates.mataKuliah !== undefined) dbUpdates.mataKuliah = updates.mataKuliah;
    if (updates.mata_kuliah !== undefined) dbUpdates.mataKuliah = updates.mata_kuliah;
    if (updates.ruang !== undefined) dbUpdates.ruang = updates.ruang;

    const [updatedEntry] = await db
      .update(examScheduleEntries)
      .set(dbUpdates)
      .where(and(
        eq(examScheduleEntries.id, id),
        eq(examScheduleEntries.userId, user.id)
      ))
      .returning();

    if (!updatedEntry) {
      return NextResponse.json({ error: "Entry not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(updatedEntry);
  } catch (error: any) {
    console.error("PUT /api/exams/entries error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db
      .delete(examScheduleEntries)
      .where(and(
        eq(examScheduleEntries.id, id),
        eq(examScheduleEntries.userId, user.id)
      ));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/exams/entries error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
