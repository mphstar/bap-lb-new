import { NextResponse } from "next/server";
import { db, dosenList } from "@/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await db.query.dosenList.findMany({
      where: eq(dosenList.userId, user.id),
    });

    return NextResponse.json(list.map(d => ({
      id: d.id,
      name: d.name,
      signature: d.signature || "",
    })));
  } catch (error: any) {
    console.error("GET /api/dosen-list error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, signature } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID dosen wajib disertakan" }, { status: 400 });
    }

    const existing = await db.query.dosenList.findFirst({
      where: and(
        eq(dosenList.id, id),
        eq(dosenList.userId, user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Dosen tidak ditemukan" }, { status: 404 });
    }

    const updatePayload: { name?: string; signature?: string } = {};
    if (typeof name === "string") {
      updatePayload.name = name.trim();
    }
    if (typeof signature === "string") {
      updatePayload.signature = signature;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({
        id: existing.id,
        name: existing.name,
        signature: existing.signature || "",
      });
    }

    const [updated] = await db
      .update(dosenList)
      .set(updatePayload)
      .where(and(eq(dosenList.id, id), eq(dosenList.userId, user.id)))
      .returning();

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      signature: updated.signature || "",
    });
  } catch (error: any) {
    console.error("PATCH /api/dosen-list error:", error);
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
      return NextResponse.json({ error: "ID dosen wajib disertakan" }, { status: 400 });
    }

    const deleted = await db
      .delete(dosenList)
      .where(and(eq(dosenList.id, id), eq(dosenList.userId, user.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Dosen tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("DELETE /api/dosen-list error:", error);
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
    const list = Array.isArray(body) ? body : [];

    const existingDosen = await db.query.dosenList.findMany({
      where: eq(dosenList.userId, user.id),
    });

    const isUUID = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

    const savedIds: string[] = [];

    for (const d of list) {
      const id = d.id && isUUID(d.id) ? d.id : undefined;
      const name = typeof d === "string" ? d : String(d.name || "").trim();
      const signature = typeof d === "string" ? "" : (d.signature !== undefined ? String(d.signature || "") : undefined);

      if (!name) continue;

      if (id) {
        const match = existingDosen.find(e => e.id === id);
        if (match) {
          const [updated] = await db
            .update(dosenList)
            .set({
              name,
              ...(signature !== undefined ? { signature } : {}),
            })
            .where(and(eq(dosenList.id, id), eq(dosenList.userId, user.id)))
            .returning();
          if (updated) savedIds.push(updated.id);
          continue;
        }
      }

      const matchByName = existingDosen.find(
        e => e.name.trim().toLowerCase() === name.toLowerCase()
      );

      if (matchByName) {
        const updatePayload: { name: string; signature?: string } = { name };
        if (signature !== undefined && signature.trim() !== "") {
          updatePayload.signature = signature;
        }
        const [updated] = await db
          .update(dosenList)
          .set(updatePayload)
          .where(and(eq(dosenList.id, matchByName.id), eq(dosenList.userId, user.id)))
          .returning();
        if (updated) savedIds.push(updated.id);
      } else {
        const [inserted] = await db
          .insert(dosenList)
          .values({
            userId: user.id,
            name,
            signature: signature || "",
          })
          .returning();
        if (inserted) savedIds.push(inserted.id);
      }
    }

    return NextResponse.json({ success: true, savedIds });
  } catch (error: any) {
    console.error("POST /api/dosen-list error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
