// ---------------------------------------------------------------------------
// Ragic Sheet IDs and Field ID constants
// Never use magic numbers inline — always reference these named constants.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sheet paths  (relative to RAGIC_BASE_URL)
// ---------------------------------------------------------------------------
export const SHEETS = {
  USERS: "ragic-setup/1",
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
