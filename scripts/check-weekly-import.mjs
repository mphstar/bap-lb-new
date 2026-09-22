import assert from "node:assert/strict";
import { buildWeeklyPatches } from "../src/lib/weeklyImport.ts";

const MK = "Workshop Tata Kelola Teknologi Informasi";
const t = (scheduleId, golongan, hari, jam, no) => ({
  scheduleId,
  mataKuliah: MK,
  prodi: "TIF",
  semester: "6",
  golongan,
  hari,
  jam,
  no,
});

const templates = [
  t("sched-7", "B", "Selasa", "13.00 - 15.00", 7),
  t("sched-8", "B", "Selasa", "15.00 - 17.00", 8),
  t("sched-13", "B", "Kamis", "07.00 - 09.00", 13),
  t("sched-14", "B", "Kamis", "09.00 - 11.00", 14),
  t("sched-1", "D", "Senin", "07.00 - 09.00", 1),
  t("sched-2", "D", "Senin", "09.00 - 11.00", 2),
  t("sched-9", "D", "Rabu", "07.00 - 09.00", 9),
  t("sched-10", "D", "Rabu", "09.00 - 11.00", 10),
  // Out of scope: different course
  { ...t("sched-3", "B", "Senin", "13.00 - 15.00", 3), mataKuliah: "Workshop Proyek Sistem Informasi" },
];

const scope = { mataKuliah: "Workshop Tata Kelola", prodi: "TIF", semester: "6" };
const weeks = [
  {
    weekNumber: 1,
    materi: "Pengantar Desain Aplikasi (CT & problem solving) - Mengenal input proses output",
    pengampu: { A: "Elly", B: "Elly", C: "Elly", D: "Elly", E: "Munih", F: "Munih", G: "Munih", Inter: "Munih" },
  },
  { weekNumber: 5, materi: "Wireframe Dasar - wireframe statis", pengampu: { A: "Munih", B: "Munih", C: "Munih", D: "Munih", E: "Elly", F: "Elly", G: "Elly", Inter: "Elly" } },
  { weekNumber: 8, materi: "UTS" },
  { weekNumber: 9, materi: "Prototyping Interaktif - prototype penuh", pengampu: { A: "Denny T", B: "Denny T", C: "Denny T", D: "Denny T", E: "Bety", F: "Bety", G: "Bety", Inter: "Bety" } },
];

const { patches, unmatched, scopedSchedules } = buildWeeklyPatches(templates, scope, weeks);
const at = (wk, sid) => patches.find((p) => p.weekNumber === wk && p.scheduleId === sid);

assert.equal(scopedSchedules, 8, "scope must select exactly the 8 Workshop Tata Kelola slots");

// week 1: materi applied to all scoped slots, pengajar only for B & D
assert.equal(patches.filter((p) => p.weekNumber === 1).length, 8);
assert.ok(at(1, "sched-13").materi?.startsWith("Pengantar Desain Aplikasi"));
assert.equal(at(1, "sched-13").pengajar, "Elly"); // B
assert.equal(at(1, "sched-1").pengajar, "Elly"); // D
assert.ok(!at(1, "sched-3"), "out-of-scope course must not be touched");

// week 5: pengajar swapped per golongan
assert.equal(at(5, "sched-7").pengajar, "Munih"); // B
assert.equal(at(5, "sched-1").pengajar, "Munih"); // D

// week 8 (UTS): materi only, pengajar untouched
assert.equal(patches.filter((p) => p.weekNumber === 8).length, 8);
assert.equal(at(8, "sched-13").materi, "UTS");
assert.equal(at(8, "sched-13").pengajar, undefined);

// week 9: Denny T for B & D
assert.equal(at(9, "sched-13").pengajar, "Denny T");
assert.equal(at(9, "sched-1").pengajar, "Denny T");

// unmatched: 6 unknown golongan per week x 3 weeks with pengampu
assert.equal(unmatched.length, 18);

console.log("OK: all weeklyImport assertions passed");
