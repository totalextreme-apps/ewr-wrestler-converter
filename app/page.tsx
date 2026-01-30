"use client";

import React, { useMemo, useState } from "react";
import { parseWrestlerDat, Worker } from "@/lib/parseWrestlerDat";
import {
  buildWrestlerWorkbook,
  downloadWorkbook,
  SCHEMA_VERSION,
} from "@/lib/exportWrestlerXlsx";

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

function formatDollars(n: number): string {
  const s = Math.trunc(n).toString();
  const withCommas = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "$" + withCommas;
}

export default function HomePage() {
  const [fileName, setFileName] = useState<string>("");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [error, setError] = useState<string>("");
  const [isParsing, setIsParsing] = useState<boolean>(false);

  const preview = useMemo(() => workers.slice(0, 25), [workers]);

  async function onFilePicked(file: File | null) {
    setError("");
    setWorkers([]);
    setFileName("");

    if (!file) return;

    // Web converter v1: wrestler.dat only
    if (file.name.toLowerCase() !== "wrestler.dat") {
      setError('This web converter supports ONLY "wrestler.dat" (exact filename).');
      return;
    }

    setIsParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseWrestlerDat(buf);

      setFileName(file.name);
      setWorkers(parsed);

      if (parsed.length === 0) {
        setError("Parsed 0 workers. This usually means the file is not a valid wrestler.dat.");
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to parse file.");
    } finally {
      setIsParsing(false);
    }
  }

  function onDownloadXlsx() {
    const wb = buildWrestlerWorkbook(workers);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadWorkbook(wb, `wrestlers_${stamp}.xlsx`);
  }

  return (
    <main
      style={{
        maxWidth: 980,
        margin: "40px auto",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>
        EWR 4.2 — wrestler.dat → Excel
      </h1>

      <p style={{ marginTop: 0, color: "#555" }}>
        Client-side converter. Your file is processed locally in your browser
        and never uploaded.
      </p>

      <div style={{ fontSize: 12, color: "#777", marginBottom: 16 }}>
        Version: {SCHEMA_VERSION}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
          Select wrestler.dat
        </label>

        <input
          type="file"
          accept=".dat"
          onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
        />

        <div style={{ marginTop: 12, fontSize: 14, color: "#444" }}>
          {isParsing
            ? "Parsing..."
            : fileName
            ? `Loaded: ${fileName}`
            : "No file loaded."}
        </div>

        {error && (
          <div style={{ marginTop: 12, color: "#b00020", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {workers.length > 0 && (
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 600 }}>
              Workers parsed: {workers.length}
            </div>

            <button
              onClick={onDownloadXlsx}
              style={{
                marginLeft: "auto",
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Download .xlsx
            </button>
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>
            Preview (first 25)
          </h2>

          <div
            style={{
              overflowX: "auto",
              border: "1px solid #eee",
              borderRadius: 12,
            }}
          >
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
            >
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {[
                    "Index",
                    "ID",
                    "Full Name",
                    "Short Name",
                    "Birth Month",
                    "Age",
                    "Gender",
                    "Weight",
                    "Nationality",
                    "Wage ($)",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: 10,
                        borderBottom: "1px solid #eee",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {preview.map((w) => (
                  <tr key={`${w.index}-${w.id}`}>
                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      {w.index}
                    </td>

                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      {w.id}
                    </td>

                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      {w.fullName}
                    </td>

                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      {w.shortName}
                    </td>

                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      {birthMonthName(w.birthMonth)}
                    </td>

                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      {w.age}
                    </td>

                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      {genderName(w.gender)}
                    </td>

                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      {weightName(w.weight)}
                    </td>

                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      {nationalityName(w.nationality)}
                    </td>

                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #f2f2f2",
                      }}
                    >
                      {formatDollars(w.wageDollars)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
