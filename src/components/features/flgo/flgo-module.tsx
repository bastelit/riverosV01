"use client";

import { useState, useEffect } from "react";
import { IconRulerMeasure, IconGasStation } from "@tabler/icons-react";
import { useLayoutStore } from "@/store/layout-store";
import MeasurementView from "./measurement-view";
import BunkeringView from "./bunkering-view";

type Tab = "measurement" | "bunkering";

interface FlgoModuleProps {
  vessel: string;
  vesselAbbr: string;
}

export default function FlgoModule({ vessel, vesselAbbr }: FlgoModuleProps) {
  const [activeTab, setActiveTab] = useState<Tab>("measurement");
  const { setModule, clearModule } = useLayoutStore();

  // Inject FLGO identity into the TopNav; clear when navigating away
  useEffect(() => {
    setModule("FLGO", "flgo");
    return () => clearModule();
  }, [setModule, clearModule]);

  const tabs: { id: Tab; label: string; Icon: typeof IconRulerMeasure }[] = [
    { id: "measurement", label: "Measurement", Icon: IconRulerMeasure },
    { id: "bunkering",   label: "Bunkering",   Icon: IconGasStation   },
    // Future tabs (Corrections, Reports) go here
  ];

  return (
    // Height = full viewport minus TopNav (56px) only — identity bar is now IN TopNav
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: "calc(100vh - 56px)" }}
    >
      {/* ── Sub-header: tab navigation ─────────────────────────────
          Full-width, breaks out of parent px-6. Both tabs always
          visually prominent — active vs inactive differ in style,
          not in visibility. Ready for future tabs.               */}
      <div
        className="-mx-6 px-6 flex-shrink-0 bg-white border-b border-slate-100 flex items-end gap-1"
        style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}
      >
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="relative flex items-center gap-2 px-6 py-3.5 text-[14px] transition-all duration-200 whitespace-nowrap"
              style={{
                fontWeight: active ? 700 : 600,
                color: active ? "#071e3d" : "#64748b",
              }}
            >
              <Icon size={16} stroke={active ? 2.4 : 1.75} />
              {label}
              {/* Active indicator — thick bottom bar */}
              <span
                className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full transition-all duration-200"
                style={{
                  background: active ? "#071e3d" : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* ── Content fills all remaining height ──────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden py-4">
        {activeTab === "measurement" ? (
          <MeasurementView vessel={vessel} vesselAbbr={vesselAbbr} />
        ) : (
          <BunkeringView vessel={vessel} vesselAbbr={vesselAbbr} />
        )}
      </div>
    </div>
  );
}
