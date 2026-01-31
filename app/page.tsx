"use client";

import React, { useMemo, useRef, useState } from "react";
import { parseWrestlerDat, Worker } from "@/lib/parseWrestlerDat";
import {
  buildWrestlerWorkbook,
  downloadWorkbook,
  SCHEMA_VERSION,
} from "@/lib/exportWrestlerXlsx";

const RECORD_SIZE = 307;
const RECORD_MARKER = 0x34; // ASCII '4'

// EDIT THIS IF YOUR REPO URL IS DIFFERENT
const GITHUB_ISSUES_URL =
  "https://github.com/totalextreme-apps/ewr-wrestler-converter/issues";

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
  if (raw === 0) return "Female";
  if (raw === 65535) return "Male";
  return "Unknown";
}

// EWR: 72 = Heavyweight, 76 = Lightweight
function weightName(raw: number): string {
  if (raw === 72) return "Heavyweight";
  if (raw === 76) return "Lightweight";
  return "Unknown";
}

function nationalityName(raw: number): string {
  return NATIONALITY_NAMES[raw] ?? "Other";
}

function formatDollars(n: number): string {
  const s = Math.trunc(n).toString();
  const withCommas = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "$" + withCommas;
}

function validateMarkers(buffer: ArrayBuffer): { valid: number; total: number } {
  const view = new DataView(buffer);
  const total = Math.floor(buffer.byteLength / RECORD_SIZE);

  let valid = 0;
  for (let i = 0; i < total; i++) {
    const marker = view.getUint8(i * RECORD_SIZE);
    if (marker === RECORD_MARKER) valid++;
  }
  return { valid, total };
}

