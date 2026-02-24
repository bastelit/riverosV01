// ---------------------------------------------------------------------------
// Vessel Store — holds vessel list and tank details fetched at login time.
// Persisted to localStorage so data survives page refreshes.
// Never call Ragic directly from here — data is loaded by the auth flow.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Tank {
  tankName: string;
  fuelType: string;
  maxCapacity: string;
  lastRob: string;
}

interface VesselState {
  vesselList: string[];
  tanks: Tank[];
  assignedVessel: string;
  setAll: (payload: {
    vesselList: string[];
    tanks: Tank[];
    assignedVessel: string;
  }) => void;
  clear: () => void;
}

export const useVesselStore = create<VesselState>()(
  persist(
    (set) => ({
      vesselList: [],
      tanks: [],
      assignedVessel: "",

      setAll: ({ vesselList, tanks, assignedVessel }) =>
        set({ vesselList, tanks, assignedVessel }),

      clear: () => set({ vesselList: [], tanks: [], assignedVessel: "" }),
    }),
    {
      name: "riveros-vessel-store",
    }
  )
);
