"use client";

import { useState, useRef } from "react";
import { Ship, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useVesselStore } from "@/store/vessel-store";
import type { Tank } from "@/store/vessel-store";

interface MeasurementViewProps {
  vessel: string;
  vesselAbbr: string;
}

// Fuel badge colours — exact hex values as specified
function fuelBadgeStyle(fuelType: string): React.CSSProperties {
  const t = fuelType.toLowerCase();
  if (t.includes("fresh water") || t.includes("water")) {
    return { background: "rgba(51,102,255,0.10)", color: "#3366ff", border: "1px solid rgba(51,102,255,0.20)" };
  }
  if (t.includes("lube") || t.includes("schmierstoff")) {
    return { background: "#666666", color: "#ffffff", border: "1px solid #555555" };
  }
  if (t.includes("fuel") || t.includes("diesel") || t.includes("kraftstoff") || t.includes("mgo") || t.includes("hfo")) {
    return { background: "rgba(255,102,102,0.10)", color: "#ff6666", border: "1px solid rgba(255,102,102,0.25)" };
  }
  return { background: "rgba(100,116,139,0.10)", color: "#475569", border: "1px solid rgba(100,116,139,0.20)" };
}

export default function MeasurementView({ vessel, vesselAbbr }: MeasurementViewProps) {
  const storeTanks    = useVesselStore((s) => s.tanks);
  const vesselList    = useVesselStore((s) => s.vesselList);

  // ── Admin detection ──────────────────────────────────────────────────────
  // A user with no assigned vessel is treated as admin → sees vessel selector
  const isAdmin = !vessel;

  // ── Core state ───────────────────────────────────────────────────────────
  const now = new Date();
  const [date, setDate]   = useState(now.toISOString().split("T")[0]);
  const [time, setTime]   = useState(now.toTimeString().slice(0, 5));

  // Active vessel — fixed for normal users, selectable for admin
  const [selectedVessel, setSelectedVessel] = useState(vessel);

  // Active tanks — from Zustand for normal users; fetched on select for admin
  const [activeTanks, setActiveTanks]       = useState<Tank[]>(isAdmin ? [] : storeTanks);
  const [loadingTanks, setLoadingTanks]     = useState(false);

  // Volume inputs
  const [actualVolumes, setActualVolumes]   = useState<Record<number, string>>({});

  // Submit state
  const [submitting, setSubmitting]         = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess]   = useState(false);

  // ── Refs for Enter-key navigation ────────────────────────────────────────
  const inputRefs      = useRef<(HTMLInputElement | null)[]>([]);
  const submitBtnRef   = useRef<HTMLButtonElement>(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  const filledCount = activeTanks.filter((_, i) => (actualVolumes[i] ?? "").trim() !== "").length;
  const totalCount  = activeTanks.length;
  const progress    = totalCount > 0 ? (filledCount / totalCount) * 100 : 0;
  const allFilled   = totalCount > 0 && filledCount === totalCount;

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleVolumeChange(index: number, value: string) {
    setActualVolumes((prev) => ({ ...prev, [index]: value }));
  }

  // Feature 1: Enter → move focus to next input; on last input → focus submit
  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const next = index + 1;
    if (next < activeTanks.length) {
      inputRefs.current[next]?.focus();
    } else {
      submitBtnRef.current?.focus();
    }
  }

  // Feature 3: Admin selects a vessel → fetch its tanks from API
  async function handleVesselSelect(v: string) {
    if (!v) return;
    setSelectedVessel(v);
    setActualVolumes({});
    setSubmitSuccess(false);
    setSubmitError(null);
    setLoadingTanks(true);
    try {
      const res  = await fetch(`/api/ragic/flgo/tanks?vessel=${encodeURIComponent(v)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load tanks.");
      setActiveTanks(data.tanks ?? []);
    } catch {
      setActiveTanks([]);
    } finally {
      setLoadingTanks(false);
    }
  }

  // Feature 2: Submit → POST to Ragic via proxy route
  async function handleSubmit() {
    if (!allFilled || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      const res = await fetch("/api/ragic/flgo/measurement", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          time,
          vessel: selectedVessel,
          tanks: activeTanks.map((t, i) => ({
            ...t,
            actualVolume: actualVolumes[i] ?? "",
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed.");
      setSubmitSuccess(true);
      setActualVolumes({}); // reset inputs after success
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Shared label class ───────────────────────────────────────────────────
  const labelCls = "text-[11.5px] font-bold text-[#0a3d6b] uppercase tracking-widest flex-shrink-0";

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-3">

      {/* ── ① Vessel data strip ──────────────────────────────────── */}
      <div
        className="flex-shrink-0 bg-white rounded-2xl border border-slate-100 flex items-center divide-x divide-slate-100"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
      >
        {/* Vessel Name — read-only for normal users, dropdown for admin */}
        <div className="px-5 py-3 flex items-center gap-2.5 min-w-0 flex-1">
          <span className={labelCls}>Vessel</span>
          {isAdmin ? (
            // Admin: searchable select to pick any vessel
            <select
              value={selectedVessel}
              onChange={(e) => handleVesselSelect(e.target.value)}
              className="text-[13px] font-semibold text-[#04111f] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 max-w-[260px] focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            >
              <option value="">— Select vessel —</option>
              {vesselList.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          ) : (
            // Normal user: read-only display
            <span className="text-[13.5px] font-bold text-[#04111f] truncate">
              {vessel || "—"}
            </span>
          )}
        </div>

        <div className="px-5 py-3 flex items-center gap-2.5 flex-shrink-0">
          <span className={labelCls}>Abbr.</span>
          <span className="text-[13.5px] font-bold text-[#04111f]">
            {isAdmin ? (selectedVessel ? "—" : "—") : (vesselAbbr || "—")}
          </span>
        </div>

        <div className="px-5 py-3 flex items-center gap-2.5 flex-shrink-0">
          <span className={labelCls}>Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-[12.5px] font-medium text-[#04111f] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          />
        </div>

        <div className="px-5 py-3 flex items-center gap-2.5 flex-shrink-0">
          <span className={labelCls}>Time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="text-[12.5px] font-medium text-[#04111f] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      {/* ── ② Progress bar ───────────────────────────────────────── */}
      <div
        className="flex-shrink-0 bg-white rounded-2xl border border-slate-100 px-6 py-3 flex items-center gap-5"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
      >
        <span className={labelCls}>Progress</span>

        <div className="flex-1 relative h-4 rounded-full bg-slate-100 overflow-visible">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #0a3d6b 0%, #2563eb 100%)",
            }}
          />
          <div
            className="absolute top-1/2 transition-all duration-500 z-10"
            style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
          >
            <div
              className="w-7 h-7 rounded-full bg-white flex items-center justify-center border-2"
              style={{
                borderColor: progress > 0 ? "#2563eb" : "#cbd5e1",
                boxShadow: "0 1px 6px rgba(7,30,61,0.15)",
              }}
            >
              <Ship className="w-3.5 h-3.5" strokeWidth={1.75}
                style={{ color: progress > 0 ? "#2563eb" : "#94a3b8" }} />
            </div>
          </div>
        </div>

        <span
          className="text-[12px] font-semibold flex-shrink-0 min-w-[56px] text-right"
          style={{ color: allFilled ? "#16a34a" : "#94a3b8" }}
        >
          {allFilled ? "Done ✓" : `${filledCount} / ${totalCount}`}
        </span>
      </div>

      {/* ── ③ Tank table ─────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
      >
        {/* Dark header band — centered title */}
        <div
          className="flex-shrink-0 px-6 py-2.5 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #071e3d 0%, #0a3d6b 100%)" }}
        >
          <h2 className="text-[13px] font-bold text-white tracking-[0.2em] uppercase">
            Tank Details
          </h2>
        </div>

        {/* Loading state for admin vessel change */}
        {loadingTanks ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading tanks…
          </div>
        ) : activeTanks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-400 text-sm">
              {isAdmin && !selectedVessel
                ? "Select a vessel above to load tank data."
                : "No tanks found for this vessel."}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Fuel Type", "Tank Name", "Max Capacity", "Last ROB", "Actual Volume"].map((col) => (
                  <th
                    key={col}
                    className="px-5 py-2.5 text-left text-[12px] font-bold text-[#1e3a5f] uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeTanks.map((tank, i) => {
                const val     = actualVolumes[i] ?? "";
                const isEmpty = val.trim() === "";
                return (
                  <tr
                    key={i}
                    className="border-b border-slate-50"
                    style={{ backgroundColor: i % 2 === 0 ? "white" : "rgba(248,250,252,0.6)" }}
                  >
                    <td className="px-5 py-2">
                      <span
                        className="inline-flex items-center px-2.5 py-[3px] rounded-md text-[11.5px] font-semibold whitespace-nowrap"
                        style={fuelBadgeStyle(tank.fuelType)}
                      >
                        {tank.fuelType || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-2 text-[13px] font-semibold text-[#04111f]">
                      {tank.tankName || "—"}
                    </td>
                    <td className="px-5 py-2 text-[13px] text-slate-500">
                      {tank.maxCapacity || "—"}
                    </td>
                    <td className="px-5 py-2 text-[13px] text-slate-500">
                      {tank.lastRob || "—"}
                    </td>
                    <td className="px-5 py-1.5">
                      {/* Feature 1: ref + Enter key handler */}
                      <input
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="number"
                        min="0"
                        value={val}
                        onChange={(e) => handleVolumeChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        placeholder="Enter volume"
                        className="w-36 text-[13px] font-medium text-[#04111f] rounded-lg px-3 py-1.5 border focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-400"
                        style={{
                          backgroundColor: isEmpty ? "rgba(251,146,60,0.09)" : "white",
                          borderColor:     isEmpty ? "rgba(249,115,22,0.35)" : "rgb(226,232,240)",
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── ④ Feedback + Submit ──────────────────────────────────── */}
      <div className="flex-shrink-0 flex flex-col items-center gap-2 pb-1">

        {/* Success banner */}
        {submitSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[13px] font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Measurement submitted successfully.
          </div>
        )}

        {/* Error banner */}
        {submitError && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {submitError}
          </div>
        )}

        {/* Submit button — focused via Enter on last input */}
        <button
          ref={submitBtnRef}
          onClick={handleSubmit}
          disabled={!allFilled || submitting}
          className="px-14 h-10 rounded-xl text-[13.5px] font-semibold text-white transition-all duration-200 flex items-center gap-2"
          style={
            allFilled && !submitting
              ? {
                  background: "linear-gradient(135deg, #071e3d 0%, #0a3d6b 100%)",
                  boxShadow: "0 4px 20px rgba(7,30,61,0.32)",
                }
              : { background: "#e2e8f0", color: "#94a3b8", cursor: "not-allowed" }
          }
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Submitting…" : "Submit Measurement"}
        </button>
      </div>
    </div>
  );
}
