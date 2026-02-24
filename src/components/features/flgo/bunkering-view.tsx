"use client";

import { useState, useRef } from "react";
import { Ship, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { useVesselStore } from "@/store/vessel-store";
import type { Tank } from "@/store/vessel-store";

interface BunkeringViewProps {
  vessel: string;
  vesselAbbr: string;
}

// Fuel badge colours — light tinted bg + brand colour text (matches measurement-view)
function fuelBadgeStyle(fuelType: string): React.CSSProperties {
  const t = fuelType.toLowerCase();
  if (t.includes("fresh water") || t.includes("water")) {
    return { background: "rgba(51,102,255,0.10)", color: "#3366ff", border: "1px solid rgba(51,102,255,0.20)" };
  }
  if (t.includes("lube") || t.includes("schmierstoff")) {
    return { background: "#666666", color: "#ffffff", border: "1px solid #555555" };
  }
  if (t.includes("fuel") || t.includes("diesel") || t.includes("kraftstoff") || t.includes("mgo") || t.includes("hfo") || t.includes("adblue")) {
    return { background: "rgba(255,102,102,0.10)", color: "#ff6666", border: "1px solid rgba(255,102,102,0.25)" };
  }
  return { background: "rgba(100,116,139,0.10)", color: "#475569", border: "1px solid rgba(100,116,139,0.20)" };
}

export default function BunkeringView({ vessel, vesselAbbr }: BunkeringViewProps) {
  const storeTanks  = useVesselStore((s) => s.tanks);
  const vesselList  = useVesselStore((s) => s.vesselList);

  const isAdmin = !vessel;

  // ── Core state ───────────────────────────────────────────────────────────
  const now = new Date();
  const [date, setDate] = useState(now.toISOString().split("T")[0]);
  const [time, setTime] = useState(now.toTimeString().slice(0, 5));

  const [selectedVessel, setSelectedVessel]     = useState(vessel);
  const [activeTanks, setActiveTanks]           = useState<Tank[]>(isAdmin ? [] : storeTanks);
  const [loadingTanks, setLoadingTanks]         = useState(false);

  const [selectedFuelType, setSelectedFuelType] = useState("");
  const [pendingFuelType, setPendingFuelType]   = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [actualVolumes, setActualVolumes]       = useState<Record<number, string>>({});
  const [bunkeredVolumes, setBunkeredVolumes]   = useState<Record<number, string>>({});

  const [submitting, setSubmitting]             = useState(false);
  const [submitError, setSubmitError]           = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess]       = useState(false);

  // ── Refs for Enter-key navigation ────────────────────────────────────────
  // Actual → Bunkered (same row) → Actual (next row) → … → Submit
  const actualRefs    = useRef<(HTMLInputElement | null)[]>([]);
  const bunkeredRefs  = useRef<(HTMLInputElement | null)[]>([]);
  const submitBtnRef  = useRef<HTMLButtonElement>(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  // Unique fuel types from the current vessel's tanks — drives dropdown options
  const uniqueFuelTypes = [...new Set(activeTanks.map((t) => t.fuelType).filter(Boolean))].sort();

  // Only tanks that match the selected fuel type
  const displayTanks = selectedFuelType
    ? activeTanks.filter((t) => t.fuelType === selectedFuelType)
    : [];

  // Progress tracks bunkered volumes
  const filledCount       = displayTanks.filter((_, i) => (bunkeredVolumes[i] ?? "").trim() !== "").length;
  const totalCount        = displayTanks.length;
  const progress          = totalCount > 0 ? (filledCount / totalCount) * 100 : 0;
  const allBunkeredFilled = totalCount > 0 && filledCount === totalCount;

  // Submit: at least one actual OR bunkered volume entered
  const hasAnyEntry =
    displayTanks.some((_, i) => (actualVolumes[i] ?? "").trim() !== "") ||
    displayTanks.some((_, i) => (bunkeredVolumes[i] ?? "").trim() !== "");
  const canSubmit = hasAnyEntry && !submitting && !!selectedFuelType && displayTanks.length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────

  function hasEnteredData() {
    return (
      Object.values(actualVolumes).some((v) => v.trim() !== "") ||
      Object.values(bunkeredVolumes).some((v) => v.trim() !== "")
    );
  }

  function attemptFuelTypeChange(newFuelType: string) {
    if (newFuelType === selectedFuelType) return;
    if (hasEnteredData()) {
      setPendingFuelType(newFuelType);
      setShowConfirmModal(true);
    } else {
      applyFuelTypeChange(newFuelType);
    }
  }

  function applyFuelTypeChange(fuelType: string) {
    setSelectedFuelType(fuelType);
    setActualVolumes({});
    setBunkeredVolumes({});
    setSubmitSuccess(false);
    setSubmitError(null);
    setShowConfirmModal(false);
    setPendingFuelType("");
  }

  // Admin: select vessel → fetch tanks → reset fuel type
  async function handleVesselSelect(v: string) {
    if (!v) return;
    setSelectedVessel(v);
    setSelectedFuelType("");
    setActualVolumes({});
    setBunkeredVolumes({});
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

  // Enter on Actual Volume → move to Bunkered Volume of same row
  function handleActualKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    bunkeredRefs.current[index]?.focus();
  }

  // Enter on Bunkered Volume → move to Actual Volume of next row; last row → Submit
  function handleBunkeredKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const next = index + 1;
    if (next < displayTanks.length) {
      actualRefs.current[next]?.focus();
    } else {
      submitBtnRef.current?.focus();
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      const res = await fetch("/api/ragic/flgo/bunkering", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          time,
          vessel:   selectedVessel,
          fuelType: selectedFuelType,
          tanks:    displayTanks.map((t, i) => ({
            ...t,
            actualVolume:   actualVolumes[i]   ?? "",
            bunkeredVolume: bunkeredVolumes[i] ?? "",
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed.");
      setSubmitSuccess(true);
      setActualVolumes({});
      setBunkeredVolumes({});
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
        {/* Vessel Name */}
        <div className="px-5 py-3 flex items-center gap-2.5 min-w-0 flex-1">
          <span className={labelCls}>Vessel</span>
          {isAdmin ? (
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
            <span className="text-[13.5px] font-bold text-[#04111f] truncate">
              {vessel || "—"}
            </span>
          )}
        </div>

        {/* Fuel Type dropdown — between Vessel and Abbr */}
        <div className="px-5 py-3 flex items-center gap-2.5 flex-shrink-0">
          <span className={labelCls}>Fuel Type</span>
          <select
            value={selectedFuelType}
            onChange={(e) => attemptFuelTypeChange(e.target.value)}
            disabled={loadingTanks || (isAdmin && !selectedVessel)}
            className="text-[13px] font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={
              !selectedFuelType
                ? {
                    background:  "rgba(251,146,60,0.12)",
                    borderColor: "rgba(249,115,22,0.40)",
                    color:       "#92400e",
                  }
                : {
                    background:  "rgba(248,250,252,1)",
                    borderColor: "rgb(226,232,240)",
                    color:       "#04111f",
                  }
            }
          >
            <option value="">— Select fuel type —</option>
            {uniqueFuelTypes.map((ft) => (
              <option key={ft} value={ft}>{ft}</option>
            ))}
          </select>
        </div>

        {/* Abbr */}
        <div className="px-5 py-3 flex items-center gap-2.5 flex-shrink-0">
          <span className={labelCls}>Abbr.</span>
          <span className="text-[13.5px] font-bold text-[#04111f]">
            {isAdmin ? "—" : (vesselAbbr || "—")}
          </span>
        </div>

        {/* Date */}
        <div className="px-5 py-3 flex items-center gap-2.5 flex-shrink-0">
          <span className={labelCls}>Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-[12.5px] font-medium text-[#04111f] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          />
        </div>

        {/* Time */}
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

      {/* ── ② Progress bar (tracks Bunkered Volume) ──────────────── */}
      <div
        className="flex-shrink-0 bg-white rounded-2xl border border-slate-100 px-6 py-3 flex items-center gap-5"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
      >
        <span className={labelCls}>Progress</span>

        <div className="flex-1 relative h-4 rounded-full bg-slate-100 overflow-visible">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
            style={{
              width:      `${progress}%`,
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
                boxShadow:   "0 1px 6px rgba(7,30,61,0.15)",
              }}
            >
              <Ship className="w-3.5 h-3.5" strokeWidth={1.75}
                style={{ color: progress > 0 ? "#2563eb" : "#94a3b8" }} />
            </div>
          </div>
        </div>

        <span
          className="text-[12px] font-semibold flex-shrink-0 min-w-[56px] text-right"
          style={{ color: allBunkeredFilled && totalCount > 0 ? "#16a34a" : "#94a3b8" }}
        >
          {allBunkeredFilled && totalCount > 0 ? "Done ✓" : `${filledCount} / ${totalCount}`}
        </span>
      </div>

      {/* ── ③ Tank table ─────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
      >
        {/* Dark header band */}
        <div
          className="flex-shrink-0 px-6 py-2.5 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #071e3d 0%, #0a3d6b 100%)" }}
        >
          <h2 className="text-[13px] font-bold text-white tracking-[0.2em] uppercase">
            Tank Details
          </h2>
        </div>

        {/* Loading state */}
        {loadingTanks ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading tanks…
          </div>

        ) : !selectedFuelType ? (
          /* No fuel type selected — prompt user */
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className="px-5 py-2 rounded-xl text-[13px] font-semibold"
                style={{
                  background:  "rgba(251,146,60,0.10)",
                  color:       "#92400e",
                  border:      "1px solid rgba(249,115,22,0.25)",
                }}
              >
                Select a fuel type above to load tank data.
              </div>
              {isAdmin && !selectedVessel && (
                <p className="text-slate-400 text-[12px]">Select a vessel first, then choose a fuel type.</p>
              )}
            </div>
          </div>

        ) : displayTanks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-400 text-sm">No tanks found for this fuel type.</p>
          </div>

        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Fuel Type", "Tank Name", "Max Capacity", "Last ROB", "Actual Volume", "Bunkered Volume"].map((col) => (
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
              {displayTanks.map((tank, i) => {
                const actualVal    = actualVolumes[i]   ?? "";
                const bunkeredVal  = bunkeredVolumes[i] ?? "";
                const actualEmpty  = actualVal.trim()   === "";
                const bunkeredEmpty = bunkeredVal.trim() === "";
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

                    {/* Actual Volume — light orange when empty */}
                    <td className="px-5 py-1.5">
                      <input
                        ref={(el) => { actualRefs.current[i] = el; }}
                        type="number"
                        min="0"
                        value={actualVal}
                        onChange={(e) => setActualVolumes((prev) => ({ ...prev, [i]: e.target.value }))}
                        onKeyDown={(e) => handleActualKeyDown(e, i)}
                        placeholder="Enter volume"
                        className="w-32 text-[13px] font-medium text-[#04111f] rounded-lg px-3 py-1.5 border focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-400"
                        style={{
                          backgroundColor: actualEmpty ? "rgba(251,146,60,0.09)" : "white",
                          borderColor:     actualEmpty ? "rgba(249,115,22,0.35)" : "rgb(226,232,240)",
                        }}
                      />
                    </td>

                    {/* Bunkered Volume — peach (#ffcc99) when empty */}
                    <td className="px-5 py-1.5">
                      <input
                        ref={(el) => { bunkeredRefs.current[i] = el; }}
                        type="number"
                        min="0"
                        value={bunkeredVal}
                        onChange={(e) => setBunkeredVolumes((prev) => ({ ...prev, [i]: e.target.value }))}
                        onKeyDown={(e) => handleBunkeredKeyDown(e, i)}
                        placeholder="Enter volume"
                        className="w-32 text-[13px] font-medium text-[#04111f] rounded-lg px-3 py-1.5 border focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all placeholder:text-slate-400"
                        style={{
                          backgroundColor: bunkeredEmpty ? "rgba(255,204,153,0.35)" : "white",
                          borderColor:     bunkeredEmpty ? "rgba(255,153,51,0.45)"  : "rgb(226,232,240)",
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

        {submitSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[13px] font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Bunkering submitted successfully.
          </div>
        )}

        {submitError && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {submitError}
          </div>
        )}

        <button
          ref={submitBtnRef}
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-14 h-10 rounded-xl text-[13.5px] font-semibold text-white transition-all duration-200 flex items-center gap-2"
          style={
            canSubmit
              ? {
                  background: "linear-gradient(135deg, #071e3d 0%, #0a3d6b 100%)",
                  boxShadow:  "0 4px 20px rgba(7,30,61,0.32)",
                }
              : { background: "#e2e8f0", color: "#94a3b8", cursor: "not-allowed" }
          }
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Submitting…" : "Submit Bunkering"}
        </button>
      </div>

      {/* ── ⑤ Fuel Type Change Confirmation Modal ────────────────── */}
      {showConfirmModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50"
            style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }}
            onClick={() => setShowConfirmModal(false)}
          />

          {/* Modal */}
          <div
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white rounded-2xl p-6 flex flex-col gap-4"
            style={{ boxShadow: "0 20px 60px rgba(7,30,61,0.20)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-bold text-[#04111f]">Change Fuel Type?</h3>
                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
                  Changing the fuel type will clear your current entries. This cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-5 h-9 rounded-xl text-[13px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => applyFuelTypeChange(pendingFuelType)}
                className="px-5 h-9 rounded-xl text-[13px] font-semibold text-white transition-colors"
                style={{ background: "linear-gradient(135deg, #071e3d 0%, #0a3d6b 100%)" }}
              >
                Continue
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
