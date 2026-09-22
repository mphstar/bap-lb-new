import { NextResponse } from "next/server";
import { db, customSidebarItems } from "@/db";
import { eq, or, and, asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch items that are public (isPrivate == false) OR created by current user
    const list = await db.query.customSidebarItems.findMany({
      where: or(
        eq(customSidebarItems.isPrivate, false),
        eq(customSidebarItems.userId, user.id)
      ),
      orderBy: [asc(customSidebarItems.order), asc(customSidebarItems.createdAt)],
    });

    return NextResponse.json(
      list.map((item) => ({
        ...item,
        isOwner: item.userId === user.id,
      }))
    );
  } catch (error: any) {
    console.error("GET /api/custom-sidebar error:", error);
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
    const { title, href, icon = "Link", order = 0, isPrivate = false } = body;

    if (!title || !href) {
      return NextResponse.json({ error: "Title dan Href wajib diisi" }, { status: 400 });
    }

    const [newItem] = await db
      .insert(customSidebarItems)
      .values({
        userId: user.id,
        title: title.trim(),
        href: href.trim(),
        icon: icon.trim(),
        order: Number(order) || 0,
        isPrivate: Boolean(isPrivate),
      })
      .returning();

    return NextResponse.json({ ...newItem, isOwner: true });
  } catch (error: any) {
    console.error("POST /api/custom-sidebar error:", error);
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
    const { id, title, href, icon, order, isPrivate } = body;

    if (!id) {
      return NextResponse.json({ error: "ID wajib disertakan" }, { status: 400 });
    }

    const [updated] = await db
      .update(customSidebarItems)
      .set({
        ...(title !== undefined && { title: title.trim() }),
        ...(href !== undefined && { href: href.trim() }),
        ...(icon !== undefined && { icon: icon.trim() }),
        ...(order !== undefined && { order: Number(order) }),
        ...(isPrivate !== undefined && { isPrivate: Boolean(isPrivate) }),
        updatedAt: new Date(),
      })
      .where(and(eq(customSidebarItems.id, id), eq(customSidebarItems.userId, user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Menu tidak ditemukan atau bukan milik Anda" }, { status: 404 });
    }

    return NextResponse.json({ ...updated, isOwner: true });
  } catch (error: any) {
    console.error("PUT /api/custom-sidebar error:", error);
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
      return NextResponse.json({ error: "ID wajib disertakan" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(customSidebarItems)
      .where(and(eq(customSidebarItems.id, id), eq(customSidebarItems.userId, user.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Menu tidak ditemukan atau bukan milik Anda" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("DELETE /api/custom-sidebar error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
