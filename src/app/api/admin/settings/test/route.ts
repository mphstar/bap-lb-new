import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/session";
import { testAIConnection, getAIConfig } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Akses ditolak: Hanya Superadmin yang diizinkan." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));

    let { baseUrl, apiKey, model } = body;

    // Fallback to saved config if omitted
    if (!baseUrl || !baseUrl.trim()) {
      const current = await getAIConfig();
      baseUrl = current.baseUrl;
      if (!apiKey) apiKey = current.apiKey;
      if (!model) model = current.model;
    }

    if (!baseUrl || !baseUrl.trim()) {
      return NextResponse.json({ error: "Base URL endpoint wajib diisi untuk uji koneksi." }, { status: 400 });
    }

    const result = await testAIConnection({
      baseUrl,
      apiKey: apiKey || "",
      model: model || "gpt-4o-mini",
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    if (err.message === "Unauthorized" || err.message === "Forbidden") {
      return NextResponse.json({ error: "Akses ditolak: Hanya Superadmin yang diizinkan." }, { status: 403 });
    }
    console.error("POST /api/admin/settings/test error:", err);
    return NextResponse.json(
      { error: err.message || "Uji koneksi gagal dilakukan." },
      { status: 500 }
    );
  }
}
