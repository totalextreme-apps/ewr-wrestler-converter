// lib/exportWrestlerXlsx.ts
import * as XLSX from "xlsx";
import type { Worker } from "./parseWrestlerDat";

// Exported so the UI can display it (Version: ...)
export const SCHEMA_VERSION = "ewr-wrestler-dat-web-v1.0.0";

const BIRTH_MONTH_NAMES = [
  "Unknown",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const NATIONALITY_NAMES: Record<number, string> = {
  0: "Other",
  1: "American",
  2: "Australian",
  3: "British",
  4: "Canadian",
  5: "European",
  6: "Japanese",
  7: "Mexican",
};

function birthMonthName(raw: number): string {
  return BIRTH_MONTH_NAMES[raw] ?? "Unknown";
}

// EWR: 0 = Female, 65535 = Male
function genderName(raw: number): string {
  return raw === 0 ? "Female" : "Male";
}

// EWR: 72 = Heavyweight, 76 = Lightweight
function weightName(raw: number): string {
  if (raw === 72) return "Heavyweight";
  if (raw === 76) return "Lightweight";
  return "Lightweight";
}

function nationalityName(raw: number): string {
  return NATIONALITY_NAMES[raw] ?? "Other";
}

function yesNo(raw: number): string {
  return raw === 0 ? "No" : "Yes";
}

function formatDollars(n: number): string {
  const s = Math.trunc(n).toString();
  const withCommas = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "$" + withCommas;
}

/**
 * Finisher type mapping (from our confirmed flags):
 * A,B,C correspond to specific toggles; D exists but isn't needed for type selection.
 *
 * Using the observed combinations:
 * - none set => Impact
 * - A only => Submission
 * - A + B => Top Rope Standing
 * - B only => Top Rope
 * - C only => Ground
 * - B + C => Corner
 *
 * Any other combo => UNMAPPED
 */
function decodeFinisherTypeFromABC(Araw: number, Braw: number, Craw: number): string {
  const on = (v: number) => v !== 0;

  const a = on(Araw);
  const b = on(Braw);
  const c = on(Craw);

  if (!a && !b && !c) return "Impact";
  if (a && !b && !c) return "Submission";
  if (a && b && !c) return "Top Rope Standing";
  if (!a && b && !c) return "Top Rope";
  if (!a && !b && c) return "Ground";
  if (!a && b && c) return "Corner";

  return "UNMAPPED";
}

export function buildWrestlerWorkbook(workers: Worker[]) {
  // Locked column order (your agreed export order)
  const headers = [
    "Index",
    "ID",
    "Full Name",
    "Short Name",
    "Birth Month (Raw)",
    "Birth Month",
    "Age",
    "Gender (Raw)",
    "Gender",
    "Weight (Raw)",
    "Weight",
    "Nationality (Raw)",
    "Nationality",
    "Speaks (Raw)",
    "Speaks",
    "Wage (Raw, Thousands)",
    "Wage ($)",
    "Primary Finisher Name",
    "PF Type Flag A (Raw)",
    "PF Type Flag B (Raw)",
    "PF Type Flag C (Raw)",
    "PF Type Flag D (Raw)",
    "Primary Finisher Type",
    "Secondary Finisher Name",
    "SF Type Flag A (Raw)",
    "SF Type Flag B (Raw)",
    "SF Type Flag C (Raw)",
    "Secondary Finisher Type",
    "Brawling",
    "Speed",
    "Technical",
    "Stiffness",
    "Selling",
    "Overness",
    "Charisma",
    "Attitude",
    "Behaviour",
    "Diva (Raw)",
    "Diva",
    "Trainer (Raw)",
    "Trainer",
    "Superstar Look (Raw)",
    "Superstar Look",
    "Menacing (Raw)",
    "Menacing",
    "Fonz Factor (Raw)",
    "Fonz Factor",
    "Announcer (Raw)",
    "Announcer",
    "Booker (Raw)",
    "Booker",
    "High Spots (Raw)",
    "High Spots",
    "Shooting Ability (Raw)",
    "Shooting Ability",
  ];

  const rows = workers.map((w) => {
    const pfType = decodeFinisherTypeFromABC(
      w.primaryFinisherTypeFlagA,
      w.primaryFinisherTypeFlagB,
      w.primaryFinisherTypeFlagC
    );

    const sfType = decodeFinisherTypeFromABC(
      w.secondaryFinisherTypeFlagA,
      w.secondaryFinisherTypeFlagB,
      w.secondaryFinisherTypeFlagC
    );

    return [
      w.index,
      w.id,
      w.fullName,
      w.shortName,
      w.birthMonth,
      birthMonthName(w.birthMonth),
      w.age,
      w.gender,
      genderName(w.gender),
      w.weight,
      weightName(w.weight),
      w.nationality,
      nationalityName(w.nationality),
      w.speaks,
      yesNo(w.speaks),
      w.wageRaw,
      formatDollars(w.wageDollars),
      w.primaryFinisherName,
      w.primaryFinisherTypeFlagA,
      w.primaryFinisherTypeFlagB,
      w.primaryFinisherTypeFlagC,
      w.primaryFinisherTypeFlagD,
      pfType,
      w.secondaryFinisherName,
      w.secondaryFinisherTypeFlagA,
      w.secondaryFinisherTypeFlagB,
      w.secondaryFinisherTypeFlagC,
      sfType,
      w.brawling,
      w.speed,
      w.technical,
      w.stiffness,
      w.selling,
      w.overness,
      w.charisma,
      w.attitude,
      w.behaviour,
      w.diva,
      yesNo(w.diva),
      w.trainer,
      yesNo(w.trainer),
      w.superstarLook,
      yesNo(w.superstarLook),
      w.menacing,
      yesNo(w.menacing),
      w.fonzFactor,
      yesNo(w.fonzFactor),
      w.announcer,
      yesNo(w.announcer),
      w.booker,
      yesNo(w.booker),
      w.highSpots,
      yesNo(w.highSpots),
      w.shootingAbility,
      yesNo(w.shootingAbility),
    ];
  });

  const wsWorkers = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Schema sheet (diagnostics + future-proofing)
  const schemaRows = [
    ["key", "value"],
    ["schemaVersion", SCHEMA_VERSION],
    ["source", "EWR 4.2 wrestler.dat (client-side converter)"],
    ["notes", "Files never leave your device. Do not edit Workers headers."],
    ["wageScale", "wageRaw is thousands; wageDollars = wageRaw * 1000"],
    ["genderEncoding", "0=Female, 65535=Male"],
    ["yesNoEncoding", "0=No, 65535=Yes"],
    ["weightEncoding", "72=Heavyweight, 76=Lightweight"],
    ["workersColumns", headers.join(" | ")],
  ];

  const wsSchema = XLSX.utils.aoa_to_sheet(schemaRows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsWorkers, "Workers");
  XLSX.utils.book_append_sheet(wb, wsSchema, "Schema");

  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
