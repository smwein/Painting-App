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
 * This is the simplest calculator - just house SF and pricing option
 */
export function calculateInteriorSquareFootage(
  inputs: InteriorSqftInputs
): BidResult {
  // Calculate labor based on pricing option
  let labor = 0;

  switch (inputs.pricingOption) {
    case 'walls-only':
      labor = inputs.houseSquareFootage * INTERIOR_SQFT_PRICING.WALLS_ONLY;
      break;
    case 'trim-only':
      labor = inputs.houseSquareFootage * INTERIOR_SQFT_PRICING.TRIM_ONLY;
      break;
    case 'ceilings-only':
      labor = inputs.houseSquareFootage * INTERIOR_SQFT_PRICING.CEILINGS_ONLY;
      break;
    case 'complete':
      labor = inputs.houseSquareFootage * INTERIOR_SQFT_PRICING.COMPLETE;
      break;
  }

  // Calculate auto-measurements
  const autoCalcs = calculateInteriorSqftAutoMeasurements(inputs.houseSquareFootage);

  // No materials calculated in this simple method
  // User would need to add materials separately or use detailed method
  const materials: MaterialBreakdown = {
    items: [],
    totalCost: 0,
  };

  // No markup in this simple method - just labor
  const profit = 0;
  const total = labor;

  return {
    labor,
    materials,
    profit,
    total,
    breakdown: {
      houseSquareFootage: inputs.houseSquareFootage,
      pricingOption: inputs.pricingOption,
      autoCalculations: autoCalcs,
    },
    timestamp: new Date(),
  };
}
