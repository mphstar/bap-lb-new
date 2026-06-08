import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

const API_TIMEOUT = 15000; // 15 seconds for batch scraping

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

    const { searchParams } = new URL(req.url);
    const params = new URLSearchParams();
    
    // Copy all query parameters
    for (const [key, value] of searchParams.entries()) {
      params.set(key, value);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const res = await fetch(`${baseUrl}/api/jadwal/batch?${params.toString()}`, {
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
          { error: "API SIM Polije timeout — server tidak merespon dalam 15 detik." },
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
    console.error("GET /api/sim-polije/jadwal/batch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
