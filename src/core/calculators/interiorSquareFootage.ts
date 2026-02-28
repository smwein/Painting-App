import type {
  InteriorSqftInputs,
  InteriorSqftAutoCalcs,
  BidResult,
  MaterialBreakdown,
} from '../../types/calculator.types';
import type { PricingSettings } from '../../types/settings.types';

/**
 * Calculate auto-measurements based on house square footage
 */
export function calculateInteriorSqftAutoMeasurements(
  houseSquareFootage: number,
  pricing: PricingSettings
): InteriorSqftAutoCalcs {
  return {
    wallSqft: houseSquareFootage * pricing.interiorMultipliers.wall,
    ceilingSqft: houseSquareFootage * pricing.interiorMultipliers.ceiling,
    trimLF: houseSquareFootage * pricing.interiorMultipliers.trim,
  };
}

/**
 * Calculate interior square footage bid
 * Simple calculator with house SF, pricing option, and markup
 */
export function calculateInteriorSquareFootage(
  inputs: InteriorSqftInputs,
  pricing: PricingSettings
): BidResult {
  // Calculate labor COST based on pricing option
  let laborCost = 0;

  switch (inputs.pricingOption) {
    case 'walls-only':
      laborCost = inputs.houseSquareFootage * pricing.interiorSqft.wallsOnly;
      break;
    case 'trim-only':
      laborCost = inputs.houseSquareFootage * pricing.interiorSqft.trimOnly;
      break;
    case 'ceilings-only':
      laborCost = inputs.houseSquareFootage * pricing.interiorSqft.ceilingsOnly;
      break;
    case 'complete':
      laborCost = inputs.houseSquareFootage * pricing.interiorSqft.complete;
      break;
  }

  // Calculate auto-measurements
  const autoCalcs = calculateInteriorSqftAutoMeasurements(inputs.houseSquareFootage, pricing);

  // No materials in simple method
  const materials: MaterialBreakdown = {
    items: [],
    totalCost: 0,
  };

  // Calculate markup on labor cost
  const totalCost = laborCost + materials.totalCost;
  const profit = totalCost * (inputs.markup / 100);
  const total = totalCost + profit;

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
