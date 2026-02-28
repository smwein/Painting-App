import type { PaintType, ExteriorPaintType } from './calculator.types';

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

// All pricing configuration (formerly hardcoded)
export interface PricingSettings {
  // Simple calculator rates
  interiorSqft: {
    wallsOnly: number;
    trimOnly: number;
    ceilingsOnly: number;
    complete: number;
  };
  exteriorSqft: {
    fullExterior: number;
    trimOnly: number;
  };

  // Paint prices
  interiorPaint: Record<PaintType, number>;
  exteriorPaint: Record<ExteriorPaintType, number>;

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
