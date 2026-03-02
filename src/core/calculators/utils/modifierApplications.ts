import type { InteriorModifiers, ExteriorModifiers } from '../../../types/calculator.types';
import type { PricingSettings } from '../../../types/settings.types';
import { INTERIOR_MODIFIERS, EXTERIOR_MODIFIERS } from '../../constants/modifiers';

/**
 * Apply interior modifiers to base labor cost
 * Uses configurable modifier values from pricing settings when available
 */
export function applyInteriorModifiers(
  baseLabor: number,
  modifiers: InteriorModifiers,
  pricing?: PricingSettings
): { modifiedLabor: number; appliedModifiers: string[] } {
  let modifiedLabor = baseLabor;
  const appliedModifiers: string[] = [];

  const vals = pricing?.interiorModifierValues;

  const heavilyFurnished = vals?.heavilyFurnished ?? INTERIOR_MODIFIERS.HEAVILY_FURNISHED;
  const emptyHouse = vals?.emptyHouse ?? INTERIOR_MODIFIERS.EMPTY_HOUSE;
  const extensivePrep = vals?.extensivePrep ?? INTERIOR_MODIFIERS.EXTENSIVE_PREP;
  const additionalCoat = vals?.additionalCoat ?? INTERIOR_MODIFIERS.ADDITIONAL_COAT;
  const oneCoat = vals?.oneCoat ?? INTERIOR_MODIFIERS.ONE_COAT;

  if (modifiers.heavilyFurnished) {
    modifiedLabor *= heavilyFurnished;
    appliedModifiers.push(`Heavily Furnished (×${heavilyFurnished})`);
  }

  if (modifiers.emptyHouse) {
    modifiedLabor *= emptyHouse;
    appliedModifiers.push(`Empty House (×${emptyHouse})`);
  }

  if (modifiers.extensivePrep) {
    modifiedLabor *= extensivePrep;
    appliedModifiers.push(`Extensive Prep (×${extensivePrep})`);
  }

  if (modifiers.additionalCoat) {
    modifiedLabor *= additionalCoat;
    appliedModifiers.push(`Additional Coat (×${additionalCoat})`);
  }

  if (modifiers.oneCoat) {
    modifiedLabor *= oneCoat;
    appliedModifiers.push(`Reduce to 1 Coat (×${oneCoat})`);
  }

  return { modifiedLabor, appliedModifiers };
}

/**
 * Apply exterior modifiers to base labor cost
 * Uses configurable modifier values from pricing settings when available
 */
export function applyExteriorModifiers(
  baseLabor: number,
  modifiers: ExteriorModifiers,
  pricing?: PricingSettings
): { modifiedLabor: number; appliedModifiers: string[] } {
  let modifiedLabor = baseLabor;
  const appliedModifiers: string[] = [];

  const vals = pricing?.exteriorModifierValues;

  const threeStory = vals?.threeStory ?? EXTERIOR_MODIFIERS.THREE_STORY;
  const extensivePrep = vals?.extensivePrep ?? EXTERIOR_MODIFIERS.EXTENSIVE_PREP;
  const hardTerrain = vals?.hardTerrain ?? EXTERIOR_MODIFIERS.HARD_TERRAIN;
  const additionalCoat = vals?.additionalCoat ?? EXTERIOR_MODIFIERS.ADDITIONAL_COAT;
  const oneCoat = vals?.oneCoat ?? EXTERIOR_MODIFIERS.ONE_COAT;

  if (modifiers.threeStory) {
    modifiedLabor *= threeStory;
    appliedModifiers.push(`3 Story (×${threeStory})`);
  }

  if (modifiers.extensivePrep) {
    modifiedLabor *= extensivePrep;
    appliedModifiers.push(`Extensive Prep (×${extensivePrep})`);
  }

  if (modifiers.hardTerrain) {
    modifiedLabor *= hardTerrain;
    appliedModifiers.push(`Hard Terrain (×${hardTerrain})`);
  }

  if (modifiers.additionalCoat) {
    modifiedLabor *= additionalCoat;
    appliedModifiers.push(`Additional Coat (×${additionalCoat})`);
  }

  if (modifiers.oneCoat) {
    modifiedLabor *= oneCoat;
    appliedModifiers.push(`Reduce to 1 Coat (×${oneCoat})`);
  }

  return { modifiedLabor, appliedModifiers };
}
