import { NextResponse } from "next/server";
import { db, assessmentForms } from "@/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const forms = await db.query.assessmentForms.findMany({
      where: eq(assessmentForms.userId, user.id),
    });

    const structuredForms = forms.map(f => {
      const data = typeof f.data === "string" ? JSON.parse(f.data) : f.data;
      return {
        id: f.formId,
        name: f.name,
        students: data.students || [],
        subjects: data.subjects || [],
        grades: data.grades || {},
      };
    });

    return NextResponse.json(structuredForms);
  } catch (error: any) {
    console.error("GET /api/assessment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const forms = await req.json();
    const formsList = Array.isArray(forms) ? forms : [];

    await db.transaction(async (tx) => {
      // Delete existing assessment forms for this user
      await tx.delete(assessmentForms).where(eq(assessmentForms.userId, user.id));

      if (formsList.length > 0) {
        const rows = formsList.map(f => ({
          userId: user.id,
          formId: f.id,
          name: f.name || "Form Penilaian",
          data: {
            students: f.students || [],
            subjects: f.subjects || [],
            grades: f.grades || {},
          },
          updatedAt: new Date(),
        }));

        await tx.insert(assessmentForms).values(rows);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/assessment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
