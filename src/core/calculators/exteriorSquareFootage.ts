import type {
  ExteriorSqftInputs,
  ExteriorSqftAutoCalcs,
  BidResult,
  MaterialBreakdown,
} from '../../types/calculator.types';
import type { PricingSettings } from '../../types/settings.types';

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

  // Split base cost into labor and materials using configured ratio
  const laborPct = pricing.sqftLaborPct ?? 85;
  const matPct = 100 - laborPct;
  let laborCost = baseCost * (laborPct / 100);
  let baseMatCost = baseCost * (matPct / 100);

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

  // Calculate auto-measurements
  const autoCalcs = calculateExteriorSqftAutoMeasurements(inputs.houseSquareFootage, pricing);

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
  const materials: MaterialBreakdown = {
    items: customItems,
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
