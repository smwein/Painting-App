import type {
  InteriorDetailedInputs,
  BidResult,
  InteriorDetailedBreakdown,
  MaterialBreakdown,
} from '../../types/calculator.types';
import type { PricingSettings } from '../../types/settings.types';
import { calculateInteriorMaterials } from './utils/materialCalculations';
import { applyInteriorModifiers, applyDynamicModifiers } from './utils/modifierApplications';

/**
 * Calculate interior detailed bid
 * Most complex calculator with 22 input fields, modifiers, materials, and markup
 */
export function calculateInteriorDetailed(
  inputs: InteriorDetailedInputs & { dynamicModifiers?: Record<string, boolean> },
  pricing: PricingSettings
): BidResult {
  // Helper function to get rate for a line item
  // Wall/ceiling/trim use furnished vs empty rates when configured
  const getRate = (lineItemId: string): number => {
    const conditionRates = inputs.houseCondition === 'empty'
      ? pricing.interiorDetailedEmptyRates
      : pricing.interiorDetailedFurnishedRates;
    if (lineItemId === 'int-wall-sqft' && conditionRates) return conditionRates.wallSqft;
    if (lineItemId === 'int-ceiling-sqft' && conditionRates) return conditionRates.ceilingSqft;
    if (lineItemId === 'int-trim-lf' && conditionRates) return conditionRates.trimLF;
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

  // Custom line item labor (from user-added sections)
  if (inputs.customItemValues) {
    for (const [itemId, quantity] of Object.entries(inputs.customItemValues)) {
      baseLabor += quantity * getRate(itemId);
    }
  }

  // 2. Calculate materials FIRST (so modifiers can apply to them if scoped)
  const materials = calculateInteriorMaterials({
    wallSqft: inputs.wallSqft,
    ceilingSqft: inputs.ceilingSqft,
    trimLF: inputs.trimLF,
    cabinetDoors: inputs.cabinetDoors,
    newCabinetDoors: inputs.newCabinetDoors,
    paintType: inputs.paintType,
    wallPaintType: inputs.wallPaintType,
    ceilingPaintType: inputs.ceilingPaintType,
    trimPaintType: inputs.trimPaintType,
  }, pricing);

  // 3. Apply modifiers (multiplicative, scope-aware)
  // Use dynamic modifiers if available, otherwise fall back to old fixed modifiers
  let modifiedLabor: number;
  let modifiedMaterialCost: number;
  let appliedModifiers: string[];

  if (inputs.dynamicModifiers && pricing.interiorModifiers && pricing.interiorModifiers.length > 0) {
    const result = applyDynamicModifiers(baseLabor, materials.totalCost, inputs.dynamicModifiers, pricing.interiorModifiers);
    modifiedLabor = result.modifiedLabor;
    modifiedMaterialCost = result.modifiedMaterialCost;
    appliedModifiers = result.appliedModifiers;
  } else {
    const result = applyInteriorModifiers(baseLabor, materials.totalCost, inputs.modifiers, pricing);
    modifiedLabor = result.modifiedLabor;
    modifiedMaterialCost = result.modifiedMaterialCost;
    appliedModifiers = result.appliedModifiers;
  }

  const modifiedMaterials: MaterialBreakdown = {
    items: materials.items,
    totalCost: modifiedMaterialCost,
  };

  // 4. Calculate total using margin formula: total = cost / (1 - margin%)
  const subtotal = modifiedLabor + modifiedMaterialCost;
  const marginFactor = Math.max(1 - inputs.markup / 100, 0.01);
  const total = subtotal / marginFactor;
  const profit = total - subtotal;

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
    materials: modifiedMaterials,
    profit,
    total,
    breakdown,
    timestamp: new Date(),
  };
}
