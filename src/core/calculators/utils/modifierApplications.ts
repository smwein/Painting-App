import type { InteriorModifiers, ExteriorModifiers } from '../../../types/calculator.types';
import type { PricingSettings, ModifierScope } from '../../../types/settings.types';
import { INTERIOR_MODIFIERS, EXTERIOR_MODIFIERS } from '../../constants/modifiers';

/**
 * Apply dynamic modifiers from the new configurable modifier arrays.
 * Each modifier has a name, multiplier, scope, and order.
 * enabledIds is a Record<string, boolean> keyed by modifier ID.
 */
export function applyDynamicModifiers(
  baseLabor: number,
  baseMaterialCost: number,
  enabledIds: Record<string, boolean>,
  modifierConfigs: Array<{ id: string; name: string; multiplier: number; scope: ModifierScope; order: number }>
): { modifiedLabor: number; modifiedMaterialCost: number; appliedModifiers: string[] } {
  let modifiedLabor = baseLabor;
  let modifiedMaterialCost = baseMaterialCost;
  const appliedModifiers: string[] = [];

  for (const mod of modifierConfigs.sort((a, b) => a.order - b.order)) {
    if (!enabledIds[mod.id]) continue;
    if (mod.scope === 'labor' || mod.scope === 'both') modifiedLabor *= mod.multiplier;
    if (mod.scope === 'materials' || mod.scope === 'both') modifiedMaterialCost *= mod.multiplier;
    appliedModifiers.push(`${mod.name} (×${mod.multiplier})`);
  }

  return { modifiedLabor, modifiedMaterialCost, appliedModifiers };
}

/**
 * Apply interior modifiers to base labor and material costs
 * Uses configurable modifier values from pricing settings when available
 * Each modifier can apply to labor only, materials only, or both (default: labor)
 */
export function applyInteriorModifiers(
  baseLabor: number,
  baseMaterialCost: number,
  modifiers: InteriorModifiers,
  pricing?: PricingSettings
): { modifiedLabor: number; modifiedMaterialCost: number; appliedModifiers: string[] } {
  let modifiedLabor = baseLabor;
  let modifiedMaterialCost = baseMaterialCost;
  const appliedModifiers: string[] = [];

  const vals = pricing?.interiorModifierValues;

  const heavilyFurnished = vals?.heavilyFurnished ?? INTERIOR_MODIFIERS.HEAVILY_FURNISHED;
  const heavilyFurnishedScope = vals?.heavilyFurnishedScope ?? 'labor';
  const emptyHouse = vals?.emptyHouse ?? INTERIOR_MODIFIERS.EMPTY_HOUSE;
  const emptyHouseScope = vals?.emptyHouseScope ?? 'labor';
  const extensivePrep = vals?.extensivePrep ?? INTERIOR_MODIFIERS.EXTENSIVE_PREP;
  const extensivePrepScope = vals?.extensivePrepScope ?? 'labor';
  const additionalCoat = vals?.additionalCoat ?? INTERIOR_MODIFIERS.ADDITIONAL_COAT;
  const additionalCoatScope = vals?.additionalCoatScope ?? 'labor';
  const oneCoat = vals?.oneCoat ?? INTERIOR_MODIFIERS.ONE_COAT;
  const oneCoatScope = vals?.oneCoatScope ?? 'labor';

  if (modifiers.heavilyFurnished) {
    if (heavilyFurnishedScope === 'labor' || heavilyFurnishedScope === 'both') modifiedLabor *= heavilyFurnished;
    if (heavilyFurnishedScope === 'materials' || heavilyFurnishedScope === 'both') modifiedMaterialCost *= heavilyFurnished;
    appliedModifiers.push(`${vals?.heavilyFurnishedLabel ?? 'Heavily Furnished'} (×${heavilyFurnished})`);
  }

  if (modifiers.emptyHouse) {
    if (emptyHouseScope === 'labor' || emptyHouseScope === 'both') modifiedLabor *= emptyHouse;
    if (emptyHouseScope === 'materials' || emptyHouseScope === 'both') modifiedMaterialCost *= emptyHouse;
    appliedModifiers.push(`${vals?.emptyHouseLabel ?? 'Empty House'} (×${emptyHouse})`);
  }

  if (modifiers.extensivePrep) {
    if (extensivePrepScope === 'labor' || extensivePrepScope === 'both') modifiedLabor *= extensivePrep;
    if (extensivePrepScope === 'materials' || extensivePrepScope === 'both') modifiedMaterialCost *= extensivePrep;
    appliedModifiers.push(`${vals?.extensivePrepLabel ?? 'Extensive Prep'} (×${extensivePrep})`);
  }

  if (modifiers.additionalCoat) {
    if (additionalCoatScope === 'labor' || additionalCoatScope === 'both') modifiedLabor *= additionalCoat;
    if (additionalCoatScope === 'materials' || additionalCoatScope === 'both') modifiedMaterialCost *= additionalCoat;
    appliedModifiers.push(`${vals?.additionalCoatLabel ?? 'Additional Coat'} (×${additionalCoat})`);
  }

  if (modifiers.oneCoat) {
    if (oneCoatScope === 'labor' || oneCoatScope === 'both') modifiedLabor *= oneCoat;
    if (oneCoatScope === 'materials' || oneCoatScope === 'both') modifiedMaterialCost *= oneCoat;
    appliedModifiers.push(`${vals?.oneCoatLabel ?? 'One Coat'} (×${oneCoat})`);
  }

  return { modifiedLabor, modifiedMaterialCost, appliedModifiers };
}

