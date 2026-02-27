// Paint coverage rates (how much area 1 gallon covers)

// Interior coverage rates
export const INTERIOR_COVERAGE = {
  WALL_SQFT_PER_GALLON: 250,
  CEILING_SQFT_PER_GALLON: 250,
  TRIM_LF_PER_GALLON: 100,
  CABINET_GALLONS_PER_DOOR: 0.10,
} as const;

// Exterior coverage rates
export const EXTERIOR_COVERAGE = {
  WALL_SQFT_PER_GALLON: 200,
  TRIM_LF_PER_GALLON: 100,
  DOOR_GALLONS_PER_DOOR: 0.10,
} as const;

// Auto-calculation multipliers for square footage methods
export const INTERIOR_SQFT_MULTIPLIERS = {
  WALL_MULTIPLIER: 3.2,      // House SF × 3.2 = Wall SF
  CEILING_MULTIPLIER: 1.0,   // House SF × 1.0 = Ceiling SF
  TRIM_MULTIPLIER: 0.35,     // House SF × 0.35 = Trim LF
} as const;

export const EXTERIOR_SQFT_MULTIPLIERS = {
  SIDING_MULTIPLIER: 1.4,    // House SF × 1.4 = Siding SF
  TRIM_MULTIPLIER: 0.30,     // House SF × 0.30 = Trim LF
} as const;
