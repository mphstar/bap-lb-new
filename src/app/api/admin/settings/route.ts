import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/session";
import { db, systemSettings, auditLogs } from "@/db";
import { eq } from "drizzle-orm";
import { clearAIConfigCache, getAIConfig, validateAIBaseUrl } from "@/lib/ai";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Akses ditolak: Hanya Superadmin yang diizinkan." }, { status: 403 });
    }

    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "ai_config"))
      .limit(1);

    if (row && row.value && typeof row.value === "object") {
      const val = row.value as { baseUrl?: string; apiKey?: string; model?: string };
      return NextResponse.json({
        success: true,
        config: {
          baseUrl: val.baseUrl || "",
          apiKey: val.apiKey || "", // Superadmin can see/edit the key
          model: val.model || "gpt-4o-mini",
          source: "database",
          updatedAt: row.updatedAt,
        },
      });
    }

    // Default or env fallback
    const activeConfig = await getAIConfig();
    return NextResponse.json({
      success: true,
      config: {
        baseUrl: activeConfig.baseUrl,
        apiKey: activeConfig.apiKey,
        model: activeConfig.model,
        source: activeConfig.source,
        updatedAt: null,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/settings error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat pengaturan." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Akses ditolak: Hanya Superadmin yang diizinkan." }, { status: 403 });
    }
    const body = await req.json();

    const { baseUrl, apiKey, model } = body;

    const validation = validateAIBaseUrl(baseUrl);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "API Endpoint Base URL tidak valid." },
        { status: 400 }
      );
    }

    const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, "");
    const cleanApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
    const cleanModel = typeof model === "string" && model.trim() ? model.trim() : "gpt-4o-mini";

    const configValue = {
      baseUrl: cleanBaseUrl,
      apiKey: cleanApiKey,
      model: cleanModel,
    };

    // Upsert into system_settings
    await db
      .insert(systemSettings)
      .values({
        key: "ai_config",
        value: configValue,
        updatedAt: new Date(),
        updatedBy: admin.id,
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: configValue,
          updatedAt: new Date(),
          updatedBy: admin.id,
        },
      });

    // Invalidate in-memory cache
    clearAIConfigCache();

    // Record audit log
    const maskedKey = cleanApiKey ? `${cleanApiKey.slice(0, 4)}...${cleanApiKey.slice(-4)}` : "empty";
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    await db.insert(auditLogs).values({
      userId: admin.id,
      userName: admin.name,
      userEmail: admin.email,
      action: "SETTINGS_AI_UPDATE",
      target: "system_settings.ai_config",
      details: {
        baseUrl: cleanBaseUrl,
        model: cleanModel,
        apiKeyMasked: maskedKey,
      },
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Pengaturan AI OpenAI-compatible berhasil disimpan dan aktif secara global.",
      config: {
        baseUrl: cleanBaseUrl,
        apiKey: cleanApiKey,
        model: cleanModel,
        source: "database",
      },
    });
  } catch (err: any) {
    if (err.message === "Unauthorized" || err.message === "Forbidden") {
      return NextResponse.json({ error: "Akses ditolak: Hanya Superadmin yang diizinkan." }, { status: 403 });
    }
    console.error("POST /api/admin/settings error:", err);
    return NextResponse.json({ error: err.message || "Gagal menyimpan pengaturan." }, { status: 500 });
  }
}
