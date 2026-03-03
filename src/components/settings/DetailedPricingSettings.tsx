import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { InteriorModifierValues, ExteriorModifierValues, ModifierScope } from '../../types/settings.types';

const DEFAULT_INTERIOR_MODIFIERS: InteriorModifierValues = {
  heavilyFurnished: 1.25,
  emptyHouse: 0.85,
  extensivePrep: 1.15,
  additionalCoat: 1.25,
  oneCoat: 0.85,
};

const DEFAULT_EXTERIOR_MODIFIERS: ExteriorModifierValues = {
  threeStory: 1.15,
  extensivePrep: 1.20,
  hardTerrain: 1.15,
  additionalCoat: 1.25,
  oneCoat: 0.85,
};

export function DetailedPricingSettings() {
  const { settings, updatePricing, updateSection } = useSettingsStore();
  const [lineItems, setLineItems] = useState(settings.pricing.lineItems);
  const [interiorMods, setInteriorMods] = useState<InteriorModifierValues>(
    settings.pricing.interiorModifierValues ?? DEFAULT_INTERIOR_MODIFIERS
  );
  const [exteriorMods, setExteriorMods] = useState<ExteriorModifierValues>(
    settings.pricing.exteriorModifierValues ?? DEFAULT_EXTERIOR_MODIFIERS
  );

  const handleRateChange = (id: string, newRate: number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, rate: newRate } : item))
    );
  };

  const handleSave = () => {
    updatePricing({ lineItems, interiorModifierValues: interiorMods, exteriorModifierValues: exteriorMods });
    alert('Detailed pricing settings saved successfully!');
  };

  const moveSection = (
    sectionId: string,
    currentOrder: number,
    calcType: string,
    direction: 'up' | 'down'
  ) => {
    const siblings = settings.pricing.sections
      .filter((s) => s.calculatorType === calcType)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((s) => s.id === sectionId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    updateSection(sectionId, { order: other.order });
    updateSection(other.id, { order: currentOrder });
  };

  const interiorSections = settings.pricing.sections
    .filter((s) => s.calculatorType === 'interior-detailed')
    .sort((a, b) => a.order - b.order);

  const exteriorSections = settings.pricing.sections
    .filter((s) => s.calculatorType === 'exterior-detailed')
    .sort((a, b) => a.order - b.order);

  const getItemsForSection = (sectionId: string) => {
    return lineItems
      .filter((item) => item.category === sectionId)
      .sort((a, b) => a.order - b.order);
  };

  const renderSections = (sections: typeof interiorSections) =>
    sections.map((section, idx) => {
      const items = getItemsForSection(section.id);
      if (items.length === 0) return null;

      return (
        <Card key={section.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{section.name}</CardTitle>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Reorder */}
                <div className="flex gap-1">
                  <button
                    onClick={() => moveSection(section.id, section.order, section.calculatorType, 'up')}
                    disabled={idx === 0}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs px-1"
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => moveSection(section.id, section.order, section.calculatorType, 'down')}
                    disabled={idx === sections.length - 1}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs px-1"
                    title="Move down"
                  >▼</button>
                </div>
                {/* Default collapsed toggle */}
                <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={section.defaultCollapsed ?? false}
                    onChange={(e) => updateSection(section.id, { defaultCollapsed: e.target.checked })}
                    className="rounded"
                  />
                  Start collapsed
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <Input
                key={item.id}
                label={`${item.name} (per ${item.unit})`}
                type="number"
                min="0"
                step={item.unit === 'sqft' || item.unit === 'lf' ? '0.01' : '1'}
                value={item.rate}
                onChange={(e) => handleRateChange(item.id, parseFloat(e.target.value))}
              />
            ))}
          </CardContent>
        </Card>
      );
    });

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Edit pricing rates, reorder sections, set which sections start collapsed, and configure labor modifier multipliers.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Interior Detailed</h3>
          {renderSections(interiorSections)}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Exterior Detailed</h3>
          {renderSections(exteriorSections)}
        </div>
      </div>

      {/* Labor Modifier Values */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Interior Modifiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                { label: 'Heavily Furnished', key: 'heavilyFurnished', scopeKey: 'heavilyFurnishedScope', helper: 'Applied when house is heavily furnished' },
                { label: 'Empty House', key: 'emptyHouse', scopeKey: 'emptyHouseScope', helper: 'Applied when house is empty' },
                { label: 'Extensive Prep', key: 'extensivePrep', scopeKey: 'extensivePrepScope', helper: 'Applied for extensive prep work' },
                { label: 'Additional Coat', key: 'additionalCoat', scopeKey: 'additionalCoatScope', helper: 'Applied for an additional coat' },
                { label: 'One Coat', key: 'oneCoat', scopeKey: 'oneCoatScope', helper: 'Applied to reduce to 1 coat' },
              ] as { label: string; key: keyof InteriorModifierValues; scopeKey: keyof InteriorModifierValues; helper: string }[]
            ).map(({ label, key, scopeKey, helper }) => (
              <div key={key} className="space-y-1">
                <Input
                  label={`${label} (multiplier)`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={interiorMods[key] as number}
                  onChange={(e) => setInteriorMods((p) => ({ ...p, [key]: parseFloat(e.target.value) || 1 }))}
                  helperText={helper}
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 w-20 flex-shrink-0">Applies to:</label>
                  <select
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={(interiorMods[scopeKey] as ModifierScope | undefined) ?? 'labor'}
                    onChange={(e) => setInteriorMods((p) => ({ ...p, [scopeKey]: e.target.value as ModifierScope }))}
                  >
                    <option value="labor">Labor only</option>
                    <option value="materials">Materials only</option>
                    <option value="both">Labor + Materials</option>
                  </select>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exterior Modifiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                { label: '3 Story', key: 'threeStory', scopeKey: 'threeStoryScope', helper: 'Applied for 3-story buildings' },
                { label: 'Extensive Prep', key: 'extensivePrep', scopeKey: 'extensivePrepScope', helper: 'Applied for extensive prep work' },
                { label: 'Hard Terrain', key: 'hardTerrain', scopeKey: 'hardTerrainScope', helper: 'Applied for difficult terrain' },
                { label: 'Additional Coat', key: 'additionalCoat', scopeKey: 'additionalCoatScope', helper: 'Applied for an additional coat' },
                { label: 'One Coat', key: 'oneCoat', scopeKey: 'oneCoatScope', helper: 'Applied to reduce to 1 coat' },
              ] as { label: string; key: keyof ExteriorModifierValues; scopeKey: keyof ExteriorModifierValues; helper: string }[]
            ).map(({ label, key, scopeKey, helper }) => (
              <div key={key} className="space-y-1">
                <Input
                  label={`${label} (multiplier)`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={exteriorMods[key] as number}
                  onChange={(e) => setExteriorMods((p) => ({ ...p, [key]: parseFloat(e.target.value) || 1 }))}
                  helperText={helper}
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 w-20 flex-shrink-0">Applies to:</label>
                  <select
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={(exteriorMods[scopeKey] as ModifierScope | undefined) ?? 'labor'}
                    onChange={(e) => setExteriorMods((p) => ({ ...p, [scopeKey]: e.target.value as ModifierScope }))}
                  >
                    <option value="labor">Labor only</option>
                    <option value="materials">Materials only</option>
                    <option value="both">Labor + Materials</option>
                  </select>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary">
          Save Detailed Pricing Settings
        </Button>
      </div>
    </div>
  );
}
