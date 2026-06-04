import { NextResponse } from "next/server";
import { db, examScheduleNotes } from "@/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get("entryId");

    if (!entryId) {
      return NextResponse.json({ error: "entryId is required" }, { status: 400 });
    }

    const list = await db.query.examScheduleNotes.findMany({
      where: and(
        eq(examScheduleNotes.entryId, entryId),
        eq(examScheduleNotes.userId, user.id)
      ),
      orderBy: (esn, { desc }) => [desc(esn.createdAt)],
    });

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("GET /api/exams/notes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId, content } = await req.json();

    if (!entryId) {
      return NextResponse.json({ error: "entryId is required" }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const [newNote] = await db
      .insert(examScheduleNotes)
      .values({
        entryId,
        userId: user.id,
        content,
      })
      .returning();

    return NextResponse.json(newNote);
  } catch (error: any) {
    console.error("POST /api/exams/notes error:", error);
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
      .delete(examScheduleNotes)
      .where(and(
        eq(examScheduleNotes.id, id),
        eq(examScheduleNotes.userId, user.id)
      ));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/exams/notes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
