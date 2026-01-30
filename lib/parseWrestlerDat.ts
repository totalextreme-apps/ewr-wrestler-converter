// lib/parseWrestlerDat.ts
// Browser-safe parser: Uint8Array + DataView (no Node Buffer, no fs)

const RECORD_SIZE = 307;
const RECORD_MARKER = 0x34; // '4'

// Names (locked)
const FULL_NAME_OFFSET = 3;
const FULL_NAME_LENGTH = 25;
const SHORT_NAME_OFFSET = 28;
const SHORT_NAME_LENGTH = 10;

// Core (locked)
const GENDER_OFFSET = 38; // uint16 LE (0=Female, 65535=Male)
const BIRTH_MONTH_OFFSET = 40; // uint8 (0=Unknown, 1-12)
const AGE_OFFSET = 42; // uint8
const WEIGHT_OFFSET = 44; // uint8 (72=Heavyweight, 76=Lightweight)
const NATIONALITY_OFFSET = 275; // uint8 (0-7)
const WAGE_OFFSET = 80; // uint16 LE (thousands)

// Skills (locked uint16 LE)
const SKILL_BRAWLING_OFFSET = 147;
const SKILL_TECHNICAL_OFFSET = 149;
const SKILL_SPEED_OFFSET = 151;
const SKILL_STIFFNESS_OFFSET = 153;
const SKILL_SELLING_OFFSET = 155;
const SKILL_OVERNESS_OFFSET = 157;
const SKILL_CHARISMA_OFFSET = 159;
const SKILL_ATTITUDE_OFFSET = 163;
const SKILL_BEHAVIOUR_OFFSET = 255;

// Flags / dropdowns (locked uint16 LE: 0/65535)
const SPEAKS_OFFSET = 187;

const HIGH_SPOTS_OFFSET = 161;
const SHOOTING_ABILITY_OFFSET = 165;

const TRAINER_OFFSET = 271;
const SUPERSTAR_LOOK_OFFSET = 273;
const MENACING_OFFSET = 277;
const FONZ_FACTOR_OFFSET = 279;
const ANNOUNCER_OFFSET = 281;
const BOOKER_OFFSET = 283;
const DIVA_OFFSET = 293;

// Finishers (locked)
const PRIMARY_FINISHER_NAME_OFFSET = 189;
const PRIMARY_FINISHER_NAME_LENGTH = 25;

// Primary finisher type flags (raw)
const PF_TYPE_FLAG_A_OFFSET = 214;
const PF_TYPE_FLAG_B_OFFSET = 216;
const PF_TYPE_FLAG_C_OFFSET = 218;
const PF_TYPE_FLAG_D_OFFSET = 249;

// Secondary finisher name
const SECONDARY_FINISHER_NAME_OFFSET = 220;
const SECONDARY_FINISHER_NAME_LENGTH = 25;

// Secondary finisher type flags (raw)
const SF_TYPE_FLAG_A_OFFSET = 245;
const SF_TYPE_FLAG_B_OFFSET = 247;
const SF_TYPE_FLAG_C_OFFSET = 249;

export type Worker = {
  index: number;
  id: number;

  fullName: string;
  shortName: string;

  birthMonth: number;
  age: number;

  gender: number;
  weight: number;
  nationality: number;

  speaks: number;

  wageRaw: number;
  wageDollars: number;

  primaryFinisherName: string;
  primaryFinisherTypeFlagA: number;
  primaryFinisherTypeFlagB: number;
  primaryFinisherTypeFlagC: number;
  primaryFinisherTypeFlagD: number;

  secondaryFinisherName: string;
  secondaryFinisherTypeFlagA: number;
  secondaryFinisherTypeFlagB: number;
  secondaryFinisherTypeFlagC: number;

  // skills
  brawling: number;
  speed: number;
  technical: number;
  stiffness: number;
  selling: number;
  overness: number;
  charisma: number;
  attitude: number;
  behaviour: number;

  // flags
  diva: number;
  trainer: number;
  superstarLook: number;
  menacing: number;
  fonzFactor: number;
  announcer: number;
  booker: number;
  highSpots: number;
  shootingAbility: number;
};

function readUInt8(view: DataView, offset: number): number {
  if (offset < 0 || offset >= view.byteLength) return 0;
  return view.getUint8(offset);
}

function readUInt16LE(view: DataView, offset: number): number {
  if (offset < 0 || offset + 1 >= view.byteLength) return 0;
  return view.getUint16(offset, true);
}

function readAsciiString(bytes: Uint8Array, offset: number, length: number): string {
  if (offset < 0 || offset + length > bytes.length) return "";
  let out = "";
  for (let i = offset; i < offset + length; i++) {
    const c = bytes[i];
    if (c === 0x00) continue; // strip nulls
    out += String.fromCharCode(c);
  }
  return out.trim();
}

