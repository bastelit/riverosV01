"use client";

import { useState, useEffect, useMemo } from "react";
import { IconPlus, IconPencil, IconClipboardList, IconFilter, IconX } from "@tabler/icons-react";
import { useFlgoStore } from "@/store/flgo-store";

interface MeasurementListProps {
  onNew:  () => void;
  onEdit: (ragicId: string) => void;
}

function normalizeDate(d: string) { return d.replace(/\//g, "-"); }

// ── Volume cell ───────────────────────────────────────────────────────────────
function VolCell({ value }: { value: string }) {
  const num = parseFloat(value);
  if (isNaN(num) || num === 0) return <span className="text-slate-300 text-[13px]">—</span>;
  return (
    <span className="text-[14px] font-medium text-[#04111f] tabular-nums">
      {num.toLocaleString("de-DE")}
    </span>
  );
}

// ── % Filled pill ─────────────────────────────────────────────────────────────
function FilledPill({ value }: { value: string }) {
  const num = parseFloat(value);
  if (isNaN(num)) return <span className="text-slate-300 text-[13px]">—</span>;
  const pct = Math.min(100, Math.max(0, num));
  const scheme =
    pct >= 80
      ? { bar: "#16a34a", bg: "rgba(22,163,74,0.10)",  text: "#15803d", border: "rgba(22,163,74,0.25)" }
      : pct >= 50
      ? { bar: "#d97706", bg: "rgba(217,119,6,0.10)",  text: "#b45309", border: "rgba(217,119,6,0.25)" }
      : { bar: "#dc2626", bg: "rgba(220,38,38,0.10)", text: "#dc2626", border: "rgba(220,38,38,0.25)" };
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1.5 rounded-full bg-slate-100 flex-shrink-0">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: scheme.bar }} />
      </div>
      <span
        className="text-[12px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
        style={{ background: scheme.bg, color: scheme.text, border: `1px solid ${scheme.border}` }}
      >
        {Math.round(pct)}%
      </span>
    </div>
  );
}

function fmtDate(d: string) {
  if (!d) return "—";
  try {
    return new Date(normalizeDate(d)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
}

function SkeletonRow({ i }: { i: number }) {
  return (
    <tr className="border-b border-slate-50"
        style={{ backgroundColor: i % 2 === 0 ? "white" : "rgba(248,250,252,0.6)" }}>
      {[110, 60, 130, 70, 70, 70, 70, 56].map((w, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-3.5 rounded bg-slate-100 animate-pulse" style={{ width: `${w}px` }} />
        </td>
      ))}
    </tr>
  );
}

const COLS = ["Date", "Time", "Done By", "Fresh Water", "Fuel", "Lube Oil", "AdBlue", "% Filled", ""];

// ── Component ─────────────────────────────────────────────────────────────────
export default function MeasurementList({ onNew, onEdit }: MeasurementListProps) {
  const measurements = useFlgoStore((s) => s.measurements);
  const hasFetched   = useFlgoStore((s) => s.hasFetched);
  const isLoading    = useFlgoStore((s) => s.isLoading);
  const setLoading   = useFlgoStore((s) => s.setLoading);
  const setRecords   = useFlgoStore((s) => s.setRecords);
  const setError     = useFlgoStore((s) => s.setError);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  useEffect(() => {
    if (hasFetched || isLoading) return;
    setLoading(true);
    fetch("/api/ragic/flgo/records")
      .then((r) => r.json())
      .then((data) => {
        if (data.records) setRecords(data.records);
        else setError(data.error ?? "Failed to load records.");
      })
      .catch(() => setError("Failed to load records."))
      .finally(() => setLoading(false));
  }, [hasFetched, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const showSkeleton = isLoading && !hasFetched;
  const hasFilter    = !!(dateFrom || dateTo);

  const sorted = useMemo(() => {
    const base = [...measurements].sort((a, b) => {
      const da = a.date ? new Date(normalizeDate(a.date)).getTime() : 0;
      const db = b.date ? new Date(normalizeDate(b.date)).getTime() : 0;
      return db - da;
    });
    return base.filter((r) => {
      const rd = normalizeDate(r.date);
      if (dateFrom && rd < dateFrom) return false;
      if (dateTo   && rd > dateTo)   return false;
      return true;
    });
  }, [measurements, dateFrom, dateTo]);

  const ColHead = () => (
    <thead className="sticky top-0 z-10">
      <tr style={{ background: "rgba(241,245,249,1)", borderBottom: "2px solid rgba(3,105,161,0.18)" }}>
        {COLS.map((c, i) => (
          <th
            key={i}
            className="px-4 py-3 text-center text-[13px] font-bold uppercase tracking-wider whitespace-nowrap"
            style={{ color: "#0e4a6e" }}
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div
      className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
    >
      {/* ── Header band ── */}
      <div
        className="flex-shrink-0 px-6 py-3.5 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #0e4a6e 0%, #0369a1 100%)" }}
      >
        <div className="flex items-center gap-2.5">
          <IconClipboardList size={15} stroke={2} style={{ color: "rgba(255,255,255,0.60)" }} />
          <h2 className="text-[13px] font-bold text-white tracking-[0.18em] uppercase">
            Measurement History
          </h2>
          {hasFetched && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.75)" }}
            >
              {hasFilter ? `${sorted.length} / ${measurements.length}` : sorted.length}
            </span>
          )}
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-4 h-8 rounded-lg text-[12.5px] font-semibold text-[#0e4a6e] bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }}
        >
          <IconPlus size={14} stroke={2.5} />
          New Measurement
        </button>
      </div>

      {/* ── Content: left filter panel + right table ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* ── Left filter panel ── */}
        <div
          className="w-52 flex-shrink-0 flex flex-col gap-5 p-5 overflow-y-auto border-r border-slate-100"
          style={{ background: "rgba(248,250,252,0.7)" }}
        >
          <div className="flex items-center gap-1.5">
            <IconFilter size={13} stroke={2} style={{ color: "#0369a1" }} />
            <span className="text-[11px] font-bold text-[#0a3d6b] uppercase tracking-widest">
              Filter by Date
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-[12px] font-medium text-[#04111f] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-[12px] font-medium text-[#04111f] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            />
          </div>

          {hasFilter && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 rounded-lg py-1.5 transition-colors"
            >
              <IconX size={12} stroke={2.5} />
              Clear filters
            </button>
          )}

          {/* Result count */}
          {hasFilter && hasFetched && (
            <div
              className="mt-auto text-center py-2 rounded-lg text-[11.5px] font-semibold"
              style={{ background: "rgba(3,105,161,0.08)", color: "#0369a1" }}
            >
              {sorted.length} record{sorted.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* ── Right table ── */}
        <div className="flex-1 min-h-0 overflow-auto">
          {showSkeleton ? (
            <table className="w-full border-collapse">
              <ColHead />
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} i={i} />)}
              </tbody>
            </table>

          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(3,105,161,0.07)" }}
              >
                <IconClipboardList size={26} stroke={1.4} style={{ color: "#0369a1" }} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-[#04111f]">
                  {hasFilter ? "No records match the selected dates" : "No measurements yet"}
                </p>
                <p className="text-[12.5px] text-slate-400 mt-1">
                  {hasFilter
                    ? "Try widening the date range or clear the filters."
                    : <> Tap <span className="font-semibold text-[#0369a1]">New Measurement</span> to add the first entry.</>}
                </p>
              </div>
            </div>

          ) : (
            <table className="w-full border-collapse">
              <ColHead />
              <tbody>
                {sorted.map((rec, i) => (
                  <tr
                    key={rec.ragicId}
                    className="border-b border-slate-50 hover:bg-sky-50/30 transition-colors"
                    style={{ backgroundColor: i % 2 === 0 ? "white" : "rgba(248,250,252,0.5)" }}
                  >
                    <td className="px-4 py-2.5 text-[14px] font-semibold text-[#04111f] whitespace-nowrap">
                      {fmtDate(rec.date)}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap tabular-nums">
                      {rec.time || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-600 whitespace-nowrap">
                      {rec.doneBy || "—"}
                    </td>
                    <td className="px-4 py-2.5"><VolCell value={rec.waterTotalVolume} /></td>
                    <td className="px-4 py-2.5"><VolCell value={rec.fuelTotalVolume} /></td>
                    <td className="px-4 py-2.5"><VolCell value={rec.lubeTotalVolume} /></td>
                    <td className="px-4 py-2.5"><VolCell value={rec.adBlueTotalVolume} /></td>
                    <td className="px-4 py-2.5 min-w-[120px]">
                      <FilledPill value={rec.percentageFilled} />
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => onEdit(rec.ragicId)}
                        className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap"
                        style={{
                          color:      "#0369a1",
                          background: "rgba(3,105,161,0.06)",
                          border:     "1px solid rgba(3,105,161,0.18)",
                        }}
                      >
                        <IconPencil size={12} stroke={2} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
