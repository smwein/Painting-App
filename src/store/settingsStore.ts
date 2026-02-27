import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CompanySettings } from '../types/settings.types';
import { defaultCompanySettings } from '../types/settings.types';

interface SettingsState {
  settings: CompanySettings;
  updateSettings: (updates: Partial<CompanySettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultCompanySettings,

      updateSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...updates,
          },
        })),

      resetSettings: () =>
        set({
          settings: defaultCompanySettings,
        }),
    }),
    {
      name: 'painting-company-settings',
    }
  )
);
