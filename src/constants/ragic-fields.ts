// ---------------------------------------------------------------------------
// Ragic Sheet IDs and Field ID constants
// Never use magic numbers inline — always reference these named constants.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sheet paths  (relative to RAGIC_BASE_URL)
// ---------------------------------------------------------------------------
export const SHEETS = {
  USERS: "ragic-setup/1",
  VESSELS: "masterdata/3",
  TANKS: "masterdata/10",
  FLGO_MEASUREMENT: "flgo/28",
} as const;

// ---------------------------------------------------------------------------
// Users sheet  (ragic-setup/1)
// ---------------------------------------------------------------------------
export const USER_FIELDS = {
  EMAIL: "1",
  NAME: "4",
  ASSIGNED_VESSEL: "1000191",
  VESSEL_ABBREVIATION: "1000543",
} as const;

// ---------------------------------------------------------------------------
// Vessels sheet  (masterdata/3)
// ---------------------------------------------------------------------------
export const VESSEL_FIELDS = {
  NAME: "1000064",
} as const;

// ---------------------------------------------------------------------------
// Tanks sheet  (masterdata/10)
// ---------------------------------------------------------------------------
export const TANK_FIELDS = {
  VESSEL_NAME: "1022111", // used to filter tanks by vessel
  TANK_NAME: "1000079",
  FUEL_TYPE: "1000078",
  MAX_CAPACITY: "1000080",
  LAST_ROB: "1000795",
} as const;

// ---------------------------------------------------------------------------
// FLGO Measurement sheet  (flgo/28)
// POST with ?doLinkLoad=true&doFormula=true
// ---------------------------------------------------------------------------
export const FLGO_FIELDS = {
  // Main / header fields
  DATE:               "1008768",
  TIME:               "1008771",
  ENTRY_TYPE:         "1008766", // static: "Measurement"
  FUEL_TYPE_FILTER:   "1008767", // static: "ALL"
  PERCENTAGE_FILLED:  "1011855", // calculated: (filledCount / total) * 100
  DONE_BY:            "1008761", // logged-in user name
  ASSIGNED_TO:        "1008756", // vessel name
  HEADER_VESSEL:      "1008755", // link field — vessel name

  // Subtable container ID — used as _subtable_<id> key in JSON POST
  SUB_TABLE_ID:       "1008797",

  // Subtable column field IDs
  SUB_VESSEL_NAME:    "1008778",
  SUB_FUEL_TYPE:      "1008779",
  SUB_TANK_NAME:      "1008780",
  SUB_MAX_CAPACITY:   "1008781",
  SUB_LAST_ROB:       "1008782",
  SUB_ACTUAL_VOLUME:   "1008798",
  SUB_BUNKERED_VOLUME: "1008783",
} as const;
