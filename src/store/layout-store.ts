// ---------------------------------------------------------------------------
// Layout Store — transient (no persist). Holds active module context so
// the TopNav can show module identity (Back link + name) when inside a module.
// Set on module mount, cleared on unmount.
// ---------------------------------------------------------------------------

import { create } from "zustand";

interface LayoutState {
  moduleName: string;       // e.g. "FLGO"
  moduleKey: string;        // e.g. "flgo"  — used to look up icon/colour
  setModule: (name: string, key: string) => void;
  clearModule: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  moduleName: "",
  moduleKey: "",
  setModule: (name, key) => set({ moduleName: name, moduleKey: key }),
  clearModule: () => set({ moduleName: "", moduleKey: "" }),
}));
