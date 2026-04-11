import type { PaintType, ExteriorPaintType, MaterialBreakdown, MaterialItem } from '../../../types/calculator.types';
import type { PricingSettings } from '../../../types/settings.types';

interface InteriorMaterialInputs {
  wallSqft: number;
  ceilingSqft: number;
  trimLF: number;
  cabinetDoors: number;
  newCabinetDoors: number;
  paintType: PaintType;
  wallPaintType?: PaintType;
  ceilingPaintType?: PaintType;
  trimPaintType?: PaintType;
  coats?: number;
}

/**
 * Calculate multi-coat multiplier.
 * Each additional coat uses 30% less material than the previous one.
 * 1 coat = 1.0x, 2 coats = 1.7x, 3 coats = 2.19x, etc.
 */
function coatMultiplier(coats: number): number {
  let total = 0;
  for (let i = 0; i < coats; i++) {
    total += Math.pow(0.7, i);
  }
  return total;
}

interface ExteriorMaterialInputs {
  wallSqft: number;
  trimLF: number;
  doors: number;
  paintType: ExteriorPaintType;
  wallPaintType?: ExteriorPaintType;
  trimPaintType?: ExteriorPaintType;
  wallCoverageOverride?: number; // sqft per gallon override from house material
}

/**
 * Calculate interior materials needed based on coverage rates
 */
export function calculateInteriorMaterials(
  inputs: InteriorMaterialInputs,
  pricing: PricingSettings
): MaterialBreakdown {
  const items: MaterialItem[] = [];
  const defaultPrice = pricing.interiorPaint[inputs.paintType];
  const coats = inputs.coats ?? 1;
  const multiplier = coatMultiplier(coats);
  const coatLabel = coats > 1 ? ` (${coats} coats)` : '';

  // Per-surface paint types (fall back to single paintType)
  const wallPaint = inputs.wallPaintType ?? inputs.paintType;
  const ceilingPaint = inputs.ceilingPaintType ?? inputs.paintType;
  const trimPaint = inputs.trimPaintType ?? inputs.paintType;
  const wallPrice = pricing.interiorPaint[wallPaint] ?? defaultPrice;
  const ceilingPrice = pricing.interiorPaint[ceilingPaint] ?? defaultPrice;
  const trimPrice = pricing.interiorPaint[trimPaint] ?? defaultPrice;

  // Calculate gallons needed for walls
  if (inputs.wallSqft > 0) {
    const baseGallons = inputs.wallSqft / pricing.interiorCoverage.wallSqftPerGallon;
    const wallGallons = Math.ceil(baseGallons * multiplier);
    items.push({
      name: `${wallPaint} - Walls${coatLabel}`,
      quantity: wallGallons,
      pricePerGallon: wallPrice,
      cost: wallGallons * wallPrice,
    });
  }

  // Calculate gallons needed for ceilings
  if (inputs.ceilingSqft > 0) {
    const baseGallons = inputs.ceilingSqft / pricing.interiorCoverage.ceilingSqftPerGallon;
    const ceilingGallons = Math.ceil(baseGallons * multiplier);
    items.push({
      name: `${ceilingPaint} - Ceilings${coatLabel}`,
      quantity: ceilingGallons,
      pricePerGallon: ceilingPrice,
      cost: ceilingGallons * ceilingPrice,
    });
  }

  // Calculate gallons needed for trim
  if (inputs.trimLF > 0) {
    const baseGallons = inputs.trimLF / pricing.interiorCoverage.trimLfPerGallon;
    const trimGallons = Math.ceil(baseGallons * multiplier);
    items.push({
      name: `${trimPaint} - Trim${coatLabel}`,
      quantity: trimGallons,
      pricePerGallon: trimPrice,
      cost: trimGallons * trimPrice,
    });
  }

  // Calculate gallons needed for cabinets (uses trim paint type)
  const totalCabinetDoors = inputs.cabinetDoors + inputs.newCabinetDoors;
  if (totalCabinetDoors > 0) {
    const baseGallons = totalCabinetDoors * pricing.interiorCoverage.cabinetGallonsPerDoor;
    const cabinetGallons = Math.ceil(baseGallons * multiplier);
    items.push({
      name: `${trimPaint} - Cabinets${coatLabel}`,
      quantity: cabinetGallons,
      pricePerGallon: trimPrice,
      cost: cabinetGallons * trimPrice,
    });
  }

  const totalCost = items.reduce((sum, item) => sum + item.cost, 0);

  return {
    items,
    totalCost,
  };
}

/**
 * Calculate exterior materials needed based on coverage rates
 */
export function calculateExteriorMaterials(
  inputs: ExteriorMaterialInputs,
  pricing: PricingSettings
): MaterialBreakdown {
  const items: MaterialItem[] = [];
  const defaultPrice = pricing.exteriorPaint[inputs.paintType];

  // Per-surface paint types (fall back to single paintType)
  const wallPaint = inputs.wallPaintType ?? inputs.paintType;
  const trimPaint = inputs.trimPaintType ?? inputs.paintType;
  const wallPrice = pricing.exteriorPaint[wallPaint] ?? defaultPrice;
  const trimPrice = pricing.exteriorPaint[trimPaint] ?? defaultPrice;

  // Calculate gallons needed for walls/siding
  const wallCoverage = inputs.wallCoverageOverride ?? pricing.exteriorCoverage.wallSqftPerGallon;
  if (inputs.wallSqft > 0) {
    const wallGallons = Math.ceil(inputs.wallSqft / wallCoverage);
    items.push({
      name: `${wallPaint} - Siding`,
      quantity: wallGallons,
      pricePerGallon: wallPrice,
      cost: wallGallons * wallPrice,
    });
  }

  // Calculate gallons needed for trim
  if (inputs.trimLF > 0) {
    const trimGallons = Math.ceil(inputs.trimLF / pricing.exteriorCoverage.trimLfPerGallon);
    items.push({
      name: `${trimPaint} - Trim/Fascia/Soffit`,
      quantity: trimGallons,
      pricePerGallon: trimPrice,
      cost: trimGallons * trimPrice,
    });
  }

  // Calculate gallons needed for doors (uses trim paint type)
  if (inputs.doors > 0) {
    const doorGallons = Math.ceil(inputs.doors * pricing.exteriorCoverage.doorGallonsPerDoor);
    items.push({
      name: `${trimPaint} - Doors`,
      quantity: doorGallons,
      pricePerGallon: trimPrice,
      cost: doorGallons * trimPrice,
    });
  }

  const totalCost = items.reduce((sum, item) => sum + item.cost, 0);

  return {
    items,
    totalCost,
  };
}

/**
 * Simple material calculation for square footage methods (no detailed breakdown)
 */
export function calculateSimpleMaterials(
  sqft: number,
  paintType: PaintType | ExteriorPaintType,
  coverageRate: number,
  pricing: PricingSettings,
  isExterior: boolean = false
): MaterialBreakdown {
  const pricePerGallon = isExterior
    ? pricing.exteriorPaint[paintType as ExteriorPaintType]
    : pricing.interiorPaint[paintType as PaintType];

  const gallons = Math.ceil(sqft / coverageRate);
  const cost = gallons * pricePerGallon;

  return {
    items: [
      {
        name: `${paintType} Paint`,
        quantity: gallons,
        pricePerGallon,
        cost,
      },
    ],
    totalCost: cost,
  };
}
