import { NextResponse } from "next/server";
import { db, notes } from "@/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await db.query.notes.findMany({
      where: eq(notes.userId, user.id),
      orderBy: (n, { desc }) => [desc(n.pinned), desc(n.updatedAt)],
    });

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("GET /api/notes error:", error);
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
    const { title = "Catatan Tanpa Judul", content = "", color = "default", pinned = false } = body;

    const [newNote] = await db
      .insert(notes)
      .values({
        userId: user.id,
        title,
        content,
        color,
        pinned,
      })
      .returning();

    return NextResponse.json(newNote);
  } catch (error: any) {
    console.error("POST /api/notes error:", error);
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
      return NextResponse.json({ error: "Note ID is required" }, { status: 400 });
    }

    const [updatedNote] = await db
      .update(notes)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
      .returning();

    if (!updatedNote) {
      return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(updatedNote);
  } catch (error: any) {
    console.error("PUT /api/notes error:", error);
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
      return NextResponse.json({ error: "Note ID is required" }, { status: 400 });
    }

    const deleted = await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/notes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
