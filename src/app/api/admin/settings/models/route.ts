import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/session";
import { fetchAvailableModels, getAIConfig } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Akses ditolak: Hanya Superadmin yang diizinkan." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));

    let { baseUrl, apiKey } = body;

    // If not provided in body, fallback to saved config
    if (!baseUrl || !baseUrl.trim()) {
      const current = await getAIConfig();
      baseUrl = current.baseUrl;
      if (!apiKey) apiKey = current.apiKey;
    }

    if (!baseUrl || !baseUrl.trim()) {
      return NextResponse.json(
        { error: "Base URL endpoint wajib diisi untuk menarik daftar model." },
        { status: 400 }
      );
    }

    const models = await fetchAvailableModels(baseUrl, apiKey || "");

    return NextResponse.json({
      success: true,
      total: models.length,
      models,
    });
  } catch (err: any) {
    if (err.message === "Unauthorized" || err.message === "Forbidden") {
      return NextResponse.json({ error: "Akses ditolak: Hanya Superadmin yang diizinkan." }, { status: 403 });
    }
    console.error("POST /api/admin/settings/models error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal menarik daftar model dari endpoint." },
      { status: 500 }
    );
  }
}
