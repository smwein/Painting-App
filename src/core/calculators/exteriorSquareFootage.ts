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
 * Simple calculator - just house SF and pricing option
 */
export function calculateExteriorSquareFootage(
  inputs: ExteriorSqftInputs
): BidResult {
  // Calculate labor based on pricing option
  let labor = 0;

  switch (inputs.pricingOption) {
    case 'full-exterior':
      labor = inputs.houseSquareFootage * EXTERIOR_SQFT_PRICING.FULL_EXTERIOR;
      break;
    case 'trim-only':
      labor = inputs.houseSquareFootage * EXTERIOR_SQFT_PRICING.TRIM_ONLY;
      break;
  }

  // Calculate auto-measurements
  const autoCalcs = calculateExteriorSqftAutoMeasurements(inputs.houseSquareFootage);

  // No materials calculated in this simple method
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
