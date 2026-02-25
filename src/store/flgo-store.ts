// ---------------------------------------------------------------------------
// FLGO Store — holds measurement + bunkering history fetched on dashboard mount.
// Transient (no persist) — fresh data each session.
// ---------------------------------------------------------------------------

import { create } from "zustand";

// Per-tank data from the FLGO subtable — stored for edit prefill + reports.
export interface TankEntry {
  subtableRowId: string;   // Ragic subtable row key (positive int) — needed for PUT updates
  tankName: string;
  fuelType: string;
  maxCapacity: string;
  lastRob: string;
  actualVolume: string;    // SUB_ACTUAL_VOLUME (1008798) — used by Measurement
  bunkeredVolume: string;  // SUB_BUNKERED_VOLUME (1008783) — used by Bunkering
  reportVolume: string;    // REPORT_VOLUME (1017884) — used by Bar/Final Reports
}

// One row from the FLGO sheet — used for both list views and reports.
// ragicId = Ragic object key — required for PUT (edit) calls.
export interface FlgoRecord {
  ragicId: string;
  date: string;
  time: string;
  vessel: string;
  entryType: string;          // "Measurement" | "Bunkering"
  percentageFilled: string;
  doneBy: string;
  waterTotalVolume: string;   // ltr — sum of fresh water actual volumes
  fuelTotalVolume: string;    // ltr — sum of fuel actual volumes
  lubeTotalVolume: string;    // ltr — sum of lube oil actual volumes
  adBlueTotalVolume: string;  // ltr — sum of AdBlue actual volumes
  tanks: TankEntry[];         // per-tank subtable data
}

interface FlgoState {
  measurements: FlgoRecord[];
  bunkerings: FlgoRecord[];
  hasFetched: boolean;
  isLoading: boolean;
  error: string | null;

  // Splits incoming records by entryType and marks as fetched
  setRecords: (records: FlgoRecord[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  // Mark stale — list will re-fetch on next render (after a new submit)
  invalidate: () => void;
  clear: () => void;
}

export const useFlgoStore = create<FlgoState>((set) => ({
  measurements: [],
  bunkerings: [],
  hasFetched: false,
  isLoading: false,
  error: null,

  setRecords: (records) =>
    set({
      measurements: records.filter((r) => r.entryType === "Measurement"),
      bunkerings:   records.filter((r) => r.entryType === "Bunkering"),
      hasFetched:   true,
      error:        null,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  invalidate: () => set({ hasFetched: false }),

  clear: () =>
    set({ measurements: [], bunkerings: [], hasFetched: false, isLoading: false, error: null }),
}));
