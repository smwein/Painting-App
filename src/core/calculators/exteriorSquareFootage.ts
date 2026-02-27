import type {
  ExteriorSqftInputs,
  ExteriorSqftAutoCalcs,
  BidResult,
  MaterialBreakdown,
} from '../../types/calculator.types';
import { EXTERIOR_SQFT_PRICING } from '../constants/pricing';
import { EXTERIOR_SQFT_MULTIPLIERS } from '../constants/coverage';

/**
 * Calculate auto-measurements based on house square footage
 */
export function calculateExteriorSqftAutoMeasurements(
  houseSquareFootage: number
): ExteriorSqftAutoCalcs {
  return {
    sidingSqft: houseSquareFootage * EXTERIOR_SQFT_MULTIPLIERS.SIDING_MULTIPLIER,
    trimLF: houseSquareFootage * EXTERIOR_SQFT_MULTIPLIERS.TRIM_MULTIPLIER,
  };
}

/**
 * Calculate exterior square footage bid
 * Simple calculator with house SF, pricing option, and markup
 */
export function calculateExteriorSquareFootage(
  inputs: ExteriorSqftInputs
): BidResult {
  // Calculate labor COST based on pricing option
  let laborCost = 0;

  switch (inputs.pricingOption) {
    case 'full-exterior':
      laborCost = inputs.houseSquareFootage * EXTERIOR_SQFT_PRICING.FULL_EXTERIOR;
      break;
    case 'trim-only':
      laborCost = inputs.houseSquareFootage * EXTERIOR_SQFT_PRICING.TRIM_ONLY;
      break;
  }

  // Calculate auto-measurements
  const autoCalcs = calculateExteriorSqftAutoMeasurements(inputs.houseSquareFootage);

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
