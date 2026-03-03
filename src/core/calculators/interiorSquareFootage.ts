import type {
  InteriorSqftInputs,
  InteriorSqftAutoCalcs,
  BidResult,
  MaterialBreakdown,
} from '../../types/calculator.types';
import type { PricingSettings } from '../../types/settings.types';

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
  inputs: InteriorSqftInputs,
  pricing: PricingSettings
): BidResult {
  // Use empty or furnished rates based on houseCondition
  const rates = inputs.houseCondition === 'empty'
    ? (pricing.interiorSqftEmpty ?? pricing.interiorSqft)
    : pricing.interiorSqft;

  // Calculate labor COST based on pricing option
  let laborCost = 0;

  switch (inputs.pricingOption) {
    case 'walls-only':
      laborCost = inputs.houseSquareFootage * rates.wallsOnly;
      break;
    case 'trim-only':
      laborCost = inputs.houseSquareFootage * rates.trimOnly;
      break;
    case 'ceilings-only':
      laborCost = inputs.houseSquareFootage * rates.ceilingsOnly;
      break;
    case 'complete':
      laborCost = inputs.houseSquareFootage * rates.complete;
      break;
  }

  // Calculate auto-measurements
  const autoCalcs = calculateInteriorSqftAutoMeasurements(inputs.houseSquareFootage, pricing);

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
    totalCost: customTotal,
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
      pricingOption: inputs.pricingOption,
      houseCondition: inputs.houseCondition,
      autoCalculations: autoCalcs,
      markup: inputs.markup,
    },
    timestamp: new Date(),
  };
}
