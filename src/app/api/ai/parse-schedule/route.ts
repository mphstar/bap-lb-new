import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getGeminiClient, generateContentWithFallback } from "@/lib/gemini";
import { isDeepSeekConfigured, parseScheduleWithDeepSeek } from "@/lib/deepseek";
import { Type } from "@google/genai";

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

    // Check if primary provider is specified or try Gemini first
    const preferredProvider = process.env.AI_PROVIDER?.toLowerCase();

    if (preferredProvider === "deepseek" && isDeepSeekConfigured()) {
      try {
        const data = await parseScheduleWithDeepSeek(rawText);
        return NextResponse.json({ success: true, data, provider: "deepseek" });
      } catch (dsErr: any) {
        console.error("DeepSeek primary parse error:", dsErr);
      }
    }

    // Try Gemini
    let geminiError: any = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();

        const prompt = `Anda adalah asisten data akademik profesional. Ekstrak data jadwal perkuliahan / praktikum dari teks tidak terstruktur berikut ke dalam daftar objek jadwal terstruktur.

Instruksi Parsing:
1. Normalisasi nama hari ke bahasa Indonesia standar: "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu". Jika tidak disebutkan, biarkan kosong ("") atau sesuaikan dengan konteks.
2. Normalisasi format jam: contoh "07.00 - 09.00" atau "07:00-09:30".
3. Pisahkan semester (misal: "2", "4", "6", "Genap"), golongan/kelas (misal: "A", "B", "C", "A/B"), program studi ("TIF", "MIF", "TKK", dll), ruangan/tempat (misal: "Lab AI", "Lab RPL", "Ruang 301"), nama pengajar/dosen, dan nama teknisi jika ada.
4. Jika salah satu kolom tidak ditemukan di teks, isi dengan string kosong ("").
5. Jika ada beberapa baris atau sesi jadwal dalam teks, ekstrak semuanya secara urut.

Teks mentah untuk diekstrak:
"""
${rawText}
"""`;

        const { response, usedModel } = await generateContentWithFallback(ai, {
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              description: "Daftar jadwal yang berhasil diekstrak",
              items: {
                type: Type.OBJECT,
                properties: {
                  mataKuliah: { type: Type.STRING },
                  hari: { type: Type.STRING },
                  jam: { type: Type.STRING },
                  tempat: { type: Type.STRING },
                  prodi: { type: Type.STRING },
                  semester: { type: Type.STRING },
                  golongan: { type: Type.STRING },
                  defaultPengajar: { type: Type.STRING },
                  defaultTeknisi: { type: Type.STRING },
                },
                required: ["mataKuliah", "hari", "jam"],
              },
            },
          },
        });

        const parsed = JSON.parse(response.text || "[]");
        return NextResponse.json({
          success: true,
          data: parsed,
          provider: `gemini (${usedModel})`,
        });
      } catch (err: any) {
        console.warn("Gemini parse failed, attempting DeepSeek fallback...", err.message);
        geminiError = err;
      }
    }

    // Fallback to DeepSeek if configured
    if (isDeepSeekConfigured()) {
      try {
        const data = await parseScheduleWithDeepSeek(rawText);
        return NextResponse.json({ success: true, data, provider: "deepseek (fallback)" });
      } catch (dsErr: any) {
        console.error("DeepSeek fallback parse error:", dsErr);
        throw dsErr;
      }
    }

    if (geminiError) {
      throw geminiError;
    }

    throw new Error("Tidak ada AI provider yang aktif. Silakan atur GEMINI_API_KEY atau DEEPSEEK_API_KEY di file .env.");
  } catch (error: any) {
    console.error("POST /api/ai/parse-schedule error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Gagal memproses data dengan AI. Pastikan GEMINI_API_KEY atau DEEPSEEK_API_KEY valid.",
      },
      { status: 500 }
    );
  }
}
