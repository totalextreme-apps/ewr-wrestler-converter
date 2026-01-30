# EWR 4.2 `wrestler.dat` Format Spec (Reverse-Engineered)

This document locks the confirmed offsets/encodings for EWR 4.2 `wrestler.dat`
as used by the web converter and future desktop editor.

## Record layout

- Record size: **307 bytes**
- Records repeat back-to-back.
- Worker count is dynamic:
  - parse while `(offset + 307 <= fileSize)`

### Record header (3 bytes)
Offset | Size | Type | Meaning
---|---:|---|---
0x00 | 1 | u8 | Record marker (ASCII `'4'` = `0x34`)
0x01 | 2 | u16le | Worker ID
0x03 | ... | ... | Record payload begins here

**Rule:** Header must be skipped before reading payload fields.

---

## Field encodings

### Strings
- Stored as fixed-length ASCII slices.
- Padding: spaces and/or nulls.
- Decode: ASCII, strip `\0`, trim right.

### Yes/No flags (most checkboxes & some dropdowns)
- `0x0000` = No
- `0xFFFF` = Yes

### Gender (u16le)
Confirmed via `cmp`:
- `0xFFFF` = Male
- `0x0000` = Female

### Birth month (u8)
Confirmed via `cmp`:
- `0` = Unknown
- `1..12` = January..December

### Weight (u8)
Confirmed via `cmp`:
- `72` = Heavyweight
- `76` = Lightweight

### Nationality (u8)
Dropdown options in EWR editor:
- American, Australian, British, Canadian, European, Japanese, Mexican, Other

**Observed mapping used by converter UI:**
- `0` = Other
- `1` = American
- `2` = Australian
- `3` = British
- `4` = Canadian
- `5` = European
- `6` = Japanese
- `7` = Mexican

(If a future DB shows additional values, treat unknown as Other.)

### Wage
- Stored as **u16le** in “thousands”
- Wage dollars = `wageRaw * 1000`
- Range: `$0 .. $300,000` in editor.

Confirmed by `cmp`:
- Jericho $0 vs $300k changed 2 bytes.

---

## Offsets (relative to record start)

> All offsets below are **relative to the start of the 307-byte record**.
> i.e. recordStart + OFFSET.

### Identity / names
Field | Offset | Size | Type | Notes
---|---:|---:|---|---
Full Name | 0x03 | 25 | char[25] | EWR editor limit ~25 chars; fixed slice
Short Name | 0x1C | 10 | char[10] | EWR editor limit ~10 chars; fixed slice

(Short Name offset = 0x03 + 25 = 0x1C)

### Core demographics
Field | Offset | Size | Type | Notes
---|---:|---:|---|---
Gender | **0x26** | 2 | u16le | `0=Female`, `65535=Male`
Birth Month | **0x28** | 1 | u8 | `0=Unknown`, `1..12=Jan..Dec`
Age | **0x29** | 1 | u8 | `0..70` slider in editor
Weight | **0x2C** | 1 | u8 | `72=HW`, `76=LW`
Nationality | **0x113** | 1 | u8 | see mapping table above
Speaks (Yes/No) | **0xB9** | 2 | u16le | `0/65535`

> Notes:
> - BirthMonth confirmed by `cmp` at file position 41 (1-indexed), which corresponds to record offset 0x28.
> - Gender confirmed by `cmp` at file positions 39–40 (1-indexed), which corresponds to record offset 0x26 (2 bytes).
> - Age confirmed by `cmp` at file position 350 (1-indexed) for Jericho test; corresponds to record offset 0x29.
> - Weight confirmed by `cmp` at file position 45 (1-indexed); corresponds to record offset 0x2C.
> - Nationality confirmed by `cmp` at file position 276 (1-indexed); corresponds to record offset 0x113.
> - Speaks confirmed by `cmp` at file positions 188–189 (1-indexed); corresponds to record offset 0xB9.

### Skills (u8, 0–100)
Order in EWR editor:
Brawling, Speed, Technical, Stiffness, Selling, Over, Charisma, Attitude, Behaviour

Field | Offset | Type | Notes
---|---:|---|---
Brawling | **0x94** | u8 | confirmed via `cmp` (Jericho skill tests)
Speed | **0x98** | u8 | confirmed via `cmp`
Technical | **0x96** | u8 | confirmed via `cmp`
Stiffness | **0x9A** | u8 | confirmed via `cmp`
Selling | **0x9C** | u8 | confirmed via `cmp`
Overness | **0x9E** | u8 | confirmed via `cmp`
Charisma | **0xA0** | u8 | confirmed via `cmp`
Attitude | **0xA4** | u8 | confirmed via `cmp`
Behaviour | **0xFC** | u8 | confirmed via `cmp` (note: far from the others)