export function parseWrestlerDat(arrayBuffer: ArrayBuffer): Worker[] {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);

  const workers: Worker[] = [];
  let offset = 0;
  let index = 0;

  while (offset + RECORD_SIZE <= bytes.length) {
    const recordStart = offset;

    const marker = readUInt8(view, recordStart);
    if (marker !== RECORD_MARKER) {
      // If a record is corrupt, skip it safely instead of blowing up the whole conversion
      offset += RECORD_SIZE;
      index++;
      continue;
    }

    const id = readUInt16LE(view, recordStart + 1);

    const fullName = readAsciiString(bytes, recordStart + FULL_NAME_OFFSET, FULL_NAME_LENGTH);
    const shortName = readAsciiString(bytes, recordStart + SHORT_NAME_OFFSET, SHORT_NAME_LENGTH);

    const gender = readUInt16LE(view, recordStart + GENDER_OFFSET);
    const birthMonth = readUInt8(view, recordStart + BIRTH_MONTH_OFFSET);
    const age = readUInt8(view, recordStart + AGE_OFFSET);

    const weight = readUInt8(view, recordStart + WEIGHT_OFFSET);
    const nationality = readUInt8(view, recordStart + NATIONALITY_OFFSET);

    const speaks = readUInt16LE(view, recordStart + SPEAKS_OFFSET);

    const wageRaw = readUInt16LE(view, recordStart + WAGE_OFFSET);
    const wageDollars = wageRaw * 1000;

    const primaryFinisherName = readAsciiString(
      bytes,
      recordStart + PRIMARY_FINISHER_NAME_OFFSET,
      PRIMARY_FINISHER_NAME_LENGTH
    );
    const primaryFinisherTypeFlagA = readUInt16LE(view, recordStart + PF_TYPE_FLAG_A_OFFSET);
    const primaryFinisherTypeFlagB = readUInt16LE(view, recordStart + PF_TYPE_FLAG_B_OFFSET);
    const primaryFinisherTypeFlagC = readUInt16LE(view, recordStart + PF_TYPE_FLAG_C_OFFSET);
    const primaryFinisherTypeFlagD = readUInt16LE(view, recordStart + PF_TYPE_FLAG_D_OFFSET);

    const secondaryFinisherName = readAsciiString(
      bytes,
      recordStart + SECONDARY_FINISHER_NAME_OFFSET,
      SECONDARY_FINISHER_NAME_LENGTH
    );
    const secondaryFinisherTypeFlagA = readUInt16LE(view, recordStart + SF_TYPE_FLAG_A_OFFSET);
    const secondaryFinisherTypeFlagB = readUInt16LE(view, recordStart + SF_TYPE_FLAG_B_OFFSET);
    const secondaryFinisherTypeFlagC = readUInt16LE(view, recordStart + SF_TYPE_FLAG_C_OFFSET);

    // skills
    const brawling = readUInt16LE(view, recordStart + SKILL_BRAWLING_OFFSET);
    const technical = readUInt16LE(view, recordStart + SKILL_TECHNICAL_OFFSET);
    const speed = readUInt16LE(view, recordStart + SKILL_SPEED_OFFSET);
    const stiffness = readUInt16LE(view, recordStart + SKILL_STIFFNESS_OFFSET);
    const selling = readUInt16LE(view, recordStart + SKILL_SELLING_OFFSET);
    const overness = readUInt16LE(view, recordStart + SKILL_OVERNESS_OFFSET);
    const charisma = readUInt16LE(view, recordStart + SKILL_CHARISMA_OFFSET);
    const attitude = readUInt16LE(view, recordStart + SKILL_ATTITUDE_OFFSET);
    const behaviour = readUInt16LE(view, recordStart + SKILL_BEHAVIOUR_OFFSET);

    // flags
    const diva = readUInt16LE(view, recordStart + DIVA_OFFSET);
    const trainer = readUInt16LE(view, recordStart + TRAINER_OFFSET);
    const superstarLook = readUInt16LE(view, recordStart + SUPERSTAR_LOOK_OFFSET);
    const menacing = readUInt16LE(view, recordStart + MENACING_OFFSET);
    const fonzFactor = readUInt16LE(view, recordStart + FONZ_FACTOR_OFFSET);
    const announcer = readUInt16LE(view, recordStart + ANNOUNCER_OFFSET);
    const booker = readUInt16LE(view, recordStart + BOOKER_OFFSET);
    const highSpots = readUInt16LE(view, recordStart + HIGH_SPOTS_OFFSET);
    const shootingAbility = readUInt16LE(view, recordStart + SHOOTING_ABILITY_OFFSET);

    workers.push({
      index,
      id,
      fullName,
      shortName,
      birthMonth,
      age,
      gender,
      weight,
      nationality,
      speaks,
      wageRaw,
      wageDollars,

      primaryFinisherName,
      primaryFinisherTypeFlagA,
      primaryFinisherTypeFlagB,
      primaryFinisherTypeFlagC,
      primaryFinisherTypeFlagD,

      secondaryFinisherName,
      secondaryFinisherTypeFlagA,
      secondaryFinisherTypeFlagB,
      secondaryFinisherTypeFlagC,

      brawling,
      speed,
      technical,
      stiffness,
      selling,
      overness,
      charisma,
      attitude,
      behaviour,

      diva,
      trainer,
      superstarLook,
      menacing,
      fonzFactor,
      announcer,
      booker,
      highSpots,
      shootingAbility,
    });

    offset += RECORD_SIZE;
    index++;
  }

  return workers;
}