/**
 * Apply exterior modifiers to base labor and material costs
 * Uses configurable modifier values from pricing settings when available
 * Each modifier can apply to labor only, materials only, or both (default: labor)
 */
export function applyExteriorModifiers(
  baseLabor: number,
  baseMaterialCost: number,
  modifiers: ExteriorModifiers,
  pricing?: PricingSettings
): { modifiedLabor: number; modifiedMaterialCost: number; appliedModifiers: string[] } {
  let modifiedLabor = baseLabor;
  let modifiedMaterialCost = baseMaterialCost;
  const appliedModifiers: string[] = [];

  const vals = pricing?.exteriorModifierValues;

  const threeStory = vals?.threeStory ?? EXTERIOR_MODIFIERS.THREE_STORY;
  const threeStoryScope = vals?.threeStoryScope ?? 'labor';
  const extensivePrep = vals?.extensivePrep ?? EXTERIOR_MODIFIERS.EXTENSIVE_PREP;
  const extensivePrepScope = vals?.extensivePrepScope ?? 'labor';
  const hardTerrain = vals?.hardTerrain ?? EXTERIOR_MODIFIERS.HARD_TERRAIN;
  const hardTerrainScope = vals?.hardTerrainScope ?? 'labor';
  const additionalCoat = vals?.additionalCoat ?? EXTERIOR_MODIFIERS.ADDITIONAL_COAT;
  const additionalCoatScope = vals?.additionalCoatScope ?? 'labor';
  const oneCoat = vals?.oneCoat ?? EXTERIOR_MODIFIERS.ONE_COAT;
  const oneCoatScope = vals?.oneCoatScope ?? 'labor';

  if (modifiers.threeStory) {
    if (threeStoryScope === 'labor' || threeStoryScope === 'both') modifiedLabor *= threeStory;
    if (threeStoryScope === 'materials' || threeStoryScope === 'both') modifiedMaterialCost *= threeStory;
    appliedModifiers.push(`${vals?.threeStoryLabel ?? '3 Story'} (×${threeStory})`);
  }

  if (modifiers.extensivePrep) {
    if (extensivePrepScope === 'labor' || extensivePrepScope === 'both') modifiedLabor *= extensivePrep;
    if (extensivePrepScope === 'materials' || extensivePrepScope === 'both') modifiedMaterialCost *= extensivePrep;
    appliedModifiers.push(`${vals?.extensivePrepLabel ?? 'Extensive Prep'} (×${extensivePrep})`);
  }

  if (modifiers.hardTerrain) {
    if (hardTerrainScope === 'labor' || hardTerrainScope === 'both') modifiedLabor *= hardTerrain;
    if (hardTerrainScope === 'materials' || hardTerrainScope === 'both') modifiedMaterialCost *= hardTerrain;
    appliedModifiers.push(`${vals?.hardTerrainLabel ?? 'Hard Terrain'} (×${hardTerrain})`);
  }

  if (modifiers.additionalCoat) {
    if (additionalCoatScope === 'labor' || additionalCoatScope === 'both') modifiedLabor *= additionalCoat;
    if (additionalCoatScope === 'materials' || additionalCoatScope === 'both') modifiedMaterialCost *= additionalCoat;
    appliedModifiers.push(`${vals?.additionalCoatLabel ?? 'Additional Coat'} (×${additionalCoat})`);
  }

  if (modifiers.oneCoat) {
    if (oneCoatScope === 'labor' || oneCoatScope === 'both') modifiedLabor *= oneCoat;
    if (oneCoatScope === 'materials' || oneCoatScope === 'both') modifiedMaterialCost *= oneCoat;
    appliedModifiers.push(`${vals?.oneCoatLabel ?? 'One Coat'} (×${oneCoat})`);
  }

  return { modifiedLabor, modifiedMaterialCost, appliedModifiers };
}
