import type {
  InteriorSqftInputs,
  InteriorSqftAutoCalcs,
  BidResult,
  MaterialBreakdown,
} from '../../types/calculator.types';
import { INTERIOR_SQFT_PRICING } from '../constants/pricing';
import { INTERIOR_SQFT_MULTIPLIERS } from '../constants/coverage';

/**
 * Calculate auto-measurements based on house square footage
 */
export function calculateInteriorSqftAutoMeasurements(
  houseSquareFootage: number
): InteriorSqftAutoCalcs {
  return {
    wallSqft: houseSquareFootage * INTERIOR_SQFT_MULTIPLIERS.WALL_MULTIPLIER,
    ceilingSqft: houseSquareFootage * INTERIOR_SQFT_MULTIPLIERS.CEILING_MULTIPLIER,
    trimLF: houseSquareFootage * INTERIOR_SQFT_MULTIPLIERS.TRIM_MULTIPLIER,
  };
}

/**
 * Calculate interior square footage bid
 * Simple calculator with house SF, pricing option, and markup
 */
export function calculateInteriorSquareFootage(
  inputs: InteriorSqftInputs
): BidResult {
  // Calculate labor COST based on pricing option
  let laborCost = 0;

  switch (inputs.pricingOption) {
    case 'walls-only':
      laborCost = inputs.houseSquareFootage * INTERIOR_SQFT_PRICING.WALLS_ONLY;
      break;
    case 'trim-only':
      laborCost = inputs.houseSquareFootage * INTERIOR_SQFT_PRICING.TRIM_ONLY;
      break;
    case 'ceilings-only':
      laborCost = inputs.houseSquareFootage * INTERIOR_SQFT_PRICING.CEILINGS_ONLY;
      break;
    case 'complete':
      laborCost = inputs.houseSquareFootage * INTERIOR_SQFT_PRICING.COMPLETE;
      break;
  }

  // Calculate auto-measurements
  const autoCalcs = calculateInteriorSqftAutoMeasurements(inputs.houseSquareFootage);

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
