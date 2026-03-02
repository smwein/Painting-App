import type {
  ExteriorSqftInputs,
  ExteriorSqftAutoCalcs,
  BidResult,
  MaterialBreakdown,
} from '../../types/calculator.types';
import type { PricingSettings } from '../../types/settings.types';

/**
 * Calculate auto-measurements based on house square footage
 */
export function calculateExteriorSqftAutoMeasurements(
  houseSquareFootage: number,
  pricing: PricingSettings
): ExteriorSqftAutoCalcs {
  return {
    sidingSqft: houseSquareFootage * pricing.exteriorMultipliers.siding,
    trimLF: houseSquareFootage * pricing.exteriorMultipliers.trim,
  };
}

/**
 * Calculate exterior square footage bid
 * Simple calculator with house SF, pricing option, and markup
 */
export function calculateExteriorSquareFootage(
  inputs: ExteriorSqftInputs,
  pricing: PricingSettings
): BidResult {
  // Calculate labor COST based on pricing option
  let laborCost = 0;

  switch (inputs.pricingOption) {
    case 'full-exterior':
      laborCost = inputs.houseSquareFootage * pricing.exteriorSqft.fullExterior;
      break;
    case 'trim-only':
      laborCost = inputs.houseSquareFootage * pricing.exteriorSqft.trimOnly;
      break;
  }

  // Calculate auto-measurements
  const autoCalcs = calculateExteriorSqftAutoMeasurements(inputs.houseSquareFootage, pricing);

  // No materials in simple method
  const materials: MaterialBreakdown = {
    items: [],
    totalCost: 0,
  };

  // Calculate total using margin formula: total = cost / (1 - margin%)
  const totalCost = laborCost + materials.totalCost;
  const marginFactor = Math.max(1 - inputs.markup / 100, 0.01);
  const total = totalCost / marginFactor;
  const profit = total - totalCost;

  return {
    labor: laborCost,
    materials,
    profit,
    total,
    breakdown: {
      houseSquareFootage: inputs.houseSquareFootage,
      pricingOption: inputs.pricingOption,
      autoCalculations: autoCalcs,
      markup: inputs.markup,
    },
    timestamp: new Date(),
  };
}
