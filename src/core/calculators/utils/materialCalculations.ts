import type { PaintType, ExteriorPaintType, MaterialBreakdown, MaterialItem } from '../../../types/calculator.types';
import { PAINT_PRICES, EXTERIOR_PAINT_PRICES } from '../../constants/pricing';
import { INTERIOR_COVERAGE, EXTERIOR_COVERAGE } from '../../constants/coverage';

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
export function calculateInteriorMaterials(inputs: InteriorMaterialInputs): MaterialBreakdown {
  const items: MaterialItem[] = [];
  const pricePerGallon = PAINT_PRICES[inputs.paintType];

  // Calculate gallons needed for walls
  if (inputs.wallSqft > 0) {
    const wallGallons = Math.ceil(inputs.wallSqft / INTERIOR_COVERAGE.WALL_SQFT_PER_GALLON);
    items.push({
      name: `${inputs.paintType} - Walls`,
      quantity: wallGallons,
      pricePerGallon,
      cost: wallGallons * pricePerGallon,
    });
  }

  // Calculate gallons needed for ceilings
  if (inputs.ceilingSqft > 0) {
    const ceilingGallons = Math.ceil(inputs.ceilingSqft / INTERIOR_COVERAGE.CEILING_SQFT_PER_GALLON);
    items.push({
      name: `${inputs.paintType} - Ceilings`,
      quantity: ceilingGallons,
      pricePerGallon,
      cost: ceilingGallons * pricePerGallon,
    });
  }

  // Calculate gallons needed for trim
  if (inputs.trimLF > 0) {
    const trimGallons = Math.ceil(inputs.trimLF / INTERIOR_COVERAGE.TRIM_LF_PER_GALLON);
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
    const cabinetGallons = Math.ceil(totalCabinetDoors * INTERIOR_COVERAGE.CABINET_GALLONS_PER_DOOR);
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
export function calculateExteriorMaterials(inputs: ExteriorMaterialInputs): MaterialBreakdown {
  const items: MaterialItem[] = [];
  const pricePerGallon = EXTERIOR_PAINT_PRICES[inputs.paintType];

  // Calculate gallons needed for walls/siding
  if (inputs.wallSqft > 0) {
    const wallGallons = Math.ceil(inputs.wallSqft / EXTERIOR_COVERAGE.WALL_SQFT_PER_GALLON);
    items.push({
      name: `${inputs.paintType} - Siding`,
      quantity: wallGallons,
      pricePerGallon,
      cost: wallGallons * pricePerGallon,
    });
  }

  // Calculate gallons needed for trim
  if (inputs.trimLF > 0) {
    const trimGallons = Math.ceil(inputs.trimLF / EXTERIOR_COVERAGE.TRIM_LF_PER_GALLON);
    items.push({
      name: `${inputs.paintType} - Trim/Fascia/Soffit`,
      quantity: trimGallons,
      pricePerGallon,
      cost: trimGallons * pricePerGallon,
    });
  }

  // Calculate gallons needed for doors
  if (inputs.doors > 0) {
    const doorGallons = Math.ceil(inputs.doors * EXTERIOR_COVERAGE.DOOR_GALLONS_PER_DOOR);
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
  isExterior: boolean = false
): MaterialBreakdown {
  const pricePerGallon = isExterior
    ? EXTERIOR_PAINT_PRICES[paintType as ExteriorPaintType]
    : PAINT_PRICES[paintType as PaintType];

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
