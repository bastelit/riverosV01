"use client";

import { useState, useMemo } from "react";
import { IconTable, IconDownload, IconFilter } from "@tabler/icons-react";
import { useFlgoStore } from "@/store/flgo-store";
import { useVesselStore } from "@/store/vessel-store";

// ── Date helpers ─────────────────────────────────────────────────────────────
function normalizeDate(d: string): string {
  return d.replace(/\//g, "-");
}

function fmtDisplayDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function fmtTableDate(raw: string): string {
  if (!raw) return "—";
  try {
    const n = normalizeDate(raw);
    const dt = new Date(n);
    if (isNaN(dt.getTime())) return raw;
    const d = String(dt.getDate()).padStart(2, "0");
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${d}.${m}.${dt.getFullYear()}`;
  } catch { return raw; }
}

function fmtVol(v: number): string {
  return v.toLocaleString("de-DE");
}

// Load image for jsPDF (used for logo only — no html2canvas)
async function loadImageDataUrl(src: string): Promise<{ data: string; fmt: "JPEG" | "PNG" }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      const isJpeg = /\.jpe?g$/i.test(src);
      resolve({ data: c.toDataURL(isJpeg ? "image/jpeg" : "image/png"), fmt: isJpeg ? "JPEG" : "PNG" });
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FinalReportView() {
  const measurements = useFlgoStore((s) => s.measurements);
  const bunkerings   = useFlgoStore((s) => s.bunkerings);
  const vessel     = useVesselStore((s) => s.assignedVessel);
  const vesselList = useVesselStore((s) => s.vesselList);
  const isAdmin    = !vessel;

  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [fuelType,       setFuelType]       = useState("");
  const [selectedVessel, setSelectedVessel] = useState(vessel || "");
  const [exporting,      setExporting]      = useState(false);

  const allRecords = useMemo(
    () => [...measurements, ...bunkerings],
    [measurements, bunkerings]
  );

  const uniqueFuelTypes = useMemo(
    () =>
      [...new Set(
        allRecords.flatMap((r) => r.tanks.map((t) => t.fuelType)).filter(Boolean)
      )].sort(),
    [allRecords]
  );

  const { tankNames, rows, totals, grandTotal } = useMemo(() => {
    const filtered = allRecords.filter((r) => {
      const recDate = normalizeDate(r.date);
      if (dateFrom       && recDate < dateFrom)                            return false;
      if (dateTo         && recDate > dateTo)                              return false;
      if (fuelType       && !r.tanks.some((t) => t.fuelType === fuelType)) return false;
      if (selectedVessel && r.vessel !== selectedVessel)                   return false;
      return true;
    });

    const tankSet = new Set<string>();
    filtered.forEach((r) =>
      r.tanks
        .filter((t) => !fuelType || t.fuelType === fuelType)
        .forEach((t) => tankSet.add(t.tankName))
    );
    const tankNames = [...tankSet].sort();

    const byDate = new Map<string, Record<string, number>>();
    filtered.forEach((r) => {
      const key = normalizeDate(r.date);
      if (!byDate.has(key)) byDate.set(key, {});
      const entry = byDate.get(key)!;
      r.tanks
        .filter((t) => !fuelType || t.fuelType === fuelType)
        .forEach((t) => {
          const v = parseFloat(t.reportVolume);
          entry[t.tankName] = (entry[t.tankName] ?? 0) + (isNaN(v) ? 0 : v);
        });
    });

    const rows = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([isoDate, vals]) => ({ isoDate, vals }));

    const totals: Record<string, number> = {};
    tankNames.forEach((n) => {
      totals[n] = rows.reduce((s, r) => s + (r.vals[n] ?? 0), 0);
    });
    const grandTotal = tankNames.reduce((s, n) => s + (totals[n] ?? 0), 0);

    return { tankNames, rows, totals, grandTotal };
  }, [allRecords, dateFrom, dateTo, fuelType]);

  // ── PDF export — pure jsPDF, NO html2canvas (avoids oklch/lab crash) ────────
  async function handleExport() {
    if (exporting || rows.length === 0) return;
    setExporting(true);
    try {
      const jsPDF = (await import("jspdf")).default;

      const pdf   = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();   // 297
      const pageH = pdf.internal.pageSize.getHeight();  // 210
      const margin = 14;

      // ── Logo ──
      try {
        const { data, fmt } = await loadImageDataUrl("/logo.jpg");
        pdf.addImage(data, fmt, pageW - 70, 6, 60, 20);
      } catch { /* logo unavailable */ }

      // ── Title ──
      pdf.setFontSize(15);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(14, 74, 110);
      pdf.text("FLGO — Final Report", margin, 15);

      // ── Metadata ──
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      const fromLabel = dateFrom ? fmtDisplayDate(dateFrom) : "All time";
      const toLabel   = dateTo   ? fmtDisplayDate(dateTo)   : "Present";
      pdf.text(`Vessel:      ${selectedVessel || "—"}`,        margin, 24);
      pdf.text(`Period:      ${fromLabel} – ${toLabel}`,      margin, 30);
      pdf.text(`Fuel Type:  ${fuelType || "All fuel types"}`, margin, 36);

      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      const generatedOn = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      pdf.text(`Generated: ${generatedOn}`, pageW - 70, 36);

      // ── Separator ──
      pdf.setDrawColor(14, 74, 110);
      pdf.setLineWidth(0.5);
      pdf.line(margin, 41, pageW - margin, 41);

      // ── Table layout ──
      const tableW   = pageW - margin * 2;
      const rowH     = 8;    // mm per data row
      const headH    = 9;    // mm for header row
      const totalsH  = 9;    // mm for totals row
      const startY   = 45;

      // Column widths: Date fixed, Total fixed, rest shared equally
      const dateW  = 30;
      const totalW = 28;
      const nTanks = tankNames.length;
      const tankW  = nTanks > 0 ? Math.max(20, (tableW - dateW - totalW) / nTanks) : tableW - dateW - totalW;
      const allCols   = ["Date", ...tankNames, "Total"];
      const colWidths = [dateW, ...tankNames.map(() => tankW), totalW];

      function getX(colIdx: number) {
        let x = margin;
        for (let i = 0; i < colIdx; i++) x += colWidths[i];
        return x;
      }

      // Draw one header row at position y, returns next y
      function drawHeader(y: number) {
        // Fill
        pdf.setFillColor(14, 74, 110);
        pdf.rect(margin, y, tableW, headH, "F");
        // Text
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        allCols.forEach((col, i) => {
          const cellX = getX(i);
          const cx = cellX + colWidths[i] / 2;
          pdf.text(col.toUpperCase(), cx, y + headH / 2 + 1.5, { align: "center" });
        });
        return y + headH;
      }

      let y = drawHeader(startY);
      let pageNum = 1;

      // Draw data rows
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);

      rows.forEach((row, rowIdx) => {
        // Page break check (leave room for totals row)
        if (y + rowH + totalsH > pageH - margin) {
          pdf.addPage();
          pageNum++;
          // Footer on previous page
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(148, 163, 184);
          pdf.text("RIVEROS · River Operating System", margin, pageH - 5);
          pdf.text(`Page ${pageNum - 1}`, pageW - margin, pageH - 5, { align: "right" });
          y = drawHeader(margin);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
        }

        // Alternating row bg
        if (rowIdx % 2 === 1) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, y, tableW, rowH, "F");
        }

        // Row divider
        pdf.setDrawColor(230, 235, 240);
        pdf.setLineWidth(0.1);
        pdf.line(margin, y + rowH, margin + tableW, y + rowH);

        const rowTotal = tankNames.reduce((s, n) => s + (row.vals[n] ?? 0), 0);

        allCols.forEach((_, i) => {
          const cellX = getX(i);
          const isDate = i === 0;
          const isTotal = i === allCols.length - 1;
          const val = isDate
            ? fmtTableDate(row.isoDate)
            : isTotal
            ? fmtVol(rowTotal)
            : fmtVol(row.vals[tankNames[i - 1]] ?? 0);

          pdf.setTextColor(isDate ? 4 : isTotal ? 4 : 3, isDate ? 17 : isTotal ? 17 : 105, isDate ? 31 : isTotal ? 31 : 161);
          if (isDate) {
            pdf.setFont("helvetica", "bold");
          } else {
            pdf.setFont("helvetica", "normal");
          }

          const textX = isDate ? cellX + 2 : cellX + colWidths[i] - 2;
          pdf.text(val, textX, y + rowH / 2 + 1.5, { align: isDate ? "left" : "right" });
        });

        y += rowH;
      });

      // ── Totals row ──
      if (y + totalsH > pageH - margin) {
        pdf.addPage();
        pageNum++;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text("RIVEROS · River Operating System", margin, pageH - 5);
        y = margin;
      }

      // Top border for totals
      pdf.setDrawColor(14, 74, 110);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, margin + tableW, y);

      // Fill
      pdf.setFillColor(224, 236, 245);
      pdf.rect(margin, y, tableW, totalsH, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);

      allCols.forEach((_, i) => {
        const cellX = getX(i);
        const isLabel = i === 0;
        const val = isLabel
          ? "TOTAL"
          : i === allCols.length - 1
          ? fmtVol(grandTotal)
          : fmtVol(totals[tankNames[i - 1]] ?? 0);

        pdf.setTextColor(14, 74, 110);
        const textX = isLabel ? cellX + 2 : cellX + colWidths[i] - 2;
        pdf.text(val, textX, y + totalsH / 2 + 1.5, { align: isLabel ? "left" : "right" });
      });

      // ── Footer on last page ──
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text("RIVEROS · River Operating System", margin, pageH - 5);
      pdf.text(`Page ${pageNum}`, pageW - margin, pageH - 5, { align: "right" });

      pdf.save(`flgo-final-report-${dateFrom || "all"}-${dateTo || "all"}.pdf`);
    } catch (err) {
      console.error("[FinalReport] PDF export error:", err);
    } finally {
      setExporting(false);
    }
  }

  const hasFilter = !!(dateFrom || dateTo || fuelType);

  return (
    <div
      className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 px-6 py-3.5 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #0e4a6e 0%, #0369a1 100%)" }}
      >
        <div className="flex items-center gap-2.5">
          <IconTable size={15} stroke={2} style={{ color: "rgba(255,255,255,0.60)" }} />
          <h2 className="text-[13px] font-bold text-white tracking-[0.18em] uppercase">
            Final Report
          </h2>
          {rows.length > 0 && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.75)" }}
            >
              {rows.length} dates
            </span>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || rows.length === 0}
          className="flex items-center gap-1.5 px-4 h-8 rounded-lg text-[12.5px] font-semibold text-[#0e4a6e] bg-white hover:bg-slate-50 transition-colors disabled:opacity-40"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }}
        >
          <IconDownload size={14} stroke={2.5} />
          {exporting ? "Exporting…" : "Export PDF"}
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-slate-100 flex items-center gap-4 flex-wrap bg-slate-50/60">
        <div className="flex items-center gap-1.5">
          <IconFilter size={13} stroke={2} className="text-slate-400" />
          <span className="text-[11px] font-bold text-[#0a3d6b] uppercase tracking-widest">
            Filters
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11.5px] font-semibold text-slate-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-[12.5px] font-medium text-[#04111f] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11.5px] font-semibold text-slate-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-[12.5px] font-medium text-[#04111f] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11.5px] font-semibold text-slate-500">Fuel Type</label>
          <select
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value)}
            className="text-[12.5px] font-semibold text-[#04111f] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          >
            <option value="">All types</option>
            {uniqueFuelTypes.map((ft) => (
              <option key={ft} value={ft}>{ft}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11.5px] font-semibold text-slate-500">Vessel</label>
          {isAdmin ? (
            <select
              value={selectedVessel}
              onChange={(e) => setSelectedVessel(e.target.value)}
              className="text-[12.5px] font-semibold text-[#04111f] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            >
              <option value="">All vessels</option>
              {vesselList.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          ) : (
            <span className="text-[12.5px] font-semibold text-[#04111f]">{vessel || "—"}</span>
          )}
        </div>
        {hasFilter && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); setFuelType(""); }}
            className="text-[11.5px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 min-h-0 overflow-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(3,105,161,0.07)" }}
              >
                <IconTable size={26} stroke={1.4} style={{ color: "#0369a1" }} />
              </div>
              <p className="text-[14px] font-semibold text-[#04111f]">No data for selected filters</p>
              <p className="text-[12.5px] text-slate-400 text-center max-w-xs">
                {hasFilter
                  ? "No records found. Try widening the date range or clearing filters."
                  : "No FLGO records available yet."}
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr style={{ background: "rgba(241,245,249,1)", borderBottom: "2px solid rgba(3,105,161,0.18)" }}>
                  <th className="px-4 py-2.5 text-center text-[13px] font-bold uppercase tracking-wider whitespace-nowrap w-32"
                      style={{ color: "#0e4a6e" }}>
                    Date
                  </th>
                  {tankNames.map((name) => (
                    <th
                      key={name}
                      className="px-4 py-2.5 text-center text-[13px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: "#0e4a6e" }}
                    >
                      {name}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-center text-[13px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: "#0e4a6e" }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rowTotal = tankNames.reduce((s, n) => s + (row.vals[n] ?? 0), 0);
                  return (
                    <tr
                      key={row.isoDate}
                      className="border-b border-slate-50 hover:bg-blue-50/20 transition-colors"
                      style={{ backgroundColor: i % 2 === 0 ? "white" : "rgba(248,250,252,0.5)" }}
                    >
                      <td className="px-4 py-2.5 text-[13.5px] font-semibold text-[#04111f] whitespace-nowrap text-center">
                        {fmtTableDate(row.isoDate)}
                      </td>
                      {tankNames.map((name) => (
                        <td
                          key={name}
                          className="px-4 py-2.5 text-center text-[13px] tabular-nums whitespace-nowrap"
                          style={{ color: "#0369a1" }}
                        >
                          {fmtVol(row.vals[name] ?? 0)}
                        </td>
                      ))}
                      <td
                        className="px-4 py-2.5 text-center text-[13px] font-semibold tabular-nums whitespace-nowrap"
                        style={{ color: "#04111f" }}
                      >
                        {fmtVol(rowTotal)}
                      </td>
                    </tr>
                  );
                })}

                {/* Totals row */}
                <tr
                  style={{
                    background: "rgba(14,74,110,0.06)",
                    borderTop:  "2px solid rgba(14,74,110,0.20)",
                  }}
                >
                  <td className="px-4 py-3 text-[13px] font-bold text-[#0e4a6e] uppercase tracking-wider whitespace-nowrap text-center">
                    Total
                  </td>
                  {tankNames.map((name) => (
                    <td
                      key={name}
                      className="px-4 py-3 text-center text-[13px] font-bold tabular-nums whitespace-nowrap"
                      style={{ color: "#0369a1" }}
                    >
                      {fmtVol(totals[name] ?? 0)}
                    </td>
                  ))}
                  <td
                    className="px-4 py-3 text-center text-[13px] font-bold tabular-nums whitespace-nowrap"
                    style={{ color: "#04111f" }}
                  >
                    {fmtVol(grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
    </div>
  );
}
