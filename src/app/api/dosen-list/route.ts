import { NextResponse } from "next/server";
import { db, dosenList } from "@/db";
import { eq } from "drizzle-orm";
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

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const list = Array.isArray(body) ? body : [];

    await db.delete(dosenList).where(eq(dosenList.userId, user.id));

    if (list.length > 0) {
      const rows = list.map((d: any) => {
        const name = typeof d === 'string' ? d : String(d.name || "");
        const signature = typeof d === 'string' ? "" : String(d.signature || "");
        return {
          userId: user.id,
          name,
          signature,
        };
      });
      await db.insert(dosenList).values(rows);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/dosen-list error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
