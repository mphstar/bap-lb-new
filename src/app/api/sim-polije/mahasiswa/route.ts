import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

const API_TIMEOUT = 10000; // 10 seconds

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const baseUrl = process.env.SIM_POLIJE_API_URL;
    const apiKey = process.env.SIM_POLIJE_API_KEY;

    if (!baseUrl) {
      return NextResponse.json(
        { error: "SIM_POLIJE_API_URL belum dikonfigurasi di .env" },
        { status: 503 }
      );
    }

    // Forward query params and parse Jurusan if it contains program info (e.g., "14-4")
    const { searchParams } = new URL(req.url);
    const params = new URLSearchParams();
    
    let rawJurusan = searchParams.get("Jurusan") || "";
    let finalJurusan = rawJurusan;
    let finalProgram = searchParams.get("Program") || "";

    if (rawJurusan.includes("-")) {
      const parts = rawJurusan.split("-");
      finalJurusan = parts[0];
      if (!finalProgram && parts[1]) {
        finalProgram = parts[1];
      }
    } else if (rawJurusan.includes("_")) {
      const parts = rawJurusan.split("_");
      finalJurusan = parts[0];
      if (!finalProgram && parts[1]) {
        finalProgram = parts[1];
      }
    }

    // Default Program fallback if not provided or extracted
    if (!finalProgram) {
      finalProgram = "4";
    }

    for (const [key, value] of searchParams.entries()) {
      if (key === "Jurusan") {
        params.set("Jurusan", finalJurusan);
      } else if (key === "Program") {
        // Will set below
      } else {
        params.set(key, value);
      }
    }
    params.set("Program", finalProgram);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const res = await fetch(`${baseUrl}/api/mahasiswa?${params.toString()}`, {
        headers: {
          "x-api-key": apiKey || "",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
          { error: `API SIM Polije error: ${res.status}`, detail: text },
          { status: res.status }
        );
      }

      const data = await res.json();
      return NextResponse.json(data);
    } catch (fetchError: any) {
      clearTimeout(timeout);

      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          { error: "API SIM Polije timeout — server tidak merespon dalam 10 detik." },
          { status: 504 }
        );
      }

      return NextResponse.json(
        {
          error: "Tidak dapat terhubung ke API SIM Polije. Pastikan server berjalan.",
          detail: fetchError.message,
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error("GET /api/sim-polije/mahasiswa error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
