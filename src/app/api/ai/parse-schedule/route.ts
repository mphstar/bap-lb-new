import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isAIConfigured, parseScheduleWithAI } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rawText } = await req.json();
    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json(
        { error: "Teks jadwal tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (!isAIConfigured()) {
      throw new Error(
        "Tidak ada AI provider yang aktif. Silakan atur OPENAI_API_KEY di file .env."
      );
    }

    const data = await parseScheduleWithAI(rawText);
    return NextResponse.json({
      success: true,
      data,
      provider: `openai (${process.env.OPENAI_MODEL || "default"})`,
    });
  } catch (error: any) {
    console.error("POST /api/ai/parse-schedule error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Gagal memproses data dengan AI. Pastikan OPENAI_API_KEY valid.",
      },
      { status: 500 }
    );
  }
}
