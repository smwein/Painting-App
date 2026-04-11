import type {
  InteriorSqftInputs,
  InteriorSqftAutoCalcs,
  BidResult,
  MaterialBreakdown,
} from '../../types/calculator.types';
import type { PricingSettings } from '../../types/settings.types';
import { calculateInteriorMaterials } from './utils/materialCalculations';

/**
 * Calculate auto-measurements based on house square footage
 */
export function calculateInteriorSqftAutoMeasurements(
  houseSquareFootage: number,
  pricing: PricingSettings
): InteriorSqftAutoCalcs {
  return {
    wallSqft: houseSquareFootage * pricing.interiorMultipliers.wall,
    ceilingSqft: houseSquareFootage * pricing.interiorMultipliers.ceiling,
    trimLF: houseSquareFootage * pricing.interiorMultipliers.trim,
  };
}

/**
 * Calculate interior square footage bid
 * Simple calculator with house SF, pricing option, house condition, and markup
 */
export function calculateInteriorSquareFootage(
  inputs: InteriorSqftInputs & { simpleModifiers?: Record<string, boolean>; interiorModifiers?: Record<string, boolean> },
  pricing: PricingSettings
): BidResult {
  // Use empty or furnished rates based on houseCondition
  const rates = inputs.houseCondition === 'empty'
    ? (pricing.interiorSqftEmpty ?? pricing.interiorSqft)
    : pricing.interiorSqft;

  // Sum rates for all selected pricing options
  let totalRate = 0;
  for (const option of inputs.pricingOptions) {
    switch (option) {
      case 'walls-only': totalRate += rates.wallsOnly; break;
      case 'trim-only': totalRate += rates.trimOnly; break;
      case 'ceilings-only': totalRate += rates.ceilingsOnly; break;
      case 'complete': totalRate += rates.complete; break;
    }
  }
  const baseCost = inputs.houseSquareFootage * totalRate;

  // Calculate auto-measurements for material estimation
  const autoCalcs = calculateInteriorSqftAutoMeasurements(inputs.houseSquareFootage, pricing);

  // If paint type is selected, calculate materials from actual paint pricing
  // Otherwise fall back to percentage split
  const laborPct = pricing.sqftLaborPct ?? 85;
  const matPct = 100 - laborPct;
  let laborCost: number;
  let baseMatCost: number;

  const hasPaintType = inputs.paintType && pricing.interiorPaint[inputs.paintType] !== undefined;
  const paintMaterialCalc = hasPaintType
    ? calculateInteriorMaterials(
        {
          wallSqft: autoCalcs.wallSqft,
          ceilingSqft: autoCalcs.ceilingSqft,
          trimLF: autoCalcs.trimLF,
          cabinetDoors: 0,
          newCabinetDoors: 0,
          paintType: inputs.paintType!,
          coats: inputs.coats,
        },
        pricing
      )
    : null;

  if (paintMaterialCalc) {
    baseMatCost = paintMaterialCalc.totalCost;
    laborCost = baseCost - baseMatCost;
    if (laborCost < 0) laborCost = baseCost * (laborPct / 100);
  } else {
    laborCost = baseCost * (laborPct / 100);
    baseMatCost = baseCost * (matPct / 100);
  }

  // Apply simple modifiers (respecting scope: labor, materials, or both)
  if (inputs.simpleModifiers && pricing.simpleInteriorModifiers) {
    for (const mod of pricing.simpleInteriorModifiers) {
      if (inputs.simpleModifiers[mod.id]) {
        const scope = mod.scope ?? 'both';
        if (scope === 'labor' || scope === 'both') laborCost *= mod.multiplier;
        if (scope === 'materials' || scope === 'both') baseMatCost *= mod.multiplier;
      }
    }
  }

  // Apply interior detailed modifiers (respecting scope: labor, materials, or both)
  if (inputs.interiorModifiers && pricing.interiorModifiers) {
    for (const mod of pricing.interiorModifiers) {
      if (inputs.interiorModifiers[mod.id]) {
        const scope = mod.scope ?? 'labor';
        if (scope === 'labor' || scope === 'both') laborCost *= mod.multiplier;
        if (scope === 'materials' || scope === 'both') baseMatCost *= mod.multiplier;
      }
    }
  }

  // Sum custom section line items into materials
  const customItems: MaterialBreakdown['items'] = [];
  let customTotal = 0;
  if (inputs.customItemValues) {
    for (const [itemId, qty] of Object.entries(inputs.customItemValues)) {
      if (!qty || qty <= 0) continue;
      const lineItem = pricing.lineItems.find((li) => li.id === itemId);
      if (!lineItem) continue;
      const cost = qty * lineItem.rate;
      customItems.push({ name: lineItem.name, quantity: qty, pricePerGallon: lineItem.rate, cost });
      customTotal += cost;
    }
  }
  const paintItems = paintMaterialCalc ? paintMaterialCalc.items : [];
  const materials: MaterialBreakdown = {
    items: [...paintItems, ...customItems],
    totalCost: baseMatCost + customTotal,
  };

  // Calculate total using margin formula: total = cost / (1 - margin%)
  const totalCost = laborCost + materials.totalCost;
  const marginFactor = Math.max(1 - inputs.markup / 100, 0.01);
  const total = totalCost / marginFactor;
  const profit = total - totalCost;

  return {
    labor: laborCost,
    materials,
    profit,
    total,
    breakdown: {
      houseSquareFootage: inputs.houseSquareFootage,
      pricingOptions: inputs.pricingOptions,
      houseCondition: inputs.houseCondition,
      autoCalculations: autoCalcs,
      markup: inputs.markup,
    },
    timestamp: new Date(),
  };
}
