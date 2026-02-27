import type { InteriorModifiers, ExteriorModifiers } from '../../../types/calculator.types';
import { INTERIOR_MODIFIERS, EXTERIOR_MODIFIERS } from '../../constants/modifiers';

/**
 * Apply interior modifiers to base labor cost
 * Modifiers are applied multiplicatively
 */
export function applyInteriorModifiers(
  baseLabor: number,
  modifiers: InteriorModifiers
): { modifiedLabor: number; appliedModifiers: string[] } {
  let modifiedLabor = baseLabor;
  const appliedModifiers: string[] = [];

  if (modifiers.heavilyFurnished) {
    modifiedLabor *= INTERIOR_MODIFIERS.HEAVILY_FURNISHED;
    appliedModifiers.push('Heavily Furnished (×1.25)');
  }

  if (modifiers.emptyHouse) {
    modifiedLabor *= INTERIOR_MODIFIERS.EMPTY_HOUSE;
    appliedModifiers.push('Empty House (×0.85)');
  }

  if (modifiers.extensivePrep) {
    modifiedLabor *= INTERIOR_MODIFIERS.EXTENSIVE_PREP;
    appliedModifiers.push('Extensive Prep (×1.15)');
  }

  if (modifiers.additionalCoat) {
    modifiedLabor *= INTERIOR_MODIFIERS.ADDITIONAL_COAT;
    appliedModifiers.push('Additional Coat (×1.25)');
  }

  if (modifiers.oneCoat) {
    modifiedLabor *= INTERIOR_MODIFIERS.ONE_COAT;
    appliedModifiers.push('Reduce to 1 Coat (×0.85)');
  }

  return { modifiedLabor, appliedModifiers };
}

/**
 * Apply exterior modifiers to base labor cost
 * Modifiers are applied multiplicatively
 */
export function applyExteriorModifiers(
  baseLabor: number,
  modifiers: ExteriorModifiers
): { modifiedLabor: number; appliedModifiers: string[] } {
  let modifiedLabor = baseLabor;
  const appliedModifiers: string[] = [];

  if (modifiers.threeStory) {
    modifiedLabor *= EXTERIOR_MODIFIERS.THREE_STORY;
    appliedModifiers.push('3 Story (×1.15)');
  }

  if (modifiers.extensivePrep) {
    modifiedLabor *= EXTERIOR_MODIFIERS.EXTENSIVE_PREP;
    appliedModifiers.push('Extensive Prep (×1.2)');
  }

  if (modifiers.hardTerrain) {
    modifiedLabor *= EXTERIOR_MODIFIERS.HARD_TERRAIN;
    appliedModifiers.push('Hard Terrain (×1.15)');
  }

  if (modifiers.additionalCoat) {
    modifiedLabor *= EXTERIOR_MODIFIERS.ADDITIONAL_COAT;
    appliedModifiers.push('Additional Coat (×1.25)');
  }

  if (modifiers.oneCoat) {
    modifiedLabor *= EXTERIOR_MODIFIERS.ONE_COAT;
    appliedModifiers.push('Reduce to 1 Coat (×0.85)');
  }

  return { modifiedLabor, appliedModifiers };
}
