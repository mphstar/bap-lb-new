export interface WeeklyScope {
  mataKuliah?: string;
  prodi?: string;
  semester?: string;
  golongan?: string;
}

export interface WeeklyTemplate {
  scheduleId: string;
  mataKuliah: string;
  prodi: string;
  semester: string;
  golongan: string;
  hari: string;
  jam: string;
  no: number;
}

export interface WeekInput {
  weekNumber: number;
  materi?: string;
  pengampu?: Record<string, string | string[]>;
}

export interface WeeklyPatch {
  weekNumber: number;
  scheduleId: string;
  materi?: string;
  pengajar?: string;
}

/** Helper matching input name against master dosen list (e.g., "Elly" -> "Elly Antika, ST, M.Kom") */
export function matchDosenName(inputName: string, masterDosenList: { name: string }[]): string {
  const trimmed = inputName.trim();
  if (!trimmed || masterDosenList.length === 0) return trimmed;

  const inputLower = trimmed.toLowerCase();

  // 1. Exact match
  const exact = masterDosenList.find((d) => d.name.trim().toLowerCase() === inputLower);
  if (exact) return exact.name;

  // 2. Fuzzy match: check if master name starts with input or contains input word
  const match = masterDosenList.find((d) => {
    const dLower = d.name.toLowerCase();
    // Match word boundary or prefix (e.g. "Elly" in "Elly Antika, ST, M.Kom")
    const words = dLower.split(/[\s,.]+/).filter(Boolean);
    return words.some((w) => w === inputLower || w.startsWith(inputLower));
  });

  return match ? match.name : trimmed;
}

const DAY_RANK: Record<string, number> = {
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  sabtu: 6,
  minggu: 7,
};

export const norm = (s: unknown) =>
  String(s ?? "").trim().toUpperCase().replace(/\s+/g, "");

export function buildWeeklyPatches(
  templates: WeeklyTemplate[],
  scope: WeeklyScope,
  weeks: WeekInput[],
  dosenList: { name: string }[] = []
): { patches: WeeklyPatch[]; unmatched: any[]; scopedSchedules: number } {
  const scopeMataKuliah = norm(scope.mataKuliah);
  const scopeProdi = norm(scope.prodi);
  const scopeSemester = norm(scope.semester);
  const scopeGolongan = norm(scope.golongan);

  if (!scopeMataKuliah && !scopeProdi && !scopeSemester && !scopeGolongan) {
    throw new Error(
      "Cakupan jadwal wajib diisi. Tentukan minimal salah satu dari mataKuliah, prodi, semester, atau golongan."
    );
  }

  const scopedTemplates = templates.filter((t) => {
    if (scopeMataKuliah && !norm(t.mataKuliah).includes(scopeMataKuliah)) return false;
    if (scopeProdi && norm(t.prodi) !== scopeProdi) return false;
    if (scopeSemester && norm(t.semester) !== scopeSemester) return false;
    if (scopeGolongan && norm(t.golongan) !== scopeGolongan) return false;
    return true;
  });

  if (scopedTemplates.length === 0) {
    throw new Error(
      "Tidak ada jadwal yang cocok dengan cakupan (mataKuliah/prodi/semester/golongan) yang diberikan."
    );
  }

  const byGolongan = new Map<string, WeeklyTemplate[]>();
  for (const t of scopedTemplates) {
    const key = norm(t.golongan);
    const arr = byGolongan.get(key) || [];
    arr.push(t);
    byGolongan.set(key, arr);
  }
  for (const arr of byGolongan.values()) {
    arr.sort(
      (a, b) =>
        (DAY_RANK[String(a.hari).toLowerCase().trim()] || 99) -
          (DAY_RANK[String(b.hari).toLowerCase().trim()] || 99) ||
        String(a.jam || "").localeCompare(String(b.jam || "")) ||
        a.no - b.no
    );
  }

  const patches = new Map<string, WeeklyPatch>();
  const addPatch = (
    weekNumber: number,
    scheduleId: string,
    patch: { materi?: string; pengajar?: string }
  ) => {
    const key = `${weekNumber}::${scheduleId}`;
    const cur = patches.get(key) || { weekNumber, scheduleId };
    if (patch.materi !== undefined) cur.materi = patch.materi;
    if (patch.pengajar !== undefined) cur.pengajar = patch.pengajar;
    patches.set(key, cur);
  };

  const unmatched: any[] = [];

  for (const w of weeks) {
    const weekNumber = Number(w.weekNumber);
    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 16) {
      unmatched.push({ weekNumber: w.weekNumber, reason: "weekNumber tidak valid (harus 1-16)" });
      continue;
    }

    const materi =
      typeof w.materi === "string" && w.materi.trim() !== "" ? w.materi : undefined;
    const pengampuMap =
      w.pengampu && typeof w.pengampu === "object" ? w.pengampu : {};

    if (materi === undefined && Object.keys(pengampuMap).length === 0) {
      unmatched.push({ weekNumber, reason: "materi dan pengampu kosong" });
      continue;
    }

    if (materi !== undefined) {
      for (const t of scopedTemplates) addPatch(weekNumber, t.scheduleId, { materi });
    }

    for (const [gol, val] of Object.entries(pengampuMap)) {
      const slots = byGolongan.get(norm(gol));
      if (!slots || slots.length === 0) {
        unmatched.push({
          weekNumber,
          golongan: gol,
          reason: `Golongan "${gol}" tidak ada dalam cakupan`,
        });
        continue;
      }

      const names = (Array.isArray(val) ? val : [val])
        .map((n) => (typeof n === "string" ? n.trim() : ""))
        .filter((n) => n !== "");
      if (names.length === 0) continue;

      const dayGroups: WeeklyTemplate[][] = [];
      const dayIndex = new Map<string, number>();
      for (const t of slots) {
        const d = String(t.hari || "").toLowerCase().trim();
        if (!dayIndex.has(d)) {
          dayIndex.set(d, dayGroups.length);
          dayGroups.push([]);
        }
        dayGroups[dayIndex.get(d)!].push(t);
      }

      if (dayGroups.length >= names.length) {
        dayGroups.forEach((group, i) => {
          const rawName = names[Math.min(i, names.length - 1)];
          const name = matchDosenName(rawName, dosenList);
          for (const t of group) addPatch(weekNumber, t.scheduleId, { pengajar: name });
        });
      } else {
        slots.forEach((t, i) => {
          const rawName = names[i % names.length];
          const name = matchDosenName(rawName, dosenList);
          addPatch(weekNumber, t.scheduleId, { pengajar: name });
        });
      }
    }
  }

  return {
    patches: Array.from(patches.values()),
    unmatched,
    scopedSchedules: scopedTemplates.length,
  };
}
