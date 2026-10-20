import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/session";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const currentAdmin = await requireSuperAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "Akses ditolak. Khusus superadmin." }, { status: 403 });
  }

  try {
    const res = await db.execute(sql`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.banned, 
        u.ban_reason as "banReason", 
        u.created_at as "createdAt",
        u.updated_at as "updatedAt",
        COALESCE(st.count, 0)::int as "templateCount",
        COALESCE(we.count, 0)::int as "weeklyCount"
      FROM "user" u
      LEFT JOIN (SELECT user_id, count(*)::int as count FROM schedule_templates GROUP BY user_id) st ON st.user_id = u.id
      LEFT JOIN (SELECT user_id, count(*)::int as count FROM weekly_entries GROUP BY user_id) we ON we.user_id = u.id
      ORDER BY u.created_at ASC
    `);

    return NextResponse.json({ users: res.rows });
  } catch (err: any) {
    console.error("[GET /api/admin/users] Error:", err);
    return NextResponse.json({ error: err.message || "Gagal mengambil data user" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const currentAdmin = await requireSuperAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "Akses ditolak. Khusus superadmin." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role = "teknisi" } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Nama minimal 2 karakter." }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
    }

    const validRole = role === "superadmin" ? "superadmin" : "teknisi";

    const newUser = await auth.api.createUser({
      body: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: validRole,
      },
    });

    if (!newUser || !newUser.user) {
      return NextResponse.json({ error: "Gagal membuat akun user" }, { status: 400 });
    }

    // Ensure role is explicitly persisted in user table
    await db.execute(sql`
      UPDATE "user" SET role = ${validRole} WHERE id = ${newUser.user.id}
    `);

    // Audit log
    await db.insert(auditLogs).values({
      userId: currentAdmin.id,
      userName: currentAdmin.name,
      userEmail: currentAdmin.email,
      action: "USER_CREATE",
      target: newUser.user.id,
      details: {
        createdUserId: newUser.user.id,
        createdEmail: newUser.user.email,
        createdName: newUser.user.name,
        role: validRole,
      },
    });

    return NextResponse.json({
      success: true,
      user: { ...newUser.user, role: validRole },
    });
  } catch (err: any) {
    console.error("[POST /api/admin/users] Error:", err);
    const msg = err.body?.message || err.message || "Gagal membuat akun teknisi.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const currentAdmin = await requireSuperAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "Akses ditolak. Khusus superadmin." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "User ID diperlukan." }, { status: 400 });
    }

    if (action === "reset-password") {
      const { newPassword } = body;
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
        return NextResponse.json({ error: "Password baru minimal 6 karakter." }, { status: 400 });
      }

      await auth.api.setUserPassword({
        body: {
          userId,
          newPassword,
        },
      });

      await db.insert(auditLogs).values({
        userId: currentAdmin.id,
        userName: currentAdmin.name,
        userEmail: currentAdmin.email,
        action: "USER_RESET_PASSWORD",
        target: userId,
        details: { resetBy: currentAdmin.email },
      });

      return NextResponse.json({ success: true, message: "Password berhasil direset." });
    }

    if (action === "update-role") {
      const { role } = body;
      if (role !== "superadmin" && role !== "teknisi") {
        return NextResponse.json({ error: "Role tidak valid." }, { status: 400 });
      }

      await db.execute(sql`
        UPDATE "user" SET role = ${role} WHERE id = ${userId}
      `);

      await db.insert(auditLogs).values({
        userId: currentAdmin.id,
        userName: currentAdmin.name,
        userEmail: currentAdmin.email,
        action: "USER_UPDATE_ROLE",
        target: userId,
        details: { newRole: role },
      });

      return NextResponse.json({ success: true, message: `Role berhasil diubah menjadi ${role}.` });
    }

    if (action === "update-status") {
      const { banned, banReason } = body;

      if (userId === currentAdmin.id && banned) {
        return NextResponse.json({ error: "Tidak dapat menonaktifkan akun sendiri." }, { status: 400 });
      }

      if (banned) {
        await auth.api.banUser({
          body: {
            userId,
            banReason: banReason || "Dinonaktifkan oleh Super Admin",
          },
        });
      } else {
        await auth.api.unbanUser({
          body: {
            userId,
          },
        });
      }

      await db.insert(auditLogs).values({
        userId: currentAdmin.id,
        userName: currentAdmin.name,
        userEmail: currentAdmin.email,
        action: banned ? "USER_BAN" : "USER_UNBAN",
        target: userId,
        details: { banned, banReason },
      });

      return NextResponse.json({
        success: true,
        message: banned ? "Akun berhasil dinonaktifkan." : "Akun berhasil diaktifkan kembali.",
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (err: any) {
    console.error("[PATCH /api/admin/users] Error:", err);
    return NextResponse.json({ error: err.message || "Gagal memperbarui data user." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const currentAdmin = await requireSuperAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "Akses ditolak. Khusus superadmin." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID diperlukan." }, { status: 400 });
    }

    if (userId === currentAdmin.id) {
      return NextResponse.json({ error: "Tidak dapat menghapus akun Anda sendiri." }, { status: 400 });
    }

    await auth.api.removeUser({
      body: {
        userId,
      },
    });

    await db.insert(auditLogs).values({
      userId: currentAdmin.id,
      userName: currentAdmin.name,
      userEmail: currentAdmin.email,
      action: "USER_DELETE",
      target: userId,
      details: { deletedBy: currentAdmin.email },
    });

    return NextResponse.json({ success: true, message: "Akun berhasil dihapus." });
  } catch (err: any) {
    console.error("[DELETE /api/admin/users] Error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus user." }, { status: 500 });
  }
}
