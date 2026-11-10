import { NextResponse } from "next/server";
import { db, customSidebarItems } from "@/db";
import { eq, or, and, asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

function isValidSidebarHref(href: string): boolean {
  if (typeof href !== "string") return false;
  const trimmed = href.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

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

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanHref = typeof href === "string" ? href.trim() : "";

    if (!cleanTitle || !cleanHref) {
      return NextResponse.json({ error: "Title dan Href wajib diisi" }, { status: 400 });
    }

    if (!isValidSidebarHref(cleanHref)) {
      return NextResponse.json(
        { error: "URL tidak valid. Gunakan format path internal (/...) atau tautan web (https://...)" },
        { status: 400 }
      );
    }

    const isSuperAdmin = (user as any).role === "superadmin";
    const effectiveIsPrivate = isSuperAdmin ? Boolean(isPrivate) : true;

    const [newItem] = await db
      .insert(customSidebarItems)
      .values({
        userId: user.id,
        title: cleanTitle,
        href: cleanHref,
        icon: typeof icon === "string" ? icon.trim() : "Link",
        order: Number(order) || 0,
        isPrivate: effectiveIsPrivate,
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

    if (href !== undefined) {
      if (typeof href !== "string" || !isValidSidebarHref(href.trim())) {
        return NextResponse.json(
          { error: "URL tidak valid. Gunakan format path internal (/...) atau tautan web (https://...)" },
          { status: 400 }
        );
      }
    }

    const isSuperAdmin = (user as any).role === "superadmin";
    const effectiveIsPrivate = isPrivate !== undefined
      ? (isSuperAdmin ? Boolean(isPrivate) : true)
      : undefined;

    const [updated] = await db
      .update(customSidebarItems)
      .set({
        ...(title !== undefined && { title: String(title).trim() }),
        ...(href !== undefined && { href: String(href).trim() }),
        ...(icon !== undefined && { icon: String(icon).trim() }),
        ...(order !== undefined && { order: Number(order) }),
        ...(effectiveIsPrivate !== undefined && { isPrivate: effectiveIsPrivate }),
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
