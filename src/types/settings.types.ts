// Line item configuration for dynamic calculators
export interface LineItemConfig {
  id: string;
  name: string;
  rate: number;
  unit: 'sqft' | 'lf' | 'each' | 'hour' | 'dollars';
  category: string; // Section ID it belongs to
  isDefault: boolean; // Cannot be deleted if true
  order: number;
}

// Section configuration for dynamic calculators
export interface SectionConfig {
  id: string;
  name: string;
  calculatorType: 'interior-detailed' | 'exterior-detailed' | 'simple-pricing';
  isDefault: boolean; // Cannot be deleted if true
  order: number;
  defaultCollapsed?: boolean; // Whether section starts collapsed on calculator page
}

// Crew rate configuration for job duration estimates
export interface CrewRateConfig {
  crewSize: 2 | 3 | 4;
  dailyRate: number;
  description?: string; // Editable helper text
}

// Scope of a modifier: labor only, materials only, or both
export type ModifierScope = 'labor' | 'materials' | 'both';

// Interior labor modifier values (configurable)
export interface InteriorModifierValues {
  heavilyFurnished: number;
  heavilyFurnishedScope?: ModifierScope;
  emptyHouse: number;
  emptyHouseScope?: ModifierScope;
  extensivePrep: number;
  extensivePrepScope?: ModifierScope;
  additionalCoat: number;
  additionalCoatScope?: ModifierScope;
  oneCoat: number;
  oneCoatScope?: ModifierScope;
}

// Exterior labor modifier values (configurable)
export interface ExteriorModifierValues {
  threeStory: number;
  threeStoryScope?: ModifierScope;
  extensivePrep: number;
  extensivePrepScope?: ModifierScope;
  hardTerrain: number;
  hardTerrainScope?: ModifierScope;
  additionalCoat: number;
  additionalCoatScope?: ModifierScope;
  oneCoat: number;
  oneCoatScope?: ModifierScope;
}

// All pricing configuration (formerly hardcoded)
export interface PricingSettings {
  // Simple calculator rates
  interiorSqft: {
    wallsOnly: number;
    trimOnly: number;
    ceilingsOnly: number;
    complete: number;
  };
  // Empty house interior rates
  interiorSqftEmpty: {
    wallsOnly: number;
    trimOnly: number;
    ceilingsOnly: number;
    complete: number;
  };
  exteriorSqft: {
    fullExterior: number;
    trimOnly: number;
  };

  // Paint prices (Record<string, number> to support dynamic custom paint types)
  interiorPaint: Record<string, number>;
  exteriorPaint: Record<string, number>;

  // Coverage rates
  interiorCoverage: {
    wallSqftPerGallon: number;
    ceilingSqftPerGallon: number;
    trimLfPerGallon: number;
    cabinetGallonsPerDoor: number;
  };
  exteriorCoverage: {
    wallSqftPerGallon: number;
    trimLfPerGallon: number;
    doorGallonsPerDoor: number;
  };

  // Auto-calc multipliers
  interiorMultipliers: {
    wall: number;
    ceiling: number;
    trim: number;
  };
  exteriorMultipliers: {
    siding: number;
    trim: number;
  };

  // Markup options
  markupOptions: number[];

  // Crew rates for job duration estimates
  crewRates: CrewRateConfig[];

  // Editable job duration description text
  jobDurationFormulaText?: string;
  jobDurationExampleText?: string;

  // Editable labor modifier values
  interiorModifierValues?: InteriorModifierValues;
  exteriorModifierValues?: ExteriorModifierValues;

  // Dynamic configuration
  lineItems: LineItemConfig[];
  sections: SectionConfig[];
}

// Company branding and contact information
export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  licenseNumber?: string;
  logo?: string; // base64 encoded image
  pricing: PricingSettings; // NEW: Dynamic pricing configuration
}

// Default company settings (will be populated with pricing from defaultPricing.ts)
export const defaultCompanySettings: Omit<CompanySettings, 'pricing'> = {
  name: 'Your Painting Company',
  address: '123 Main Street, City, State 12345',
  phone: '(555) 123-4567',
  email: 'contact@yourcompany.com',
  website: 'www.yourcompany.com',
  licenseNumber: '',
  logo: undefined,
};
