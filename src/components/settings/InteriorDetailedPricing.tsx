import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { InteriorModifierValues, ModifierScope, LineItemConfig } from '../../types/settings.types';

const DEFAULT_INTERIOR_MODIFIERS: InteriorModifierValues = {
  heavilyFurnished: 1.25,
  emptyHouse: 0.85,
  extensivePrep: 1.15,
  additionalCoat: 1.25,
  oneCoat: 0.85,
};

const UNIT_OPTIONS = ['sqft', 'lf', 'each', 'hour', 'dollars'] as const;

interface AddForm {
  name: string;
  rate: string;
  unit: LineItemConfig['unit'];
}

export function InteriorDetailedPricing() {
  const { settings, updatePricing, updateSection, updateLineItem, deleteLineItem, addLineItem } = useSettingsStore();
  const pricing = settings.pricing;

  const [interiorMods, setInteriorMods] = useState<InteriorModifierValues>(
    pricing.interiorModifierValues ?? DEFAULT_INTERIOR_MODIFIERS
  );

  // Interior Detailed furnished/empty rates
  const [furnishedRates, setFurnishedRates] = useState(
    pricing.interiorDetailedFurnishedRates ?? { wallSqft: 1.00, ceilingSqft: 0.50, trimLF: 0.75 }
  );
  const [emptyRates, setEmptyRates] = useState(
    pricing.interiorDetailedEmptyRates ?? { wallSqft: 0.75, ceilingSqft: 0.35, trimLF: 0.60 }
  );

  // Auto-calc multipliers
  const [intMultipliers, setIntMultipliers] = useState(pricing.interiorMultipliers);

  // Paint prices local state
  const [interiorPaint, setInteriorPaint] = useState(pricing.interiorPaint);
  const [newIntPaint, setNewIntPaint] = useState({ name: '', price: '' });

  // Section name editing
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  // Add line item forms per section
  const [addForms, setAddForms] = useState<Record<string, AddForm>>({});

  const handleSave = () => {
    updatePricing({
      interiorModifierValues: interiorMods,
      interiorPaint,
      interiorDetailedFurnishedRates: furnishedRates,
      interiorDetailedEmptyRates: emptyRates,
      interiorMultipliers: intMultipliers,
    });
    alert('Interior detailed pricing settings saved successfully!');
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

  const handleAddPaint = () => {
    const priceNum = parseFloat(newIntPaint.price);
    if (!newIntPaint.name.trim() || isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid paint name and price.');
      return;
    }
    setInteriorPaint((p) => ({ ...p, [newIntPaint.name.trim()]: priceNum }));
    setNewIntPaint({ name: '', price: '' });
  };

  const interiorSections = pricing.sections
    .filter((s) => s.calculatorType === 'interior-detailed')
    .sort((a, b) => a.order - b.order);

  const getItemsForSection = (sectionId: string) =>
    pricing.lineItems
      .filter((item) => item.category === sectionId)
      .sort((a, b) => a.order - b.order);

  const moveLineItem = (items: ReturnType<typeof getItemsForSection>, idx: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const a = items[idx];
    const b = items[swapIdx];
    updateLineItem(a.id, { order: b.order });
    updateLineItem(b.id, { order: a.order });
  };

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
            {items.map((item, itemIdx) => (
              <div key={item.id} className="flex items-end gap-2">
                <div className="flex flex-col gap-0.5 flex-shrink-0 mb-0.5">
                  <button
                    onClick={() => moveLineItem(items, itemIdx, 'up')}
                    disabled={itemIdx === 0}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs px-1 leading-none"
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => moveLineItem(items, itemIdx, 'down')}
                    disabled={itemIdx === items.length - 1}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs px-1 leading-none"
                    title="Move down"
                  >▼</button>
                </div>
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
        Edit section names (click to edit), adjust rates and names for each line item, reorder sections, and configure modifier scopes. Line item name/rate changes save on blur; use Save button for modifiers, multipliers, and paint prices.
      </p>

      {/* Auto-Calculate Multipliers */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Calculate Multipliers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">
            When a user enters House Square Footage, these multipliers determine how wall sqft, ceiling sqft, and trim LF are auto-populated.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Wall Multiplier"
              type="number" min="0" step="0.1"
              value={intMultipliers.wall}
              onChange={(e) => setIntMultipliers((p) => ({ ...p, wall: parseFloat(e.target.value) || 0 }))}
              helperText={`Wall Sqft = House SF × ${intMultipliers.wall}`}
            />
            <Input
              label="Ceiling Multiplier"
              type="number" min="0" step="0.1"
              value={intMultipliers.ceiling}
              onChange={(e) => setIntMultipliers((p) => ({ ...p, ceiling: parseFloat(e.target.value) || 0 }))}
              helperText={`Ceiling Sqft = House SF × ${intMultipliers.ceiling}`}
            />
            <Input
              label="Trim Multiplier"
              type="number" min="0" step="0.01"
              value={intMultipliers.trim}
              onChange={(e) => setIntMultipliers((p) => ({ ...p, trim: parseFloat(e.target.value) || 0 }))}
              helperText={`Trim LF = House SF × ${intMultipliers.trim}`}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {renderSections(interiorSections)}
      </div>

      {/* Interior Detailed — Furnished vs Empty Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Interior Furnished Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">Rates used when house is set to "Furnished".</p>
            <Input
              label="Wall Sq Ft ($/sqft)"
              type="number" min="0" step="0.01"
              value={furnishedRates.wallSqft}
              onChange={(e) => setFurnishedRates((p) => ({ ...p, wallSqft: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Ceiling Sq Ft ($/sqft)"
              type="number" min="0" step="0.01"
              value={furnishedRates.ceilingSqft}
              onChange={(e) => setFurnishedRates((p) => ({ ...p, ceilingSqft: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Trim LF ($/LF)"
              type="number" min="0" step="0.01"
              value={furnishedRates.trimLF}
              onChange={(e) => setFurnishedRates((p) => ({ ...p, trimLF: parseFloat(e.target.value) || 0 }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interior Empty Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">Rates used when house is set to "Empty".</p>
            <Input
              label="Wall Sq Ft ($/sqft)"
              type="number" min="0" step="0.01"
              value={emptyRates.wallSqft}
              onChange={(e) => setEmptyRates((p) => ({ ...p, wallSqft: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Ceiling Sq Ft ($/sqft)"
              type="number" min="0" step="0.01"
              value={emptyRates.ceilingSqft}
              onChange={(e) => setEmptyRates((p) => ({ ...p, ceilingSqft: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Trim LF ($/LF)"
              type="number" min="0" step="0.01"
              value={emptyRates.trimLF}
              onChange={(e) => setEmptyRates((p) => ({ ...p, trimLF: parseFloat(e.target.value) || 0 }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Interior Modifiers */}
      <Card>
        <CardHeader>
          <CardTitle>Interior Modifiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              { label: 'Heavily Furnished', key: 'heavilyFurnished', labelKey: 'heavilyFurnishedLabel', scopeKey: 'heavilyFurnishedScope', helper: 'Applied when house is heavily furnished' },
              { label: 'Empty House', key: 'emptyHouse', labelKey: 'emptyHouseLabel', scopeKey: 'emptyHouseScope', helper: 'Applied when house is empty' },
              { label: 'Extensive Prep', key: 'extensivePrep', labelKey: 'extensivePrepLabel', scopeKey: 'extensivePrepScope', helper: 'Applied for extensive prep work' },
              { label: 'Additional Coat', key: 'additionalCoat', labelKey: 'additionalCoatLabel', scopeKey: 'additionalCoatScope', helper: 'Applied for an additional coat' },
              { label: 'One Coat', key: 'oneCoat', labelKey: 'oneCoatLabel', scopeKey: 'oneCoatScope', helper: 'Applied to reduce to 1 coat' },
            ] as { label: string; key: keyof InteriorModifierValues; labelKey: keyof InteriorModifierValues; scopeKey: keyof InteriorModifierValues; helper: string }[]
          ).map(({ label, key, labelKey, scopeKey, helper }) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={(interiorMods[labelKey] as string | undefined) ?? label}
                    onChange={(e) => setInteriorMods((p) => ({ ...p, [labelKey]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="w-32">
                  <Input
                    label="Multiplier"
                    type="number"
                    min="0"
                    step="0.01"
                    value={interiorMods[key] as number}
                    onChange={(e) => setInteriorMods((p) => ({ ...p, [key]: parseFloat(e.target.value) || 1 }))}
                    helperText={helper}
                  />
                </div>
              </div>
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

      {/* Interior Paint Prices */}
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
            <Button onClick={handleAddPaint} variant="outline" size="sm" className="mb-0.5">+ Add</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary">
          Save Interior Detailed Settings
        </Button>
      </div>
    </div>
  );
}
