import type { Bid } from '../types/bid.types';
import type { PricingSettings } from '../types/settings.types';
import type {
  InteriorDetailedInputs,
  ExteriorDetailedInputs,
} from '../types/calculator.types';

/**
 * Migrate old bid format to current version
 * Ensures backward compatibility with saved bids from before dynamic pricing
 */
export function migrateBidToCurrentVersion(bid: Bid, pricing: PricingSettings): Bid {
  // Simple calculators don't need migration
  if (bid.calculatorType === 'interior-sqft' || bid.calculatorType === 'exterior-sqft') {
    return bid;
  }

  // Check if bid is already in new format (has houseSquareFootage field)
  const inputs = bid.inputs as any;
  if (inputs.houseSquareFootage !== undefined) {
    return bid; // Already migrated
  }

  // Migrate detailed calculators
  if (bid.calculatorType === 'interior-detailed') {
    return migrateInteriorDetailedBid(bid, pricing);
  }

  if (bid.calculatorType === 'exterior-detailed') {
    return migrateExteriorDetailedBid(bid, pricing);
  }

  return bid;
}

/**
 * Migrate interior detailed bid
 * Adds houseSquareFootage field (set to 0) to match new format
 */
function migrateInteriorDetailedBid(bid: Bid, _pricing: PricingSettings): Bid {
  const oldInputs = bid.inputs as InteriorDetailedInputs;

  // Create new inputs with houseSquareFootage field
  const newInputs: InteriorDetailedInputs & { houseSquareFootage?: number } = {
    ...oldInputs,
    houseSquareFootage: 0, // Add new field, default to 0 (user didn't use auto-calc)
  };

  return {
    ...bid,
    inputs: newInputs,
  };
}

/**
 * Migrate exterior detailed bid
 * Adds houseSquareFootage field (set to 0) to match new format
 */
function migrateExteriorDetailedBid(bid: Bid, _pricing: PricingSettings): Bid {
  const oldInputs = bid.inputs as ExteriorDetailedInputs;

  // Create new inputs with houseSquareFootage field
  const newInputs: ExteriorDetailedInputs & { houseSquareFootage?: number } = {
    ...oldInputs,
    houseSquareFootage: 0, // Add new field, default to 0 (user didn't use auto-calc)
  };

  return {
    ...bid,
    inputs: newInputs,
  };
}

/**
 * Migrate all saved bids to current version
 * Call this when loading bids from localStorage
 */
export function migrateSavedBids(bids: Bid[], pricing: PricingSettings): Bid[] {
  return bids.map((bid) => migrateBidToCurrentVersion(bid, pricing));
}
