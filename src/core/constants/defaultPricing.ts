import type { PricingSettings } from '../../types/settings.types';

/**
 * Creates default pricing settings with all current hardcoded values
 * This populates the initial state and serves as a fallback
 */
export function createDefaultPricingSettings(): PricingSettings {
  return {
    // Simple calculator rates (from pricing.ts)
    interiorSqft: {
      wallsOnly: 1.75,
      trimOnly: 1.25,
      ceilingsOnly: 1.00,
      complete: 2.50,
    },
    exteriorSqft: {
      fullExterior: 2.00,
      trimOnly: 1.35,
    },

    // Paint prices (from pricing.ts)
    interiorPaint: {
      ProMar: 25,
      SuperPaint: 35,
      Duration: 45,
      Emerald: 65,
    },
    exteriorPaint: {
      SuperPaint: 35,
      Duration: 45,
      Emerald: 65,
    },

    // Coverage rates (from coverage.ts)
    interiorCoverage: {
      wallSqftPerGallon: 250,
      ceilingSqftPerGallon: 250,
      trimLfPerGallon: 100,
      cabinetGallonsPerDoor: 0.10,
    },
    exteriorCoverage: {
      wallSqftPerGallon: 200,
      trimLfPerGallon: 100,
      doorGallonsPerDoor: 0.10,
    },

    // Auto-calc multipliers (from coverage.ts)
    interiorMultipliers: {
      wall: 3.2,
      ceiling: 1.0,
      trim: 0.35,
    },
    exteriorMultipliers: {
      siding: 1.4,
      trim: 0.30,
    },

    // Markup options (from pricing.ts)
    markupOptions: [35, 40, 45, 50, 55, 60],

    // Crew rates for job duration estimates
    crewRates: [
      { crewSize: 2, dailyRate: 1000, description: 'Default: $1,000/day' },
      { crewSize: 3, dailyRate: 1500, description: 'Default: $1,500/day' },
      { crewSize: 4, dailyRate: 2000, description: 'Default: $2,000/day' },
    ],

    jobDurationFormulaText: 'Estimated Days = Labor Cost ÷ Daily Rate',
    jobDurationExampleText: 'For example, if labor cost is $3,000 and you select a 2-person crew ($1,000/day), the estimated duration is 3 days.',

    // Dynamic line items - Interior Detailed
    lineItems: [
      // Interior Detailed - Measurements Section
      {
        id: 'int-wall-sqft',
        name: 'Wall Sq Ft',
        rate: 1.00,
        unit: 'sqft',
        category: 'int-measurements',
        isDefault: true,
        order: 1,
      },
      {
        id: 'int-ceiling-sqft',
        name: 'Ceiling Sq Ft',
        rate: 0.50,
        unit: 'sqft',
        category: 'int-measurements',
        isDefault: true,
        order: 2,
      },
      {
        id: 'int-trim-lf',
        name: 'Trim LF',
        rate: 0.75,
        unit: 'lf',
        category: 'int-measurements',
        isDefault: true,
        order: 3,
      },

      // Interior Detailed - Doors & Cabinets Section
      {
        id: 'int-door',
        name: 'Doors',
        rate: 40,
        unit: 'each',
        category: 'int-doors-cabinets',
        isDefault: true,
        order: 1,
      },
      {
        id: 'int-cabinet-door',
        name: 'Cabinet Doors',
        rate: 40,
        unit: 'each',
        category: 'int-doors-cabinets',
        isDefault: true,
        order: 2,
      },
      {
        id: 'int-cabinet-drawer',
        name: 'Cabinet Drawers',
        rate: 40,
        unit: 'each',
        category: 'int-doors-cabinets',
        isDefault: true,
        order: 3,
      },
      {
        id: 'int-new-cabinet-door',
        name: 'New Cabinet Doors',
        rate: 60,
        unit: 'each',
        category: 'int-doors-cabinets',
        isDefault: true,
        order: 4,
      },
      {
        id: 'int-new-cabinet-drawer',
        name: 'New Cabinet Drawers',
        rate: 60,
        unit: 'each',
        category: 'int-doors-cabinets',
        isDefault: true,
        order: 5,
      },

      // Interior Detailed - Prep Work Section
      {
        id: 'int-wallpaper-removal-sqft',
        name: 'Wallpaper Removal',
        rate: 2.00,
        unit: 'sqft',
        category: 'int-prep-work',
        isDefault: true,
        order: 1,
      },
      {
        id: 'int-priming-lf',
        name: 'Priming (Linear Feet)',
        rate: 0.50,
        unit: 'lf',
        category: 'int-prep-work',
        isDefault: true,
        order: 2,
      },
      {
        id: 'int-priming-sqft',
        name: 'Priming (Sq Ft)',
        rate: 0.50,
        unit: 'sqft',
        category: 'int-prep-work',
        isDefault: true,
        order: 3,
      },
      {
        id: 'int-drywall-replacement-sqft',
        name: 'Drywall Replacement',
        rate: 2.00,
        unit: 'sqft',
        category: 'int-prep-work',
        isDefault: true,
        order: 4,
      },
      {
        id: 'int-popcorn-removal-sqft',
        name: 'Popcorn Removal',
        rate: 1.25,
        unit: 'sqft',
        category: 'int-prep-work',
        isDefault: true,
        order: 5,
      },
      {
        id: 'int-wall-texture-removal-sqft',
        name: 'Wall Texture Removal',
        rate: 1.00,
        unit: 'sqft',
        category: 'int-prep-work',
        isDefault: true,
        order: 6,
      },
      {
        id: 'int-trim-replacement-lf',
        name: 'Trim Replacement',
        rate: 4.00,
        unit: 'lf',
        category: 'int-prep-work',
        isDefault: true,
        order: 7,
      },
      {
        id: 'int-drywall-repair',
        name: 'Drywall Repairs',
        rate: 40,
        unit: 'each',
        category: 'int-prep-work',
        isDefault: true,
        order: 8,
      },

      // Interior Detailed - Additional Section
      {
        id: 'int-color-above-three',
        name: 'Colors Above Three',
        rate: 75,
        unit: 'each',
        category: 'int-additional',
        isDefault: true,
        order: 1,
      },
      {
        id: 'int-accent-wall',
        name: 'Accent Walls',
        rate: 60,
        unit: 'each',
        category: 'int-additional',
        isDefault: true,
        order: 2,
      },
      {
        id: 'int-misc-work-hour',
        name: 'Miscellaneous Work',
        rate: 50,
        unit: 'hour',
        category: 'int-additional',
        isDefault: true,
        order: 3,
      },
      {
        id: 'int-miscellaneous-dollars',
        name: 'Miscellaneous (Custom)',
        rate: 1,
        unit: 'dollars',
        category: 'int-additional',
        isDefault: true,
        order: 4,
      },

      // Exterior Detailed - Measurements Section
      {
        id: 'ext-wall-sqft',
        name: 'Wall/Siding Sq Ft',
        rate: 0.70,
        unit: 'sqft',
        category: 'ext-measurements',
        isDefault: true,
        order: 1,
      },
      {
        id: 'ext-trim-fascia-soffit-lf',
        name: 'Trim/Fascia/Soffit LF',
        rate: 0.50,
        unit: 'lf',
        category: 'ext-measurements',
        isDefault: true,
        order: 2,
      },

      // Exterior Detailed - Doors & Shutters Section
      {
        id: 'ext-door',
        name: 'Doors',
        rate: 40,
        unit: 'each',
        category: 'ext-doors-shutters',
        isDefault: true,
        order: 1,
      },
      {
        id: 'ext-shutter',
        name: 'Shutters',
        rate: 25,
        unit: 'each',
        category: 'ext-doors-shutters',
        isDefault: true,
        order: 2,
      },
      {
        id: 'ext-door-refinish',
        name: 'Doors to Refinish',
        rate: 100,
        unit: 'each',
        category: 'ext-doors-shutters',
        isDefault: true,
        order: 3,
      },

      // Exterior Detailed - Prep Work Section
      {
        id: 'ext-priming-sqft',
        name: 'Priming (Sq Ft)',
        rate: 0.50,
        unit: 'sqft',
        category: 'ext-prep-work',
        isDefault: true,
        order: 1,
      },
      {
        id: 'ext-priming-lf',
        name: 'Priming (Linear Feet)',
        rate: 0.50,
        unit: 'lf',
        category: 'ext-prep-work',
        isDefault: true,
        order: 2,
      },

      // Exterior Detailed - Replacements & Repairs Section
      {
        id: 'ext-siding-replacement-sqft',
        name: 'Siding Replacement',
        rate: 2.00,
        unit: 'sqft',
        category: 'ext-replacements-repairs',
        isDefault: true,
        order: 1,
      },
      {
        id: 'ext-trim-replacement-lf',
        name: 'Trim Replacement',
        rate: 4.00,
        unit: 'lf',
        category: 'ext-replacements-repairs',
        isDefault: true,
        order: 2,
      },
      {
        id: 'ext-soffit-fascia-replacement-lf',
        name: 'Soffit/Fascia Replacement',
        rate: 8.00,
        unit: 'lf',
        category: 'ext-replacements-repairs',
        isDefault: true,
        order: 3,
      },
      {
        id: 'ext-bondo-repair',
        name: 'Bondo Repairs',
        rate: 30,
        unit: 'each',
        category: 'ext-replacements-repairs',
        isDefault: true,
        order: 4,
      },

      // Exterior Detailed - Additional Section
      {
        id: 'ext-deck-staining-sqft',
        name: 'Deck Staining',
        rate: 1.00,
        unit: 'sqft',
        category: 'ext-additional',
        isDefault: true,
        order: 1,
      },
      {
        id: 'ext-misc-pressure-washing-sqft',
        name: 'Pressure Washing',
        rate: 0.50,
        unit: 'sqft',
        category: 'ext-additional',
        isDefault: true,
        order: 2,
      },
      {
        id: 'ext-misc-work-hour',
        name: 'Miscellaneous Work',
        rate: 50,
        unit: 'hour',
        category: 'ext-additional',
        isDefault: true,
        order: 3,
      },
      {
        id: 'ext-miscellaneous-dollars',
        name: 'Miscellaneous (Custom)',
        rate: 1,
        unit: 'dollars',
        category: 'ext-additional',
        isDefault: true,
        order: 4,
      },
    ],

    // Dynamic sections
    sections: [
      // Interior Detailed Sections
      {
        id: 'int-measurements',
        name: 'Measurements',
        calculatorType: 'interior-detailed',
        isDefault: true,
        order: 1,
      },
      {
        id: 'int-doors-cabinets',
        name: 'Doors & Cabinets',
        calculatorType: 'interior-detailed',
        isDefault: true,
        order: 2,
      },
      {
        id: 'int-prep-work',
        name: 'Prep Work',
        calculatorType: 'interior-detailed',
        isDefault: true,
        order: 3,
      },
      {
        id: 'int-additional',
        name: 'Additional Work',
        calculatorType: 'interior-detailed',
        isDefault: true,
        order: 4,
      },

      // Exterior Detailed Sections
      {
        id: 'ext-measurements',
        name: 'Measurements',
        calculatorType: 'exterior-detailed',
        isDefault: true,
        order: 1,
      },
      {
        id: 'ext-doors-shutters',
        name: 'Doors & Shutters',
        calculatorType: 'exterior-detailed',
        isDefault: true,
        order: 2,
      },
      {
        id: 'ext-prep-work',
        name: 'Prep Work',
        calculatorType: 'exterior-detailed',
        isDefault: true,
        order: 3,
      },
      {
        id: 'ext-replacements-repairs',
        name: 'Replacements & Repairs',
        calculatorType: 'exterior-detailed',
        isDefault: true,
        order: 4,
      },
      {
        id: 'ext-additional',
        name: 'Additional Work',
        calculatorType: 'exterior-detailed',
        isDefault: true,
        order: 5,
      },
    ],
  };
}

/**
 * Get a complete default CompanySettings object
 */
export function getDefaultCompanySettings(): import('../../types/settings.types').CompanySettings {
  return {
    name: 'Your Painting Company',
    address: '123 Main Street, City, State 12345',
    phone: '(555) 123-4567',
    email: 'contact@yourcompany.com',
    website: 'www.yourcompany.com',
    licenseNumber: '',
    logo: undefined,
    pricing: createDefaultPricingSettings(),
  };
}
