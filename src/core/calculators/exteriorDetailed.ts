import type {
  ExteriorDetailedInputs,
  BidResult,
  ExteriorDetailedBreakdown,
} from '../../types/calculator.types';
import { EXTERIOR_DETAILED_RATES } from '../constants/pricing';
import { calculateExteriorMaterials } from './utils/materialCalculations';
import { applyExteriorModifiers } from './utils/modifierApplications';

/**
 * Calculate exterior detailed bid
 * Complex calculator with 21 input fields, modifiers, materials, and markup
 */
export function calculateExteriorDetailed(
  inputs: ExteriorDetailedInputs
): BidResult {
  // 1. Calculate base labor from all line items
  let baseLabor = 0;

  // Measurements
  const measurementsLabor = {
    walls: inputs.wallSqft * EXTERIOR_DETAILED_RATES.WALL_SQFT,
    trimFasciaSoffit: inputs.trimFasciaSoffitLF * EXTERIOR_DETAILED_RATES.TRIM_FASCIA_SOFFIT_LF,
  };
  baseLabor += measurementsLabor.walls + measurementsLabor.trimFasciaSoffit;

  // Doors & Shutters
  const doorsAndShuttersLabor = {
    doors: inputs.doors * EXTERIOR_DETAILED_RATES.DOOR,
    shutters: inputs.shutters * EXTERIOR_DETAILED_RATES.SHUTTER,
    doorsToRefinish: inputs.doorsToRefinish * EXTERIOR_DETAILED_RATES.DOOR_REFINISH,
  };
  baseLabor += Object.values(doorsAndShuttersLabor).reduce((sum, val) => sum + val, 0);

  // Prep work
  const prepWorkLabor = {
    priming: (inputs.primingSqft * EXTERIOR_DETAILED_RATES.PRIMING_SQFT) +
             (inputs.primingLF * EXTERIOR_DETAILED_RATES.PRIMING_LF),
  };
  baseLabor += prepWorkLabor.priming;

  // Replacements & Repairs
  const replacementsAndRepairsLabor = {
    sidingReplacement: inputs.sidingReplacementSqft * EXTERIOR_DETAILED_RATES.SIDING_REPLACEMENT_SQFT,
    trimReplacement: inputs.trimReplacementLF * EXTERIOR_DETAILED_RATES.TRIM_REPLACEMENT_LF,
    soffitFasciaReplacement: inputs.soffitFasciaReplacementLF * EXTERIOR_DETAILED_RATES.SOFFIT_FASCIA_REPLACEMENT_LF,
    bondoRepairs: inputs.bondoRepairs * EXTERIOR_DETAILED_RATES.BONDO_REPAIR,
  };
  baseLabor += Object.values(replacementsAndRepairsLabor).reduce((sum, val) => sum + val, 0);

  // Additional work
  const additionalLabor = {
    deckStaining: inputs.deckStainingSqft * EXTERIOR_DETAILED_RATES.DECK_STAINING_SQFT,
    miscPressureWashing: inputs.miscPressureWashingSqft * EXTERIOR_DETAILED_RATES.MISC_PRESSURE_WASHING_SQFT,
    miscWork: inputs.miscWorkHours * EXTERIOR_DETAILED_RATES.MISC_WORK_HOUR,
    miscellaneous: inputs.miscellaneousDollars,
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
  });

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
