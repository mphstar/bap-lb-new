import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/session";
import { db } from "@/db";
import {
  user,
  userData,
  scheduleTemplates,
  weeklyEntries,
  weeklyStudents,
  dosenList,
  studentMaster,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const currentAdmin = await requireSuperAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "Akses ditolak. Khusus superadmin." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");

  try {
    // -------------------------------------------------------------
    // Detailed Mode: Return full data for a specific technician
    // -------------------------------------------------------------
    if (targetUserId) {
      const targetUser = await db.query.user.findFirst({
        where: eq(user.id, targetUserId),
      });

      if (!targetUser) {
        return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
      }

      const [pref, templates, entries, dosens, students] = await Promise.all([
        db.query.userData.findFirst({
          where: eq(userData.userId, targetUserId),
        }),
        db.query.scheduleTemplates.findMany({
          where: eq(scheduleTemplates.userId, targetUserId),
          orderBy: (st, { asc }) => [asc(st.no)],
        }),
        db.query.weeklyEntries.findMany({
          where: eq(weeklyEntries.userId, targetUserId),
          orderBy: (we, { asc }) => [asc(we.weekNumber)],
        }),
        db.query.dosenList.findMany({
          where: eq(dosenList.userId, targetUserId),
        }),
        db.query.studentMaster.findMany({
          where: eq(studentMaster.userId, targetUserId),
        }),
      ]);

      // Calculate weekly completion per week 1..16
      const weekStats: Record<number, { filled: number; total: number }> = {};
      for (let w = 1; w <= 16; w++) {
        weekStats[w] = { filled: 0, total: templates.length };
      }

      for (const entry of entries) {
        if (weekStats[entry.weekNumber]) {
          if (entry.materi && entry.materi.trim() !== "") {
            weekStats[entry.weekNumber].filled += 1;
          }
        }
      }

      return NextResponse.json({
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          banned: targetUser.banned,
        },
        preferences: pref || {
          activeWeek: 1,
          academicYear: "2025/2026",
          academicSemester: "Genap",
          teknisiSignature: null,
        },
        templates: templates.map((t) => ({
          id: t.scheduleId,
          no: t.no,
          mataKuliah: t.mataKuliah,
          hari: t.hari,
          tempat: t.tempat,
          jam: t.jam,
          prodi: t.prodi,
          semester: t.semester,
          golongan: t.golongan,
          defaultPengajar: t.defaultPengajar,
          defaultTeknisi: t.defaultTeknisi,
        })),
        weeklyEntries: entries.map((e) => ({
          id: e.id,
          weekNumber: e.weekNumber,
          scheduleId: e.scheduleId,
          pengajar: e.pengajar,
          materi: e.materi,
          tanggal: e.tanggal,
          teknisi: e.teknisi,
          updatedAt: e.updatedAt,
        })),
        dosenList: dosens.map((d) => ({
          id: d.id,
          name: d.name,
          hasSignature: Boolean(d.signature),
        })),
        studentCount: students.length,
        weekStats,
      });
    }

    // -------------------------------------------------------------
    // Overview Mode: Return aggregated stats for all technicians
    // -------------------------------------------------------------
    const techniciansRes = await db.execute(sql`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.banned,
        COALESCE(ud.active_week, 1) as "activeWeek",
        COALESCE(ud.academic_year, '2025/2026') as "academicYear",
        COALESCE(ud.academic_semester, 'Genap') as "academicSemester",
        (ud.teknisi_signature IS NOT NULL AND ud.teknisi_signature <> '') as "hasSignature",
        COALESCE(st.count, 0)::int as "totalTemplates",
        COALESCE(we.count, 0)::int as "totalWeeklyEntries",
        COALESCE(d.count, 0)::int as "totalDosen",
        COALESCE(sm.count, 0)::int as "totalStudents"
      FROM "user" u
      LEFT JOIN user_data ud ON ud.user_id = u.id
      LEFT JOIN (SELECT user_id, count(*)::int as count FROM schedule_templates GROUP BY user_id) st ON st.user_id = u.id
      LEFT JOIN (SELECT user_id, count(*)::int as count FROM weekly_entries GROUP BY user_id) we ON we.user_id = u.id
      LEFT JOIN (SELECT user_id, count(*)::int as count FROM dosen_list GROUP BY user_id) d ON d.user_id = u.id
      LEFT JOIN (SELECT user_id, count(*)::int as count FROM student_master GROUP BY user_id) sm ON sm.user_id = u.id
      ORDER BY u.role DESC, u.name ASC
    `);

    // Also get breakdown of entries per user per week to show compliance
    const weekBreakdown = await db.execute(sql`
      SELECT 
        user_id as "userId",
        week_number as "weekNumber",
        COUNT(id)::int as "filledCount"
      FROM weekly_entries
      WHERE materi IS NOT NULL AND TRIM(materi) <> ''
      GROUP BY user_id, week_number
    `);

    const userWeekMap: Record<string, Record<number, number>> = {};
    for (const row of weekBreakdown.rows as any[]) {
      if (!userWeekMap[row.userId]) {
        userWeekMap[row.userId] = {};
      }
      userWeekMap[row.userId][row.weekNumber] = row.filledCount;
    }

    const technicians = (techniciansRes.rows as any[]).map((t) => {
      const weeksFilled = userWeekMap[t.id] || {};
      const activeWeekFilled = weeksFilled[t.activeWeek] || 0;
      const completionRate =
        t.totalTemplates > 0
          ? Math.min(100, Math.round((activeWeekFilled / t.totalTemplates) * 100))
          : 0;

      return {
        ...t,
        activeWeekFilled,
        completionRate,
        weeksFilled,
      };
    });

    return NextResponse.json({
      technicians,
      totalCount: technicians.length,
    });
  } catch (err: any) {
    console.error("[GET /api/admin/monitoring] Error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal memuat data monitoring BAP" },
      { status: 500 }
    );
  }
}
