// Paint types available
export type PaintType = 'ProMar' | 'SuperPaint' | 'Duration' | 'Emerald';

export type ExteriorPaintType = 'SuperPaint' | 'Duration' | 'Emerald';

// Markup percentage options
export type MarkupPercentage = 35 | 40 | 45 | 50 | 55 | 60;

// Calculator type identifiers
export type CalculatorType =
  | 'interior-sqft'
  | 'interior-detailed'
  | 'exterior-sqft'
  | 'exterior-detailed';

// Interior Square Footage pricing options
export type InteriorSqftOption = 'walls-only' | 'trim-only' | 'ceilings-only' | 'complete';

// Exterior Square Footage pricing options
export type ExteriorSqftOption = 'full-exterior' | 'trim-only';

// Material breakdown for a single item
export interface MaterialItem {
  name: string;
  quantity: number; // gallons
  pricePerGallon: number;
  cost: number;
}

// Complete material breakdown
export interface MaterialBreakdown {
  items: MaterialItem[];
  totalCost: number;
}

// Result from any calculator
export interface BidResult {
  labor: number;
  materials: MaterialBreakdown;
  profit: number;
  total: number;
  breakdown: any; // Calculator-specific breakdown details
  timestamp: Date;
}

// Interior Square Footage Calculator Inputs
export interface InteriorSqftInputs {
  houseSquareFootage: number;
  pricingOption: InteriorSqftOption;
  markup: MarkupPercentage;
}

// Interior Square Footage Auto-calculations
export interface InteriorSqftAutoCalcs {
  wallSqft: number;
  ceilingSqft: number;
  trimLF: number;
}

// Interior Detailed Calculator Modifiers
export interface InteriorModifiers {
  heavilyFurnished: boolean;  // ×1.25
  emptyHouse: boolean;         // ×0.85
  extensivePrep: boolean;      // ×1.15
  additionalCoat: boolean;     // ×1.25
  oneCoat: boolean;            // ×0.85 (reduce to 1 coat)
}

// Interior Detailed Calculator Inputs (22 fields)
export interface InteriorDetailedInputs {
  // Measurements
  wallSqft: number;              // $1.00/sqft
  ceilingSqft: number;           // $0.50/sqft
  trimLF: number;                // $0.75/LF

  // Doors & Cabinets
  doors: number;                 // $40/door
  cabinetDoors: number;          // $40/door
  cabinetDrawers: number;        // $40/drawer
  newCabinetDoors: number;       // $60/door
  newCabinetDrawers: number;     // $60/drawer

  // Additional items
  colorsAboveThree: number;      // $75/color

  // Prep work
  wallpaperRemovalSqft: number;  // $2/sqft
  primingLF: number;             // $0.50/LF
  primingSqft: number;           // $0.50/sqft
  drywallReplacementSqft: number; // $2/sqft
  popcornRemovalSqft: number;    // $1.25/sqft
  wallTextureRemovalSqft: number; // $1.00/sqft
  trimReplacementLF: number;     // $4/LF
  drywallRepairs: number;        // $40/repair

  // Miscellaneous
  accentWalls: number;           // $60/wall
  miscWorkHours: number;         // $50/hour
  miscellaneousDollars: number;  // custom amount

  // Paint & Markup
  paintType: PaintType;
  markup: MarkupPercentage;

  // Modifiers
  modifiers: InteriorModifiers;
}

// Exterior Detailed Calculator Modifiers
export interface ExteriorModifiers {
  threeStory: boolean;          // ×1.15
  extensivePrep: boolean;       // ×1.2
  hardTerrain: boolean;         // ×1.15
  additionalCoat: boolean;      // ×1.25
  oneCoat: boolean;             // ×0.85
}

// Exterior Square Footage Calculator Inputs
export interface ExteriorSqftInputs {
  houseSquareFootage: number;
  pricingOption: ExteriorSqftOption;
  markup: MarkupPercentage;
}

// Exterior Square Footage Auto-calculations
export interface ExteriorSqftAutoCalcs {
  sidingSqft: number;
  trimLF: number;
}

// Exterior Detailed Calculator Inputs (21 fields)
export interface ExteriorDetailedInputs {
  // Measurements
  wallSqft: number;              // $0.70/sqft
  trimFasciaSoffitLF: number;    // $0.50/LF

  // Doors & Shutters
  doors: number;                 // $40/door
  shutters: number;              // $25/shutter
  doorsToRefinish: number;       // $100/door

  // Prep work
  primingSqft: number;           // $0.50/sqft
  primingLF: number;             // $0.50/LF

  // Replacements & Repairs
  sidingReplacementSqft: number; // $2.00/sqft
  trimReplacementLF: number;     // $4/LF
  soffitFasciaReplacementLF: number; // $8/LF
  bondoRepairs: number;          // $30/repair

  // Additional work
  deckStainingSqft: number;      // $1.00/sqft
  miscPressureWashingSqft: number; // $0.50/sqft
  miscWorkHours: number;         // $50/hour
  miscellaneousDollars: number;  // custom amount

  // Paint & Markup
  paintType: ExteriorPaintType;
  markup: MarkupPercentage;

  // Modifiers
  modifiers: ExteriorModifiers;
}

// Interior Detailed breakdown for display
export interface InteriorDetailedBreakdown {
  measurements: {
    walls: number;
    ceilings: number;
    trim: number;
  };
  doorsAndCabinets: {
    doors: number;
    cabinetDoors: number;
    cabinetDrawers: number;
    newCabinetDoors: number;
    newCabinetDrawers: number;
  };
  prepWork: {
    wallpaperRemoval: number;
    priming: number;
    drywallReplacement: number;
    popcornRemoval: number;
    wallTextureRemoval: number;
    trimReplacement: number;
    drywallRepairs: number;
  };
  additional: {
    colorsAboveThree: number;
    accentWalls: number;
    miscWork: number;
    miscellaneous: number;
  };
  baseLabor: number;
  modifiersApplied: string[];
  modifiedLabor: number;
}

// Exterior Detailed breakdown for display
export interface ExteriorDetailedBreakdown {
  measurements: {
    walls: number;
    trimFasciaSoffit: number;
  };
  doorsAndShutters: {
    doors: number;
    shutters: number;
    doorsToRefinish: number;
  };
  prepWork: {
    priming: number;
  };
  replacementsAndRepairs: {
    sidingReplacement: number;
    trimReplacement: number;
    soffitFasciaReplacement: number;
    bondoRepairs: number;
  };
  additional: {
    deckStaining: number;
    miscPressureWashing: number;
    miscWork: number;
    miscellaneous: number;
  };
  baseLabor: number;
  modifiersApplied: string[];
  modifiedLabor: number;
}
