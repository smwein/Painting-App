import type { PaintType, ExteriorPaintType } from '../../types/calculator.types';

// Interior Square Footage pricing per sqft
export const INTERIOR_SQFT_PRICING = {
  WALLS_ONLY: 1.75,
  TRIM_ONLY: 1.25,
  CEILINGS_ONLY: 1.00,
  COMPLETE: 2.50,
} as const;

// Exterior Square Footage pricing per sqft
export const EXTERIOR_SQFT_PRICING = {
  FULL_EXTERIOR: 2.00,
  TRIM_ONLY: 1.35,
} as const;

// Interior Detailed pricing rates
export const INTERIOR_DETAILED_RATES = {
  // Measurements
  WALL_SQFT: 1.00,
  CEILING_SQFT: 0.50,
  TRIM_LF: 0.75,

  // Doors & Cabinets
  DOOR: 40,
  CABINET_DOOR: 40,
  CABINET_DRAWER: 40,
  NEW_CABINET_DOOR: 60,
  NEW_CABINET_DRAWER: 60,

  // Additional
  COLOR_ABOVE_THREE: 75,

  // Prep work
  WALLPAPER_REMOVAL_SQFT: 2.00,
  PRIMING_LF: 0.50,
  PRIMING_SQFT: 0.50,
  DRYWALL_REPLACEMENT_SQFT: 2.00,
  POPCORN_REMOVAL_SQFT: 1.25,
  WALL_TEXTURE_REMOVAL_SQFT: 1.00,
  TRIM_REPLACEMENT_LF: 4.00,
  DRYWALL_REPAIR: 40,

  // Miscellaneous
  ACCENT_WALL: 60,
  MISC_WORK_HOUR: 50,
} as const;

// Exterior Detailed pricing rates
export const EXTERIOR_DETAILED_RATES = {
  // Measurements
  WALL_SQFT: 0.70,
  TRIM_FASCIA_SOFFIT_LF: 0.50,

  // Doors & Shutters
  DOOR: 40,
  SHUTTER: 25,
  DOOR_REFINISH: 100,

  // Prep work
  PRIMING_SQFT: 0.50,
  PRIMING_LF: 0.50,

  // Replacements & Repairs
  SIDING_REPLACEMENT_SQFT: 2.00,
  TRIM_REPLACEMENT_LF: 4.00,
  SOFFIT_FASCIA_REPLACEMENT_LF: 8.00,
  BONDO_REPAIR: 30,

  // Additional
  DECK_STAINING_SQFT: 1.00,
  MISC_PRESSURE_WASHING_SQFT: 0.50,
  MISC_WORK_HOUR: 50,
} as const;

// Paint prices per gallon
export const PAINT_PRICES: Record<PaintType, number> = {
  ProMar: 25,
  SuperPaint: 35,
  Duration: 45,
  Emerald: 65,
};

export const EXTERIOR_PAINT_PRICES: Record<ExteriorPaintType, number> = {
  SuperPaint: 35,
  Duration: 45,
  Emerald: 65,
};

// Markup percentage options (displayed as percentages, used as multipliers)
export const MARKUP_OPTIONS = [35, 40, 45, 50, 55, 60] as const;
