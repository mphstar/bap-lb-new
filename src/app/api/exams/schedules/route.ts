import { NextResponse } from "next/server";
import { db, examSchedules } from "@/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await db.query.examSchedules.findMany({
      where: eq(examSchedules.userId, user.id),
      orderBy: (es, { desc }) => [desc(es.createdAt)],
    });

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("GET /api/exams/schedules error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [newSchedule] = await db
      .insert(examSchedules)
      .values({
        userId: user.id,
        name,
      })
      .returning();

    return NextResponse.json(newSchedule);
  } catch (error: any) {
    console.error("POST /api/exams/schedules error:", error);
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
      .delete(examSchedules)
      .where(and(eq(examSchedules.id, id), eq(examSchedules.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/exams/schedules error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