function diagnosticsText(opts: {
  schemaVersion: string;
  fileName: string;
  fileSize: number;
  markerStats: { valid: number; total: number } | null;
  workerCount: number;
}): string {
  const lines: string[] = [];
  lines.push("EWR Converter Diagnostics");
  lines.push(`Version: ${opts.schemaVersion}`);
  lines.push(`File: ${opts.fileName || "(not selected)"}`);
  lines.push(
    `File size: ${opts.fileSize ? `${opts.fileSize} bytes` : "(unknown)"}`
  );
  lines.push(`Record size: ${RECORD_SIZE} bytes`);
  lines.push(`Marker: 0x${RECORD_MARKER.toString(16)} ('4')`);

  if (opts.markerStats) {
    const pct = opts.markerStats.total
      ? Math.round((opts.markerStats.valid / opts.markerStats.total) * 100)
      : 0;
    lines.push(
      `Markers valid: ${opts.markerStats.valid}/${opts.markerStats.total} (${pct}%)`
    );
  } else {
    lines.push("Markers valid: (not computed)");
  }

  lines.push(`Workers parsed: ${opts.workerCount}`);
  lines.push(`Browser: ${navigator.userAgent}`);
  lines.push(`Platform: ${navigator.platform}`);
  lines.push(`Time: ${new Date().toISOString()}`);

  return lines.join("\n");
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Diagnostics copied to clipboard.");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    alert("Diagnostics copied to clipboard.");
  }
}

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [markerStats, setMarkerStats] = useState<{
    valid: number;
    total: number;
  } | null>(null);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [error, setError] = useState<string>("");
  const [isParsing, setIsParsing] = useState<boolean>(false);

  const [isDragging, setIsDragging] = useState<boolean>(false);

  const preview = useMemo(() => workers.slice(0, 25), [workers]);

  async function parseFile(file: File) {
    setError("");
    setWorkers([]);
    setFileName("");
    setFileSize(0);
    setMarkerStats(null);

    // strict filename rule (your choice)
    if (file.name.toLowerCase() !== "wrestler.dat") {
      setError('This web converter supports ONLY "wrestler.dat" (exact filename).');
      return;
    }

    setIsParsing(true);
    try {
      const buf = await file.arrayBuffer();

      const stats = validateMarkers(buf);
      setMarkerStats(stats);

      const parsed = parseWrestlerDat(buf);

      setFileName(file.name);
      setFileSize(file.size);
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

  async function onFilePicked(file: File | null) {
    if (!file) return;
    await parseFile(file);
  }

  function onDownloadXlsx() {
    const wb = buildWrestlerWorkbook(workers);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadWorkbook(wb, `wrestlers_${stamp}.xlsx`);
  }

  async function onCopyDiagnostics() {
    const text = diagnosticsText({
      schemaVersion: SCHEMA_VERSION,
      fileName,
      fileSize,
      markerStats,
      workerCount: workers.length,
    });
    await copyTextToClipboard(text);
  }

  function onReportIssue() {
    window.open(GITHUB_ISSUES_URL, "_blank", "noopener,noreferrer");
  }

  // --- Drag & drop handlers ---
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;

    await parseFile(dropped);
  }

  // --- Styles ---
  const pageWrap: React.CSSProperties = {
    maxWidth: 980,
    margin: "44px auto",
    padding: 16,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    color: "#111827",
  };

  const title: React.CSSProperties = {
    fontSize: 30,
    fontWeight: 800,
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  };

  const subtitle: React.CSSProperties = {
    marginTop: 0,
    marginBottom: 8,
    color: "#6b7280",
    fontSize: 14,
  };

  const versionLine: React.CSSProperties = {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 18,
  };

  const bluePanel: React.CSSProperties = {
    background:
      "linear-gradient(180deg, rgba(37,99,235,0.95) 0%, rgba(29,78,216,0.95) 100%)",
    borderRadius: 18,
    padding: 14,
    boxShadow:
      "0 12px 26px rgba(15, 23, 42, 0.20), inset 0 0 0 1px rgba(255,255,255,0.12)",
  };

  const innerCard: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
    border: isDragging
      ? "2px dashed rgba(37,99,235,0.9)"
      : "1px solid rgba(17, 24, 39, 0.10)",
    outline: isDragging ? "6px solid rgba(37,99,235,0.10)" : "none",
    transition: "border 120ms ease, outline 120ms ease",
  };

  const label: React.CSSProperties = {
    display: "block",
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 10,
  };

  const row: React.CSSProperties = {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  };

  const buttonPrimary: React.CSSProperties = {
    border: "1px solid rgba(17, 24, 39, 0.85)",
    background: "#111827",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
  };

  const buttonGhost: React.CSSProperties = {
    border: "1px solid rgba(17, 24, 39, 0.25)",
    background: "#fff",
    color: "#111827",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
  };

  const buttonChooseFileRed: React.CSSProperties = {
    border: "1px solid rgba(185, 28, 28, 0.95)",
    background:
      "linear-gradient(180deg, rgba(239,68,68,1) 0%, rgba(185,28,28,1) 100%)",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 800,
    boxShadow: "0 8px 16px rgba(185, 28, 28, 0.25)",
  };

  const helperText: React.CSSProperties = {
    marginTop: 10,
    fontSize: 13,
    color: "#4b5563",
  };

  const hintText: React.CSSProperties = {
    marginTop: 6,
    fontSize: 12,
    color: "#6b7280",
  };

  const errorBox: React.CSSProperties = {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(220, 38, 38, 0.08)",
    border: "1px solid rgba(220, 38, 38, 0.25)",
    color: "#b91c1c",
    fontWeight: 700,
    fontSize: 13,
  };

  const tableWrap: React.CSSProperties = {
    marginTop: 20,
    overflowX: "auto",
    border: "1px solid rgba(17, 24, 39, 0.10)",
    borderRadius: 14,
    background: "#fff",
    boxShadow: "0 10px 20px rgba(15, 23, 42, 0.06)",
  };

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: 12,
    borderBottom: "1px solid rgba(17, 24, 39, 0.08)",
    whiteSpace: "nowrap",
    fontSize: 12,
    color: "#374151",
    background: "#f9fafb",
  };

  const td: React.CSSProperties = {
    padding: 12,
    borderBottom: "1px solid rgba(17, 24, 39, 0.06)",
    fontSize: 13,
    whiteSpace: "nowrap",
  };

  return (
    <main style={pageWrap}>
      <h1 style={title}>EWR 4.2 — wrestler.dat → Excel</h1>
      <p style={subtitle}>
        Client-side converter. Your file is processed locally in your browser
        and never uploaded.
      </p>
      <div style={versionLine}>Version: {SCHEMA_VERSION}</div>

      <div style={bluePanel}>
        {/* Drop zone: wrap the inner card */}
        <div
          style={innerCard}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <label style={label}>Select wrestler.dat</label>

          {/* Hidden native input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".dat"
            style={{ display: "none" }}
            onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
          />

          <div style={row}>
            {/* Styled red button */}
            <button
              type="button"
              style={buttonChooseFileRed}
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              title="Choose wrestler.dat"
            >
              Choose File
            </button>

            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {fileName ? fileName : "No file chosen"}
            </div>

            {workers.length > 0 && (
              <>
                <button
                  onClick={onCopyDiagnostics}
                  style={buttonGhost}
                  type="button"
                >
                  Copy diagnostics
                </button>

                <button
                  onClick={onDownloadXlsx}
                  style={buttonPrimary}
                  type="button"
                >
                  Download .xlsx
                </button>
              </>
            )}
          </div>

          <div style={hintText}>
            Tip: You can also drag & drop <b>wrestler.dat</b> anywhere inside this
            box.
          </div>

          <div style={helperText}>
            {isParsing
              ? "Parsing..."
              : fileName
              ? `Loaded: ${fileName}`
              : "No file loaded."}
          </div>

          {markerStats && (
            <div style={{ ...helperText, marginTop: 6, color: "#6b7280" }}>
              Marker validation: {markerStats.valid}/{markerStats.total} records
              start with '4'
            </div>
          )}

          {error && <div style={errorBox}>{error}</div>}

          {workers.length > 0 && (
            <div style={{ ...helperText, marginTop: 12 }}>
              <b>Workers parsed:</b> {workers.length}{" "}
              <span style={{ color: "#9ca3af" }}>
                • File size: {fileSize.toLocaleString()} bytes
              </span>
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Having trouble? Click <b>Copy diagnostics</b>, then{" "}
                <button
                  onClick={onReportIssue}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    margin: 0,
                    color: "#2563eb",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                  type="button"
                >
                  Report an issue
                </button>{" "}
                and paste the diagnostics block into your issue.
              </div>
            </div>
          )}
        </div>
      </div>

      {preview.length > 0 && (
        <section style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 10px 0" }}>
            Preview (first 25)
          </h2>

          <div style={tableWrap}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
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
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {preview.map((w) => (
                  <tr key={`${w.index}-${w.id}`}>
                    <td style={td}>{w.index}</td>
                    <td style={td}>{w.id}</td>
                    <td style={td}>{w.fullName}</td>
                    <td style={td}>{w.shortName}</td>
                    <td style={td}>{birthMonthName(w.birthMonth)}</td>
                    <td style={td}>{w.age}</td>
                    <td style={td}>{genderName(w.gender)}</td>
                    <td style={td}>{weightName(w.weight)}</td>
                    <td style={td}>{nationalityName(w.nationality)}</td>
                    <td style={td}>{formatDollars(w.wageDollars)}</td>
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
