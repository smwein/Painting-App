import type {
  ExteriorSqftInputs,
  ExteriorSqftAutoCalcs,
  BidResult,
  MaterialBreakdown,
} from '../../types/calculator.types';
import type { PricingSettings } from '../../types/settings.types';
import { calculateExteriorMaterials } from './utils/materialCalculations';

/**
 * Calculate auto-measurements based on house square footage
 */
export function calculateExteriorSqftAutoMeasurements(
  houseSquareFootage: number,
  pricing: PricingSettings
): ExteriorSqftAutoCalcs {
  return {
    sidingSqft: houseSquareFootage * pricing.exteriorMultipliers.siding,
    trimLF: houseSquareFootage * pricing.exteriorMultipliers.trim,
  };
}

/**
 * Calculate exterior square footage bid
 * Simple calculator with house SF, pricing option, and markup
 */
export function calculateExteriorSquareFootage(
  inputs: ExteriorSqftInputs & { exteriorModifiers?: Record<string, boolean> },
  pricing: PricingSettings
): BidResult {
  // Sum rates for all selected pricing options
  let totalRate = 0;
  for (const option of inputs.pricingOptions) {
    switch (option) {
      case 'full-exterior': totalRate += pricing.exteriorSqft.fullExterior; break;
      case 'trim-only': totalRate += pricing.exteriorSqft.trimOnly; break;
      default: {
        // Custom sqft line item — look up rate from pricing.lineItems
        const customItem = pricing.lineItems.find((li) => li.id === option && li.category === 'ext-sqft-pricing');
        if (customItem) totalRate += customItem.rate;
        break;
      }
    }
  }
  const baseCost = inputs.houseSquareFootage * totalRate;

  // Calculate auto-measurements for material estimation
  const autoCalcs = calculateExteriorSqftAutoMeasurements(inputs.houseSquareFootage, pricing);

  // If paint type is selected, calculate materials from actual paint pricing
  // Otherwise fall back to percentage split
  const laborPct = pricing.sqftLaborPct ?? 85;
  const matPct = 100 - laborPct;
  let laborCost: number;
  let baseMatCost: number;

  const hasPaintType = inputs.paintType && pricing.exteriorPaint[inputs.paintType] !== undefined;
  const houseMaterialConfig = inputs.houseMaterial
    ? pricing.houseMaterials?.find((m) => m.id === inputs.houseMaterial)
    : undefined;
  const paintMaterialCalc = hasPaintType
    ? calculateExteriorMaterials(
        {
          wallSqft: autoCalcs.sidingSqft,
          trimLF: autoCalcs.trimLF,
          doors: 0,
          paintType: inputs.paintType!,
          wallCoverageOverride: houseMaterialConfig?.coverageSqftPerGallon,
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

  // Apply exterior modifiers (respecting scope: labor, materials, or both)
  if (inputs.exteriorModifiers && pricing.exteriorModifiers) {
    for (const mod of pricing.exteriorModifiers) {
      if (inputs.exteriorModifiers[mod.id]) {
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
      autoCalculations: autoCalcs,
      markup: inputs.markup,
    },
    timestamp: new Date(),
  };
}
