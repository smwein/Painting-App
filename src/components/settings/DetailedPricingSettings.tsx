import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { InteriorModifierValues, ExteriorModifierValues, ModifierScope, LineItemConfig } from '../../types/settings.types';

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

const UNIT_OPTIONS = ['sqft', 'lf', 'each', 'hour', 'dollars'] as const;

interface AddForm {
  name: string;
  rate: string;
  unit: LineItemConfig['unit'];
}

export function DetailedPricingSettings() {
  const { settings, updatePricing, updateSection, updateLineItem, deleteLineItem, addLineItem } = useSettingsStore();
  const pricing = settings.pricing;

  const [interiorMods, setInteriorMods] = useState<InteriorModifierValues>(
    pricing.interiorModifierValues ?? DEFAULT_INTERIOR_MODIFIERS
  );
  const [exteriorMods, setExteriorMods] = useState<ExteriorModifierValues>(
    pricing.exteriorModifierValues ?? DEFAULT_EXTERIOR_MODIFIERS
  );

  // Paint prices local state (saved with button)
  const [interiorPaint, setInteriorPaint] = useState(pricing.interiorPaint);
  const [exteriorPaint, setExteriorPaint] = useState(pricing.exteriorPaint);
  const [newIntPaint, setNewIntPaint] = useState({ name: '', price: '' });
  const [newExtPaint, setNewExtPaint] = useState({ name: '', price: '' });

  // Section name editing
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  // Add line item forms per section
  const [addForms, setAddForms] = useState<Record<string, AddForm>>({});

  const handleSave = () => {
    updatePricing({
      interiorModifierValues: interiorMods,
      exteriorModifierValues: exteriorMods,
      interiorPaint,
      exteriorPaint,
    });
    alert('Detailed pricing settings saved successfully!');
  };

  const moveSection = (
    sectionId: string,
    currentOrder: number,
    calcType: string,
    direction: 'up' | 'down'
  ) => {
    const siblings = pricing.sections
      .filter((s) => s.calculatorType === calcType)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((s) => s.id === sectionId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    updateSection(sectionId, { order: other.order });
    updateSection(other.id, { order: currentOrder });
  };

  const startEditSection = (id: string, name: string) => {
    setEditingSectionId(id);
    setEditingSectionName(name);
  };

  const saveEditSection = () => {
    if (editingSectionId && editingSectionName.trim()) {
      updateSection(editingSectionId, { name: editingSectionName.trim() });
    }
    setEditingSectionId(null);
  };

  const handleAddItem = (sectionId: string) => {
    const form = addForms[sectionId];
    if (!form?.name.trim() || !form.rate) return;
    const rate = parseFloat(form.rate);
    if (isNaN(rate)) return;
    addLineItem({
      name: form.name.trim(),
      rate,
      unit: form.unit || 'each',
      category: sectionId,
      isDefault: false,
    });
    setAddForms((prev) => ({ ...prev, [sectionId]: { name: '', rate: '', unit: 'each' } }));
  };

  const updateAddForm = (sectionId: string, changes: Partial<AddForm>) => {
    setAddForms((prev) => {
      const existing = prev[sectionId] ?? { name: '', rate: '', unit: 'each' as const };
      return { ...prev, [sectionId]: { ...existing, ...changes } };
    });
  };

  const handleAddPaint = (type: 'interior' | 'exterior') => {
    const { name, price } = type === 'interior' ? newIntPaint : newExtPaint;
    const priceNum = parseFloat(price);
    if (!name.trim() || isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid paint name and price.');
      return;
    }
    if (type === 'interior') {
      setInteriorPaint((p) => ({ ...p, [name.trim()]: priceNum }));
      setNewIntPaint({ name: '', price: '' });
    } else {
      setExteriorPaint((p) => ({ ...p, [name.trim()]: priceNum }));
      setNewExtPaint({ name: '', price: '' });
    }
  };

  const interiorSections = pricing.sections
    .filter((s) => s.calculatorType === 'interior-detailed')
    .sort((a, b) => a.order - b.order);

  const exteriorSections = pricing.sections
    .filter((s) => s.calculatorType === 'exterior-detailed')
    .sort((a, b) => a.order - b.order);

  const getItemsForSection = (sectionId: string) =>
    pricing.lineItems
      .filter((item) => item.category === sectionId)
      .sort((a, b) => a.order - b.order);

  const renderSections = (sections: typeof interiorSections) =>
    sections.map((section, idx) => {
      const items = getItemsForSection(section.id);
      const addForm = addForms[section.id] ?? { name: '', rate: '', unit: 'each' as const };
      const isEditingThis = editingSectionId === section.id;

      return (
        <Card key={section.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {isEditingThis ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editingSectionName}
                    onChange={(e) => setEditingSectionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditSection();
                      if (e.key === 'Escape') setEditingSectionId(null);
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 text-sm border border-primary-400 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Button onClick={saveEditSection} variant="primary" size="sm">Save</Button>
                  <Button onClick={() => setEditingSectionId(null)} variant="outline" size="sm">Cancel</Button>
                </div>
              ) : (
                <button
                  onClick={() => startEditSection(section.id, section.name)}
                  title="Click to edit section name"
                  className="text-base font-semibold text-gray-900 hover:text-primary-700 text-left"
                >
                  {section.name}
                </button>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
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
          <CardContent className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    defaultValue={item.name}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val && val !== item.name) updateLineItem(item.id, { name: val });
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rate (/{item.unit})</label>
                  <input
                    type="number"
                    min="0"
                    step={item.unit === 'sqft' || item.unit === 'lf' ? '0.01' : '1'}
                    defaultValue={item.rate}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val !== item.rate) updateLineItem(item.id, { rate: val });
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  onClick={() => deleteLineItem(item.id)}
                  className="mb-0.5 text-red-400 hover:text-red-600 text-sm font-bold px-2 py-2 rounded hover:bg-red-50"
                  title="Delete line item"
                >✕</button>
              </div>
            ))}

            {/* Add line item form */}
            <div className="flex items-end gap-2 pt-2 border-t border-gray-100">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">New Item Name</label>
                <input
                  type="text"
                  placeholder="e.g., Staining"
                  value={addForm.name}
                  onChange={(e) => updateAddForm(section.id, { name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-500 mb-1">Rate</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={addForm.rate}
                  onChange={(e) => updateAddForm(section.id, { rate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                <select
                  value={addForm.unit}
                  onChange={(e) => updateAddForm(section.id, { unit: e.target.value as LineItemConfig['unit'] })}
                  className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <button
                onClick={() => handleAddItem(section.id)}
                className="mb-0.5 px-3 py-2 text-sm text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50 font-medium"
              >+ Add</button>
            </div>
          </CardContent>
        </Card>
      );
    });

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Edit section names (click to edit), adjust rates and names for each line item, reorder sections, and configure modifier scopes. Line item name/rate changes save on blur; use Save button for modifiers and paint prices.
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

      {/* Paint Prices (#10) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Interior Paint Prices (per gallon)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(interiorPaint).map(([name, price]) => (
                <div key={name} className="relative">
                  <Input
                    label={name}
                    type="number" min="0" step="1"
                    value={price}
                    onChange={(e) => setInteriorPaint((p) => ({ ...p, [name]: parseFloat(e.target.value) || 0 }))}
                  />
                  <button
                    onClick={() => setInteriorPaint((p) => { const n = { ...p }; delete n[name]; return n; })}
                    className="absolute top-0 right-0 text-red-400 hover:text-red-600 text-xs px-1"
                    title="Remove"
                  >✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-end pt-2 border-t border-gray-100">
              <div className="flex-1">
                <Input label="New Paint Name" type="text" value={newIntPaint.name}
                  onChange={(e) => setNewIntPaint((p) => ({ ...p, name: e.target.value }))} placeholder="e.g., Cashmere" />
              </div>
              <div className="w-28">
                <Input label="Price ($/gal)" type="number" min="0" step="1" value={newIntPaint.price}
                  onChange={(e) => setNewIntPaint((p) => ({ ...p, price: e.target.value }))} placeholder="55" />
              </div>
              <Button onClick={() => handleAddPaint('interior')} variant="outline" size="sm" className="mb-0.5">+ Add</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exterior Paint Prices (per gallon)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(exteriorPaint).map(([name, price]) => (
                <div key={name} className="relative">
                  <Input
                    label={name}
                    type="number" min="0" step="1"
                    value={price}
                    onChange={(e) => setExteriorPaint((p) => ({ ...p, [name]: parseFloat(e.target.value) || 0 }))}
                  />
                  <button
                    onClick={() => setExteriorPaint((p) => { const n = { ...p }; delete n[name]; return n; })}
                    className="absolute top-0 right-0 text-red-400 hover:text-red-600 text-xs px-1"
                    title="Remove"
                  >✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-end pt-2 border-t border-gray-100">
              <div className="flex-1">
                <Input label="New Paint Name" type="text" value={newExtPaint.name}
                  onChange={(e) => setNewExtPaint((p) => ({ ...p, name: e.target.value }))} placeholder="e.g., A-100" />
              </div>
              <div className="w-28">
                <Input label="Price ($/gal)" type="number" min="0" step="1" value={newExtPaint.price}
                  onChange={(e) => setNewExtPaint((p) => ({ ...p, price: e.target.value }))} placeholder="40" />
              </div>
              <Button onClick={() => handleAddPaint('exterior')} variant="outline" size="sm" className="mb-0.5">+ Add</Button>
            </div>
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
