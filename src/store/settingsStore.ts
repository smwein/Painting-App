import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CompanySettings,
  PricingSettings,
  LineItemConfig,
  SectionConfig,
} from '../types/settings.types';
import { getDefaultCompanySettings } from '../core/constants/defaultPricing';

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
      settings: getDefaultCompanySettings(),

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
          const item = state.settings.pricing.lineItems.find((i) => i.id === id);
          if (item?.isDefault) {
            console.warn('Cannot delete default line item');
            return state;
          }

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
          const maxOrder = Math.max(...currentSections.map((s) => s.order), 0);
          const newSection: SectionConfig = {
            ...section,
            id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            order: maxOrder + 1,
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
          const section = state.settings.pricing.sections.find((s) => s.id === id);
          if (section?.isDefault) {
            console.warn('Cannot delete default section');
            return state;
          }

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
    }
  )
);
