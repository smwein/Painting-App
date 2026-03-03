import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CompanySettings,
  PricingSettings,
  LineItemConfig,
  SectionConfig,
} from '../types/settings.types';
import { getDefaultCompanySettings, createDefaultPricingSettings } from '../core/constants/defaultPricing';

/** Seed default sections only for brand-new data (no sections at all).
 *  Does NOT re-add sections the user explicitly deleted. */
function ensureDefaultSections(settings: CompanySettings): CompanySettings {
  if (settings.pricing.sections.length > 0) return settings;
  const defaults = createDefaultPricingSettings();
  return {
    ...settings,
    pricing: { ...settings.pricing, sections: defaults.sections },
  };
}

/** Fill in any pricing fields that were added after the user's data was first saved.
 *  Uses defaults only when the field is completely missing (undefined). */
function ensureNewPricingFields(settings: CompanySettings): CompanySettings {
  const defaults = createDefaultPricingSettings();
  const p = settings.pricing;
  let changed = false;
  const updates: Partial<PricingSettings> = {};

  if (p.interiorSqftEmpty === undefined) {
    updates.interiorSqftEmpty = defaults.interiorSqftEmpty;
    changed = true;
  }
  if (p.interiorDetailedFurnishedRates === undefined) {
    updates.interiorDetailedFurnishedRates = defaults.interiorDetailedFurnishedRates;
    changed = true;
  }
  if (p.interiorDetailedEmptyRates === undefined) {
    updates.interiorDetailedEmptyRates = defaults.interiorDetailedEmptyRates;
    changed = true;
  }

  if (p.simpleInteriorModifiers === undefined) {
    updates.simpleInteriorModifiers = [
      { id: 'simple-mod-second-dry-coat', name: 'Second Dry Coat', multiplier: 1.20, order: 1 },
    ];
    changed = true;
  }

  // Migrate old fixed modifier values to dynamic arrays
  if (p.interiorModifiers === undefined) {
    const vals = p.interiorModifierValues;
    updates.interiorModifiers = [
      { id: 'int-mod-heavily-furnished', name: vals?.heavilyFurnishedLabel ?? 'Heavily Furnished', multiplier: vals?.heavilyFurnished ?? 1.25, scope: vals?.heavilyFurnishedScope ?? 'labor', order: 1 },
      { id: 'int-mod-empty-house', name: vals?.emptyHouseLabel ?? 'Empty House', multiplier: vals?.emptyHouse ?? 0.85, scope: vals?.emptyHouseScope ?? 'labor', order: 2 },
      { id: 'int-mod-extensive-prep', name: vals?.extensivePrepLabel ?? 'Extensive Prep', multiplier: vals?.extensivePrep ?? 1.15, scope: vals?.extensivePrepScope ?? 'labor', order: 3 },
      { id: 'int-mod-additional-coat', name: vals?.additionalCoatLabel ?? 'Additional Coat', multiplier: vals?.additionalCoat ?? 1.25, scope: vals?.additionalCoatScope ?? 'labor', order: 4 },
      { id: 'int-mod-one-coat', name: vals?.oneCoatLabel ?? 'One Coat', multiplier: vals?.oneCoat ?? 0.85, scope: vals?.oneCoatScope ?? 'labor', order: 5 },
    ];
    changed = true;
  }

  if (p.exteriorModifiers === undefined) {
    const vals = p.exteriorModifierValues;
    updates.exteriorModifiers = [
      { id: 'ext-mod-three-story', name: vals?.threeStoryLabel ?? '3 Story', multiplier: vals?.threeStory ?? 1.15, scope: vals?.threeStoryScope ?? 'labor', order: 1 },
      { id: 'ext-mod-extensive-prep', name: vals?.extensivePrepLabel ?? 'Extensive Prep', multiplier: vals?.extensivePrep ?? 1.20, scope: vals?.extensivePrepScope ?? 'labor', order: 2 },
      { id: 'ext-mod-hard-terrain', name: vals?.hardTerrainLabel ?? 'Hard Terrain', multiplier: vals?.hardTerrain ?? 1.15, scope: vals?.hardTerrainScope ?? 'labor', order: 3 },
      { id: 'ext-mod-additional-coat', name: vals?.additionalCoatLabel ?? 'Additional Coat', multiplier: vals?.additionalCoat ?? 1.25, scope: vals?.additionalCoatScope ?? 'labor', order: 4 },
      { id: 'ext-mod-one-coat', name: vals?.oneCoatLabel ?? 'One Coat', multiplier: vals?.oneCoat ?? 0.85, scope: vals?.oneCoatScope ?? 'labor', order: 5 },
    ];
    changed = true;
  }

  if (!changed) return settings;
  return {
    ...settings,
    pricing: { ...p, ...updates },
  };
}

