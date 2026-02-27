import type {
  InteriorDetailedInputs,
  BidResult,
  InteriorDetailedBreakdown,
} from '../../types/calculator.types';
import { INTERIOR_DETAILED_RATES } from '../constants/pricing';
import { calculateInteriorMaterials } from './utils/materialCalculations';
import { applyInteriorModifiers } from './utils/modifierApplications';

/**
 * Calculate interior detailed bid
 * Most complex calculator with 22 input fields, modifiers, materials, and markup
 */
export function calculateInteriorDetailed(
  inputs: InteriorDetailedInputs
): BidResult {
  // 1. Calculate base labor from all line items
  let baseLabor = 0;

  // Measurements
  const measurementsLabor = {
    walls: inputs.wallSqft * INTERIOR_DETAILED_RATES.WALL_SQFT,
    ceilings: inputs.ceilingSqft * INTERIOR_DETAILED_RATES.CEILING_SQFT,
    trim: inputs.trimLF * INTERIOR_DETAILED_RATES.TRIM_LF,
  };
  baseLabor += measurementsLabor.walls + measurementsLabor.ceilings + measurementsLabor.trim;

  // Doors & Cabinets
  const doorsAndCabinetsLabor = {
    doors: inputs.doors * INTERIOR_DETAILED_RATES.DOOR,
    cabinetDoors: inputs.cabinetDoors * INTERIOR_DETAILED_RATES.CABINET_DOOR,
    cabinetDrawers: inputs.cabinetDrawers * INTERIOR_DETAILED_RATES.CABINET_DRAWER,
    newCabinetDoors: inputs.newCabinetDoors * INTERIOR_DETAILED_RATES.NEW_CABINET_DOOR,
    newCabinetDrawers: inputs.newCabinetDrawers * INTERIOR_DETAILED_RATES.NEW_CABINET_DRAWER,
  };
  baseLabor += Object.values(doorsAndCabinetsLabor).reduce((sum, val) => sum + val, 0);

  // Prep work
  const prepWorkLabor = {
    wallpaperRemoval: inputs.wallpaperRemovalSqft * INTERIOR_DETAILED_RATES.WALLPAPER_REMOVAL_SQFT,
    priming: (inputs.primingLF * INTERIOR_DETAILED_RATES.PRIMING_LF) +
             (inputs.primingSqft * INTERIOR_DETAILED_RATES.PRIMING_SQFT),
    drywallReplacement: inputs.drywallReplacementSqft * INTERIOR_DETAILED_RATES.DRYWALL_REPLACEMENT_SQFT,
    popcornRemoval: inputs.popcornRemovalSqft * INTERIOR_DETAILED_RATES.POPCORN_REMOVAL_SQFT,
    wallTextureRemoval: inputs.wallTextureRemovalSqft * INTERIOR_DETAILED_RATES.WALL_TEXTURE_REMOVAL_SQFT,
    trimReplacement: inputs.trimReplacementLF * INTERIOR_DETAILED_RATES.TRIM_REPLACEMENT_LF,
    drywallRepairs: inputs.drywallRepairs * INTERIOR_DETAILED_RATES.DRYWALL_REPAIR,
  };
  baseLabor += Object.values(prepWorkLabor).reduce((sum, val) => sum + val, 0);

  // Additional work
  const additionalLabor = {
    colorsAboveThree: inputs.colorsAboveThree * INTERIOR_DETAILED_RATES.COLOR_ABOVE_THREE,
    accentWalls: inputs.accentWalls * INTERIOR_DETAILED_RATES.ACCENT_WALL,
    miscWork: inputs.miscWorkHours * INTERIOR_DETAILED_RATES.MISC_WORK_HOUR,
    miscellaneous: inputs.miscellaneousDollars,
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
  });

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
