import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/session";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc, ilike, or, eq } from "drizzle-orm";

export async function GET(req: Request) {
  const currentAdmin = await requireSuperAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "Akses ditolak. Khusus superadmin." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const actionFilter = searchParams.get("action");
  const searchQuery = searchParams.get("search");

  try {
    let query = db.select().from(auditLogs);

    const conditions: any[] = [];

    if (actionFilter && actionFilter !== "all") {
      conditions.push(eq(auditLogs.action, actionFilter));
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const q = `%${searchQuery.trim()}%`;
      conditions.push(
        or(
          ilike(auditLogs.userName, q),
          ilike(auditLogs.userEmail, q),
          ilike(auditLogs.target, q),
          ilike(auditLogs.action, q)
        )
      );
    }

    const logs = await db.query.auditLogs.findMany({
      where: conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : undefined) : undefined,
      orderBy: [desc(auditLogs.createdAt)],
      limit: 150,
    });

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error("[GET /api/admin/audit-logs] Error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal memuat log audit" },
      { status: 500 }
    );
  }
}
