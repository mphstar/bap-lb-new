import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

const API_TIMEOUT = 5000; // 5 seconds

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year || !month) {
      return NextResponse.json([]);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const res = await fetch(`https://api-hari-libur.vercel.app/api?year=${year}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const rawHolidays = json.data || [];
        
        // Map and filter by month
        const mapped = rawHolidays
          .map((h: any) => ({
            date: String(h.date || ""),
            name: String(h.description || ""),
          }))
          .filter((h: any) => {
            if (!h.date) return false;
            const parts = h.date.split("-");
            if (parts.length < 2) return false;
            return Number(parts[1]) === Number(month);
          });
          
        return NextResponse.json(mapped);
      }
      
      return NextResponse.json([]);
    } catch (fetchError) {
      clearTimeout(timeout);
      console.warn("External holiday API fetch failed, returning empty array:", fetchError);
      return NextResponse.json([]);
    }
  } catch (error: any) {
    console.error("GET /api/holidays error:", error);
    return NextResponse.json([]);
  }
}
