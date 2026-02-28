import type {
  ExteriorDetailedInputs,
  BidResult,
  ExteriorDetailedBreakdown,
} from '../../types/calculator.types';
import type { PricingSettings } from '../../types/settings.types';
import { calculateExteriorMaterials } from './utils/materialCalculations';
import { applyExteriorModifiers } from './utils/modifierApplications';

/**
 * Calculate exterior detailed bid
 * Complex calculator with 21 input fields, modifiers, materials, and markup
 */
export function calculateExteriorDetailed(
  inputs: ExteriorDetailedInputs,
  pricing: PricingSettings
): BidResult {
  // Helper function to get rate for a line item
  const getRate = (lineItemId: string): number => {
    const item = pricing.lineItems.find((i) => i.id === lineItemId);
    return item?.rate || 0;
  };

  // 1. Calculate base labor from all line items
  let baseLabor = 0;

  // Measurements
  const measurementsLabor = {
    walls: inputs.wallSqft * getRate('ext-wall-sqft'),
    trimFasciaSoffit: inputs.trimFasciaSoffitLF * getRate('ext-trim-fascia-soffit-lf'),
  };
  baseLabor += measurementsLabor.walls + measurementsLabor.trimFasciaSoffit;

  // Doors & Shutters
  const doorsAndShuttersLabor = {
    doors: inputs.doors * getRate('ext-door'),
    shutters: inputs.shutters * getRate('ext-shutter'),
    doorsToRefinish: inputs.doorsToRefinish * getRate('ext-door-refinish'),
  };
  baseLabor += Object.values(doorsAndShuttersLabor).reduce((sum, val) => sum + val, 0);

  // Prep work
  const prepWorkLabor = {
    priming: (inputs.primingSqft * getRate('ext-priming-sqft')) +
             (inputs.primingLF * getRate('ext-priming-lf')),
  };
  baseLabor += prepWorkLabor.priming;

  // Replacements & Repairs
  const replacementsAndRepairsLabor = {
    sidingReplacement: inputs.sidingReplacementSqft * getRate('ext-siding-replacement-sqft'),
    trimReplacement: inputs.trimReplacementLF * getRate('ext-trim-replacement-lf'),
    soffitFasciaReplacement: inputs.soffitFasciaReplacementLF * getRate('ext-soffit-fascia-replacement-lf'),
    bondoRepairs: inputs.bondoRepairs * getRate('ext-bondo-repair'),
  };
  baseLabor += Object.values(replacementsAndRepairsLabor).reduce((sum, val) => sum + val, 0);

  // Additional work
  const additionalLabor = {
    deckStaining: inputs.deckStainingSqft * getRate('ext-deck-staining-sqft'),
    miscPressureWashing: inputs.miscPressureWashingSqft * getRate('ext-misc-pressure-washing-sqft'),
    miscWork: inputs.miscWorkHours * getRate('ext-misc-work-hour'),
    miscellaneous: inputs.miscellaneousDollars * getRate('ext-miscellaneous-dollars'),
  };
  baseLabor += Object.values(additionalLabor).reduce((sum, val) => sum + val, 0);

  // 2. Apply modifiers (multiplicative)
  const { modifiedLabor, appliedModifiers } = applyExteriorModifiers(baseLabor, inputs.modifiers);

  // 3. Calculate materials
  const materials = calculateExteriorMaterials({
    wallSqft: inputs.wallSqft,
    trimLF: inputs.trimFasciaSoffitLF,
    doors: inputs.doors,
    paintType: inputs.paintType,
  }, pricing);

  // 4. Calculate profit (markup applied to labor + materials)
  const subtotal = modifiedLabor + materials.totalCost;
  const profit = subtotal * (inputs.markup / 100);

  // 5. Calculate total
  const total = subtotal + profit;

  // Build detailed breakdown
  const breakdown: ExteriorDetailedBreakdown = {
    measurements: measurementsLabor,
    doorsAndShutters: doorsAndShuttersLabor,
    prepWork: prepWorkLabor,
    replacementsAndRepairs: replacementsAndRepairsLabor,
    additional: additionalLabor,
    baseLabor,
    modifiersApplied: appliedModifiers,
    modifiedLabor,
  };

  return {
    labor: modifiedLabor,
    materials,
    profit,
    total,
    breakdown,
    timestamp: new Date(),
  };
}
