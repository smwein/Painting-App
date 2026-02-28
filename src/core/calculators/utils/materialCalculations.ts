import type { PaintType, ExteriorPaintType, MaterialBreakdown, MaterialItem } from '../../../types/calculator.types';
import type { PricingSettings } from '../../../types/settings.types';

interface InteriorMaterialInputs {
  wallSqft: number;
  ceilingSqft: number;
  trimLF: number;
  cabinetDoors: number;
  newCabinetDoors: number;
  paintType: PaintType;
}

interface ExteriorMaterialInputs {
  wallSqft: number;
  trimLF: number;
  doors: number;
  paintType: ExteriorPaintType;
}

/**
 * Calculate interior materials needed based on coverage rates
 */
export function calculateInteriorMaterials(
  inputs: InteriorMaterialInputs,
  pricing: PricingSettings
): MaterialBreakdown {
  const items: MaterialItem[] = [];
  const pricePerGallon = pricing.interiorPaint[inputs.paintType];

  // Calculate gallons needed for walls
  if (inputs.wallSqft > 0) {
    const wallGallons = Math.ceil(inputs.wallSqft / pricing.interiorCoverage.wallSqftPerGallon);
    items.push({
      name: `${inputs.paintType} - Walls`,
      quantity: wallGallons,
      pricePerGallon,
      cost: wallGallons * pricePerGallon,
    });
  }

  // Calculate gallons needed for ceilings
  if (inputs.ceilingSqft > 0) {
    const ceilingGallons = Math.ceil(inputs.ceilingSqft / pricing.interiorCoverage.ceilingSqftPerGallon);
    items.push({
      name: `${inputs.paintType} - Ceilings`,
      quantity: ceilingGallons,
      pricePerGallon,
      cost: ceilingGallons * pricePerGallon,
    });
  }

  // Calculate gallons needed for trim
  if (inputs.trimLF > 0) {
    const trimGallons = Math.ceil(inputs.trimLF / pricing.interiorCoverage.trimLfPerGallon);
    items.push({
      name: `${inputs.paintType} - Trim`,
      quantity: trimGallons,
      pricePerGallon,
      cost: trimGallons * pricePerGallon,
    });
  }

  // Calculate gallons needed for cabinets
  const totalCabinetDoors = inputs.cabinetDoors + inputs.newCabinetDoors;
  if (totalCabinetDoors > 0) {
    const cabinetGallons = Math.ceil(totalCabinetDoors * pricing.interiorCoverage.cabinetGallonsPerDoor);
    items.push({
      name: `${inputs.paintType} - Cabinets`,
      quantity: cabinetGallons,
      pricePerGallon,
      cost: cabinetGallons * pricePerGallon,
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
  const pricePerGallon = pricing.exteriorPaint[inputs.paintType];

  // Calculate gallons needed for walls/siding
  if (inputs.wallSqft > 0) {
    const wallGallons = Math.ceil(inputs.wallSqft / pricing.exteriorCoverage.wallSqftPerGallon);
    items.push({
      name: `${inputs.paintType} - Siding`,
      quantity: wallGallons,
      pricePerGallon,
      cost: wallGallons * pricePerGallon,
    });
  }

  // Calculate gallons needed for trim
  if (inputs.trimLF > 0) {
    const trimGallons = Math.ceil(inputs.trimLF / pricing.exteriorCoverage.trimLfPerGallon);
    items.push({
      name: `${inputs.paintType} - Trim/Fascia/Soffit`,
      quantity: trimGallons,
      pricePerGallon,
      cost: trimGallons * pricePerGallon,
    });
  }

  // Calculate gallons needed for doors
  if (inputs.doors > 0) {
    const doorGallons = Math.ceil(inputs.doors * pricing.exteriorCoverage.doorGallonsPerDoor);
    items.push({
      name: `${inputs.paintType} - Doors`,
      quantity: doorGallons,
      pricePerGallon,
      cost: doorGallons * pricePerGallon,
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