> Skills note:
> Behaviour lives at a separate offset (0xFC) and is not contiguous with the others.

### Finishers
#### Primary finisher name
- Name is a fixed-length ASCII field (editor limit 25 chars).

Field | Offset | Size | Type
---|---:|---:|---
Primary Finisher Name | **0xBD** | 25? | char[?]

**Primary finisher name bytes changed in `cmp` for Jericho test**:
- file positions 190–205 (1-indexed) changed
- corresponds to record offsets **0xBD..0xCC** (16 bytes shown by diff)
- implies the finisher name is stored as a fixed slice starting at 0xBD and padded with spaces.

> Current converter reads a fixed slice long enough to capture full name up to 25 chars and trims.

#### Primary finisher type (flags)
EWR finisher types:
- Corner
- Ground
- Impact
- Submission
- Top Rope
- Top Rope Standing

Confirmed via `cmp` for primary finisher type changes:
- file positions 215–220 (1-indexed) vary by type.
These are stored as **multiple u16le yes/no flags**.

Field | Offset | Size | Type | Notes
---|---:|---:|---|---
PF Type Flag A | **0xD6** | 2 | u16le | yes/no flag
PF Type Flag B | **0xD8** | 2 | u16le | yes/no flag
PF Type Flag C | **0xDA** | 2 | u16le | yes/no flag
PF Type Flag D | **0xDC** | 2 | u16le | yes/no flag (present; not always needed)

**Observed combinations (A/B/C) used in converter:**
A | B | C | Type
---:|---:|---:|---
0 | 0 | 0 | Impact
1 | 0 | 0 | Submission
1 | 1 | 0 | Top Rope Standing
0 | 1 | 0 | Top Rope
0 | 0 | 1 | Ground
0 | 1 | 1 | Corner

(Any other combo => UNMAPPED)

#### Secondary finisher name
Field | Offset | Size | Type
---|---:|---:|---
Secondary Finisher Name | **0xDD** | 25? | char[?]

Confirmed via `cmp` for secondary finisher name test:
- file positions 221–233 (1-indexed) changed (name bytes)
- indicates a fixed slice padded with spaces.

#### Secondary finisher type (flags)
Confirmed via `cmp`:
- file positions 248–251 (1-indexed) change for secondary type selection.
Stored as multiple u16le yes/no flags.

Field | Offset | Size | Type
---|---:|---:|---
SF Type Flag A | **0xF5** | 2 | u16le
SF Type Flag B | **0xF7** | 2 | u16le
SF Type Flag C | **0xF9** | 2 | u16le

(Decoded using same A/B/C mapping table as primary.)

---

## Checkbox attributes (Yes/No u16le)

All of these are stored as:
- `0x0000` (off)
- `0xFFFF` (on)

### Verified offsets (recordStart-relative)

Derived from `cmp -l` positions using:

- `recordStart = workerIndex * 307`
- `fieldOffset = (cmpPosition - 1) - recordStart`

Checkbox tests used **Stephanie McMahon at workerIndex = 6** (recordStart = 6 * 307 = 1842).

Field | Offset (dec) | Offset (hex) | Size | Type
---|---:|---:|---:|---
High Spots | 161 | 0xA1 | 2 | u16le
Shooting Ability | 165 | 0xA5 | 2 | u16le
Trainer | 271 | 0x10F | 2 | u16le
Superstar Look | 273 | 0x111 | 2 | u16le
Menacing | 277 | 0x115 | 2 | u16le
Fonz Factor | 279 | 0x117 | 2 | u16le
Announcer | 281 | 0x119 | 2 | u16le
Booker | 283 | 0x11B | 2 | u16le
Diva | 293 | 0x125 | 2 | u16le

Notes:
- Diva is female-exclusive in the editor UI, but stored as a normal yes/no flag.
- These offsets are per-record (recordStart-relative), so they work for all workers.

---

## TBD / Future work
These are intentionally not guessed:

- Any fields not included in the current export column set
- Any additional worker.dat fields that exist but are not needed for the converter/editor MVP
- Cross-file relationships:
  - Employment (promos.dat)
  - Teams (teams.dat)
  - Stables (stables.dat)

