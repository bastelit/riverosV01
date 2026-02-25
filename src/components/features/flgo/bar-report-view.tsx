"use client";

import { useState, useMemo, useRef } from "react";
import { IconChartBar, IconDownload, IconFilter } from "@tabler/icons-react";
import { useFlgoStore } from "@/store/flgo-store";
import { useVesselStore } from "@/store/vessel-store";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from "recharts";

// ── Date helpers ─────────────────────────────────────────────────────────────
// Ragic stores dates as "YYYY/MM/DD"; HTML input gives "YYYY-MM-DD".
// Normalize before string comparison so filters work correctly.
function normalizeDate(d: string): string {
  return d.replace(/\//g, "-");
}

// Display format for PDF metadata: "YYYY-MM-DD" → "DD.MM.YYYY"
function fmtDisplayDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

// X-axis label: "YYYY/MM/DD" → "YYYY/MM/DD" (keep as-is, ref style)
function fmtAxisDate(raw: string): string {
  if (!raw) return raw;
  try {
    const n = normalizeDate(raw);
    const dt = new Date(n);
    if (isNaN(dt.getTime())) return raw;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}/${m}/${day}`;
  } catch { return raw; }
}

// Load image as data-URL for embedding in jsPDF
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
      resolve({
        data: c.toDataURL(isJpeg ? "image/jpeg" : "image/png"),
        fmt: isJpeg ? "JPEG" : "PNG",
      });
    };
    img.onerror = reject;
    img.src = src;
  });
}

const chartConfig: ChartConfig = {
  measurement: { label: "Measurement", color: "#3b82f6" },
  bunkering:   { label: "Bunkering",   color: "#22c55e" },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function BarReportView() {
  const measurements  = useFlgoStore((s) => s.measurements);
  const bunkerings    = useFlgoStore((s) => s.bunkerings);
  const vessel     = useVesselStore((s) => s.assignedVessel);
  const vesselList = useVesselStore((s) => s.vesselList);
  const isAdmin    = !vessel;

  const [dateFrom,        setDateFrom]        = useState("");
  const [dateTo,          setDateTo]          = useState("");
  const [fuelType,        setFuelType]        = useState("");
  const [selectedVessel,  setSelectedVessel]  = useState(vessel || "");
  const [exporting, setExporting] = useState(false);

  const chartAreaRef = useRef<HTMLDivElement>(null); // captures only chart

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

  const chartData = useMemo(() => {
    const filtered = allRecords.filter((r) => {
      const recDate = normalizeDate(r.date);
      if (dateFrom        && recDate < dateFrom)                          return false;
      if (dateTo          && recDate > dateTo)                            return false;
      if (fuelType        && !r.tanks.some((t) => t.fuelType === fuelType)) return false;
      if (selectedVessel  && r.vessel !== selectedVessel)                 return false;
      return true;
    });

    const dateMap = new Map<string, { measurement: number; bunkering: number }>();

    for (const record of filtered) {
      const key = normalizeDate(record.date); // use normalized key for dedup
      if (!dateMap.has(key)) dateMap.set(key, { measurement: 0, bunkering: 0 });
      const entry = dateMap.get(key)!;

      const tanks = fuelType
        ? record.tanks.filter((t) => t.fuelType === fuelType)
        : record.tanks;

      const total = tanks.reduce((sum, t) => {
        const v = parseFloat(t.reportVolume);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);

      if (record.entryType === "Measurement") entry.measurement += total;
      else                                    entry.bunkering   += total;
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([isoDate, vals]) => ({
        isoDate,
        date:        fmtAxisDate(isoDate),
        measurement: Math.round(vals.measurement),
        bunkering:   Math.round(vals.bunkering),
        total:       Math.round(vals.measurement + vals.bunkering),
      }));
  }, [allRecords, dateFrom, dateTo, fuelType]);

  // Show every date on x-axis
  const tickInterval = 0;

  async function handleExport() {
    if (!chartAreaRef.current || exporting || chartData.length === 0) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF       = (await import("jspdf")).default;

      // Capture the chart area
      const canvas = await html2canvas(chartAreaRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const pdf    = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW  = pdf.internal.pageSize.getWidth();   // 297
      const pageH  = pdf.internal.pageSize.getHeight();  // 210

      // ── River Advice logo (top right) ──
      try {
        const { data, fmt } = await loadImageDataUrl("/logo.jpg");
        pdf.addImage(data, fmt, pageW - 70, 6, 60, 20);
      } catch { /* logo unavailable — skip */ }

      // ── Report title ──
      pdf.setFontSize(15);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(14, 74, 110);
      pdf.text("FLGO — Bar Report", 14, 15);

      // ── Metadata ──
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      const fromLabel = dateFrom ? fmtDisplayDate(dateFrom) : "All time";
      const toLabel   = dateTo   ? fmtDisplayDate(dateTo)   : "Present";
      pdf.text(`Vessel:      ${selectedVessel || "—"}`,           14, 24);
      pdf.text(`Period:      ${fromLabel} – ${toLabel}`,         14, 30);
      pdf.text(`Fuel Type:  ${fuelType || "All fuel types"}`,    14, 36);

      const generatedOn = new Date().toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      });
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Generated: ${generatedOn}`, pageW - 70, 36);

      // ── Separator line ──
      pdf.setDrawColor(14, 74, 110);
      pdf.setLineWidth(0.5);
      pdf.line(14, 41, pageW - 14, 41);

      // ── Chart image ──
      const imgData  = canvas.toDataURL("image/png");
      const headerH  = 44;
      const availW   = pageW - 28;
      const availH   = pageH - headerH - 14;
      const imgH     = Math.min(availH, (canvas.height * availW) / canvas.width);
      pdf.addImage(imgData, "PNG", 14, headerH, availW, imgH);

      // ── Footer ──
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text("RIVEROS · River Operating System", 14, pageH - 5);

      pdf.save(`flgo-bar-report-${dateFrom || "all"}-${dateTo || "all"}.pdf`);
    } catch (err) {
      console.error("[BarReport] PDF export error:", err);
    } finally {
      setExporting(false);
    }
  }

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
          <IconChartBar size={15} stroke={2} style={{ color: "rgba(255,255,255,0.60)" }} />
          <h2 className="text-[13px] font-bold text-white tracking-[0.18em] uppercase">
            Bar Report
          </h2>
          {chartData.length > 0 && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.75)" }}
            >
              {chartData.length} dates
            </span>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || chartData.length === 0}
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
            <option value="">All fuel types</option>
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
        {(dateFrom || dateTo || fuelType) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); setFuelType(""); }}
            className="text-[11.5px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Chart ── */}
      <div className="flex-1 min-h-0 overflow-auto px-6 py-5">
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(3,105,161,0.07)" }}
            >
              <IconChartBar size={26} stroke={1.4} style={{ color: "#0369a1" }} />
            </div>
            <p className="text-[14px] font-semibold text-[#04111f]">No data for selected filters</p>
            <p className="text-[12.5px] text-slate-400 text-center max-w-xs">
              {dateFrom || dateTo
                ? "No records found in the selected date range. Make sure the From/To dates cover the period you want."
                : "No FLGO records available yet."}
            </p>
          </div>
        ) : (
          <div ref={chartAreaRef}>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[400px] w-full"
            >
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 16, bottom: 60, left: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
                  interval={tickInterval}
                  angle={-55}
                  textAnchor="end"
                  height={72}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v.toLocaleString("de-DE")}
                  width={78}
                />
                <ChartTooltip
                  cursor={{ fill: "rgba(3,105,161,0.05)" }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        typeof value === "number"
                          ? value.toLocaleString("de-DE")
                          : value
                      }
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="measurement"
                  stackId="vol"
                  fill="var(--color-measurement)"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="bunkering"
                  stackId="vol"
                  fill="var(--color-bunkering)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={36}
                >
                  <LabelList
                    dataKey="total"
                    position="top"
                    style={{ fontSize: 9, fill: "#334155", fontWeight: 600 }}
                    formatter={(v: number) => v > 0 ? v.toLocaleString("de-DE") : ""}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </div>
    </div>
  );
}