interface SettingsState {
  settings: CompanySettings;
  updateSettings: (updates: Partial<CompanySettings>) => void;
  updatePricing: (updates: Partial<PricingSettings>) => void;
  addLineItem: (item: Omit<LineItemConfig, 'id' | 'order'>) => void;
  updateLineItem: (id: string, updates: Partial<LineItemConfig>) => void;
  deleteLineItem: (id: string) => void;
  addSection: (section: Omit<SectionConfig, 'id' | 'order'>) => void;
  updateSection: (id: string, updates: Partial<SectionConfig>) => void;
  deleteSection: (id: string) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: ensureDefaultSections(getDefaultCompanySettings()),

      updateSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...updates,
          },
        })),

      updatePricing: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pricing: {
              ...state.settings.pricing,
              ...updates,
            },
          },
        })),

      addLineItem: (item) =>
        set((state) => {
          const currentItems = state.settings.pricing.lineItems;
          const maxOrder = Math.max(...currentItems.map((i) => i.order), 0);
          const newItem: LineItemConfig = {
            ...item,
            id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            order: maxOrder + 1,
          };

          return {
            settings: {
              ...state.settings,
              pricing: {
                ...state.settings.pricing,
                lineItems: [...currentItems, newItem],
              },
            },
          };
        }),

      updateLineItem: (id, updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pricing: {
              ...state.settings.pricing,
              lineItems: state.settings.pricing.lineItems.map((item) =>
                item.id === id ? { ...item, ...updates } : item
              ),
            },
          },
        })),

      deleteLineItem: (id) =>
        set((state) => {

          return {
            settings: {
              ...state.settings,
              pricing: {
                ...state.settings.pricing,
                lineItems: state.settings.pricing.lineItems.filter((i) => i.id !== id),
              },
            },
          };
        }),

      addSection: (section) =>
        set((state) => {
          const currentSections = state.settings.pricing.sections;
          // Use per-type max order so sections are numbered within their calculator type
          const typeMaxOrder = Math.max(
            ...currentSections
              .filter((s) => s.calculatorType === section.calculatorType)
              .map((s) => s.order),
            0
          );
          const newSection: SectionConfig = {
            ...section,
            id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            order: typeMaxOrder + 1,
          };

          return {
            settings: {
              ...state.settings,
              pricing: {
                ...state.settings.pricing,
                sections: [...currentSections, newSection],
              },
            },
          };
        }),

      updateSection: (id, updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pricing: {
              ...state.settings.pricing,
              sections: state.settings.pricing.sections.map((section) =>
                section.id === id ? { ...section, ...updates } : section
              ),
            },
          },
        })),

      deleteSection: (id) =>
        set((state) => {
          // Also remove any line items in this section
          return {
            settings: {
              ...state.settings,
              pricing: {
                ...state.settings.pricing,
                sections: state.settings.pricing.sections.filter((s) => s.id !== id),
                lineItems: state.settings.pricing.lineItems.filter(
                  (item) => item.category !== id
                ),
              },
            },
          };
        }),

      resetSettings: () =>
        set({
          settings: getDefaultCompanySettings(),
        }),
    }),
    {
      name: 'painting-company-settings',
      onRehydrateStorage: () => (state) => {
        // Run migrations after loading persisted state
        if (state) {
          state.settings = ensureDefaultSections(state.settings);
          state.settings = ensureNewPricingFields(state.settings);
        }
      },
    }
  )
);
