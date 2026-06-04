import { NextResponse } from "next/server";
import { db, studentMaster } from "@/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await db.query.studentMaster.findMany({
      where: eq(studentMaster.userId, user.id),
    });

    return NextResponse.json(list.map(s => ({ 
      nim: s.nim, 
      name: s.name,
      prodi: s.prodi,
      semester: s.semester,
      golongan: s.golongan
    })));
  } catch (error: any) {
    console.error("GET /api/student-master error:", error);
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

    await db.delete(studentMaster).where(eq(studentMaster.userId, user.id));

    if (list.length > 0) {
      const rows = list.map((s: any) => ({
        userId: user.id,
        nim: String(s.nim || ""),
        name: String(s.name || ""),
        prodi: String(s.prodi || ""),
        semester: String(s.semester || ""),
        golongan: String(s.golongan || ""),
      }));
      await db.insert(studentMaster).values(rows);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/student-master error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
