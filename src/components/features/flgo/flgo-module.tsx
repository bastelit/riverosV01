"use client";

import { useState, useEffect } from "react";
import { IconRulerMeasure, IconDroplet, IconChartBar, IconTable } from "@tabler/icons-react";
import { useLayoutStore } from "@/store/layout-store";
import MeasurementList  from "./measurement-list";
import MeasurementView  from "./measurement-view";
import BunkeringList    from "./bunkering-list";
import BunkeringView    from "./bunkering-view";
import BarReportView    from "./bar-report-view";
import FinalReportView  from "./final-report-view";

type Tab  = "measurement" | "bunkering" | "bar-report" | "final-report";
type View = "list" | "form";

interface FlgoModuleProps {
  vessel: string;
  vesselAbbr: string;
}

export default function FlgoModule({ vessel, vesselAbbr }: FlgoModuleProps) {
  const [activeTab, setActiveTab] = useState<Tab>("measurement");

  // Each tab keeps its own view state — switching tabs never resets the other
  const [measurementView,  setMeasurementView]  = useState<View>("list");
  const [bunkeringView,    setBunkeringView]     = useState<View>("list");
  const [editRagicId,      setEditRagicId]       = useState<string | null>(null);

  const { setModule, clearModule } = useLayoutStore();

  // Inject FLGO identity into the TopNav; clear when navigating away
  useEffect(() => {
    setModule("FLGO", "flgo");
    return () => clearModule();
  }, [setModule, clearModule]);

  const tabs: { id: Tab; label: string; Icon: typeof IconRulerMeasure }[] = [
    { id: "measurement",  label: "Measurement",  Icon: IconRulerMeasure },
    { id: "bunkering",    label: "Bunkering",    Icon: IconDroplet      },
    { id: "bar-report",   label: "Bar Report",   Icon: IconChartBar     },
    { id: "final-report", label: "Final Report", Icon: IconTable        },
  ];

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: "calc(100vh - 56px)" }}
    >
      {/* ── Sub-header: tab navigation ───────────────────────────── */}
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
              {/* Active indicator */}
              <span
                className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full transition-all duration-200"
                style={{ background: active ? "#071e3d" : "transparent" }}
              />
            </button>
          );
        })}
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden py-4 flex flex-col">
        {activeTab === "measurement" ? (
          measurementView === "list" ? (
            <MeasurementList
              onNew={() => { setEditRagicId(null); setMeasurementView("form"); }}
              onEdit={(id) => { setEditRagicId(id); setMeasurementView("form"); }}
            />
          ) : (
            <MeasurementView
              vessel={vessel}
              vesselAbbr={vesselAbbr}
              editRagicId={editRagicId ?? undefined}
              onBack={() => { setEditRagicId(null); setMeasurementView("list"); }}
            />
          )
        ) : activeTab === "bunkering" ? (
          bunkeringView === "list" ? (
            <BunkeringList
              onNew={() => { setEditRagicId(null); setBunkeringView("form"); }}
              onEdit={(id) => { setEditRagicId(id); setBunkeringView("form"); }}
            />
          ) : (
            <BunkeringView
              vessel={vessel}
              vesselAbbr={vesselAbbr}
              editRagicId={editRagicId ?? undefined}
              onBack={() => { setEditRagicId(null); setBunkeringView("list"); }}
            />
          )
        ) : activeTab === "bar-report" ? (
          <BarReportView />
        ) : (
          <FinalReportView />
        )}
      </div>
    </div>
  );
}
