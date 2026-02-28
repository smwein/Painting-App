import type {
  InteriorDetailedInputs,
  BidResult,
  InteriorDetailedBreakdown,
} from '../../types/calculator.types';
import type { PricingSettings } from '../../types/settings.types';
import { calculateInteriorMaterials } from './utils/materialCalculations';
import { applyInteriorModifiers } from './utils/modifierApplications';

/**
 * Calculate interior detailed bid
 * Most complex calculator with 22 input fields, modifiers, materials, and markup
 */
export function calculateInteriorDetailed(
  inputs: InteriorDetailedInputs,
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
    walls: inputs.wallSqft * getRate('int-wall-sqft'),
    ceilings: inputs.ceilingSqft * getRate('int-ceiling-sqft'),
    trim: inputs.trimLF * getRate('int-trim-lf'),
  };
  baseLabor += measurementsLabor.walls + measurementsLabor.ceilings + measurementsLabor.trim;

  // Doors & Cabinets
  const doorsAndCabinetsLabor = {
    doors: inputs.doors * getRate('int-door'),
    cabinetDoors: inputs.cabinetDoors * getRate('int-cabinet-door'),
    cabinetDrawers: inputs.cabinetDrawers * getRate('int-cabinet-drawer'),
    newCabinetDoors: inputs.newCabinetDoors * getRate('int-new-cabinet-door'),
    newCabinetDrawers: inputs.newCabinetDrawers * getRate('int-new-cabinet-drawer'),
  };
  baseLabor += Object.values(doorsAndCabinetsLabor).reduce((sum, val) => sum + val, 0);

  // Prep work
  const prepWorkLabor = {
    wallpaperRemoval: inputs.wallpaperRemovalSqft * getRate('int-wallpaper-removal-sqft'),
    priming: (inputs.primingLF * getRate('int-priming-lf')) +
             (inputs.primingSqft * getRate('int-priming-sqft')),
    drywallReplacement: inputs.drywallReplacementSqft * getRate('int-drywall-replacement-sqft'),
    popcornRemoval: inputs.popcornRemovalSqft * getRate('int-popcorn-removal-sqft'),
    wallTextureRemoval: inputs.wallTextureRemovalSqft * getRate('int-wall-texture-removal-sqft'),
    trimReplacement: inputs.trimReplacementLF * getRate('int-trim-replacement-lf'),
    drywallRepairs: inputs.drywallRepairs * getRate('int-drywall-repair'),
  };
  baseLabor += Object.values(prepWorkLabor).reduce((sum, val) => sum + val, 0);

  // Additional work
  const additionalLabor = {
    colorsAboveThree: inputs.colorsAboveThree * getRate('int-color-above-three'),
    accentWalls: inputs.accentWalls * getRate('int-accent-wall'),
    miscWork: inputs.miscWorkHours * getRate('int-misc-work-hour'),
    miscellaneous: inputs.miscellaneousDollars * getRate('int-miscellaneous-dollars'),
  };
  baseLabor += Object.values(additionalLabor).reduce((sum, val) => sum + val, 0);

  // 2. Apply modifiers (multiplicative)
  const { modifiedLabor, appliedModifiers } = applyInteriorModifiers(baseLabor, inputs.modifiers);

  // 3. Calculate materials
  const materials = calculateInteriorMaterials({
    wallSqft: inputs.wallSqft,
    ceilingSqft: inputs.ceilingSqft,
    trimLF: inputs.trimLF,
    cabinetDoors: inputs.cabinetDoors,
    newCabinetDoors: inputs.newCabinetDoors,
    paintType: inputs.paintType,
  }, pricing);

  // 4. Calculate profit (markup applied to labor + materials)
  const subtotal = modifiedLabor + materials.totalCost;
  const profit = subtotal * (inputs.markup / 100);

  // 5. Calculate total
  const total = subtotal + profit;

  // Build detailed breakdown
  const breakdown: InteriorDetailedBreakdown = {
    measurements: measurementsLabor,
    doorsAndCabinets: doorsAndCabinetsLabor,
    prepWork: prepWorkLabor,
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
