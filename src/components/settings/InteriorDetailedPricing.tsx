import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { ModifierScope, LineItemConfig, SectionConfig } from '../../types/settings.types';

function SortableSectionRow({ section, children }: { section: SectionConfig; children: (props: { dragHandleProps: React.HTMLAttributes<HTMLElement> }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

function SortableModifierRow({ modId, children }: { modId: string; children: (props: { dragHandleProps: React.HTMLAttributes<HTMLElement> }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: modId });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

function SortableLineItemRow({ itemId, children }: { itemId: string; children: (props: { dragHandleProps: React.HTMLAttributes<HTMLElement> }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: itemId });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

const UNIT_OPTIONS = ['sqft', 'lf', 'each', 'hour', 'dollars'] as const;

interface AddForm {
  name: string;
  rate: string;
  unit: LineItemConfig['unit'];
}

export function InteriorDetailedPricing() {
  const { settings, updatePricing, updateSection, updateLineItem, deleteLineItem, addLineItem } = useSettingsStore();
  const pricing = settings.pricing;

  const [interiorMods, setInteriorMods] = useState(
    pricing.interiorModifiers ?? [
      { id: 'int-mod-heavily-furnished', name: 'Heavily Furnished', multiplier: 1.25, scope: 'labor' as ModifierScope, order: 1 },
      { id: 'int-mod-empty-house', name: 'Empty House', multiplier: 0.85, scope: 'labor' as ModifierScope, order: 2 },
      { id: 'int-mod-extensive-prep', name: 'Extensive Prep', multiplier: 1.15, scope: 'labor' as ModifierScope, order: 3 },
      { id: 'int-mod-additional-coat', name: 'Additional Coat', multiplier: 1.25, scope: 'labor' as ModifierScope, order: 4 },
      { id: 'int-mod-one-coat', name: 'One Coat', multiplier: 0.85, scope: 'labor' as ModifierScope, order: 5 },
    ]
  );
  const [newModName, setNewModName] = useState('');
  const [newModMultiplier, setNewModMultiplier] = useState('1.00');
  const [newModScope, setNewModScope] = useState<ModifierScope>('labor');

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

  const handleAddModifier = () => {
    const name = newModName.trim();
    const multiplier = parseFloat(newModMultiplier);
    if (!name || isNaN(multiplier) || multiplier <= 0) {
      alert('Please enter a valid modifier name and multiplier.');
      return;
    }
    const maxOrder = Math.max(...interiorMods.map((m) => m.order), 0);
    setInteriorMods((prev) => [
      ...prev,
      { id: `int-mod-${Date.now()}`, name, multiplier, scope: newModScope, order: maxOrder + 1 },
    ]);
    setNewModName('');
    setNewModMultiplier('1.00');
    setNewModScope('labor');
  };

  const handleDeleteModifier = (id: string) => {
    setInteriorMods((prev) => prev.filter((m) => m.id !== id));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = interiorSections.findIndex((s) => s.id === active.id);
    const newIndex = interiorSections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(interiorSections, oldIndex, newIndex);
    reordered.forEach((section, index) => {
      updateSection(section.id, { order: index + 1 });
    });
  };

  const handleLineItemDragEnd = (sectionId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = getItemsForSection(sectionId);
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    reordered.forEach((item, index) => {
      updateLineItem(item.id, { order: index + 1 });
    });
  };

  const handleModifierDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sorted = [...interiorMods].sort((a, b) => a.order - b.order);
    const oldIndex = sorted.findIndex((m) => m.id === active.id);
    const newIndex = sorted.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    setInteriorMods(reordered.map((m, i) => ({ ...m, order: i + 1 })));
  };

  const handleSave = () => {
    updatePricing({
      interiorModifiers: interiorMods,
      interiorPaint,
      interiorDetailedFurnishedRates: furnishedRates,
      interiorDetailedEmptyRates: emptyRates,
      interiorMultipliers: intMultipliers,
    });
    alert('Interior detailed pricing settings saved successfully!');
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
    .filter((s) => s.calculatorType === 'interior-detailed' && s.id !== 'int-measurements')
    .sort((a, b) => a.order - b.order);

  const getItemsForSection = (sectionId: string) =>
    pricing.lineItems
      .filter((item) => item.category === sectionId)
      .sort((a, b) => a.order - b.order);

  const renderSectionContent = (section: typeof interiorSections[0], dragHandleProps: React.HTMLAttributes<HTMLElement>) => {
    const items = getItemsForSection(section.id);
    const addForm = addForms[section.id] ?? { name: '', rate: '', unit: 'each' as const };
    const isEditingThis = editingSectionId === section.id;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                {...dragHandleProps}
                className="touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-xl px-1 flex-shrink-0"
                title="Drag to reorder"
              >⠿</button>
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
            </div>
            <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={section.defaultCollapsed ?? false}
                onChange={(e) => updateSection(section.id, { defaultCollapsed: e.target.checked })}
                className="rounded"
              />
              Start collapsed
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLineItemDragEnd(section.id)}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableLineItemRow key={item.id} itemId={item.id}>
                  {({ dragHandleProps: itemDragProps }) => (
                    <div className="flex items-end gap-2">
                      <button
                        {...itemDragProps}
                        className="touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-lg px-1 flex-shrink-0 mb-0.5"
                        title="Drag to reorder"
                      >⠿</button>
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
                  )}
                </SortableLineItemRow>
              ))}
            </SortableContext>
          </DndContext>

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
  };

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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
        <SortableContext items={interiorSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {interiorSections.map((section) => (
              <SortableSectionRow key={section.id} section={section}>
                {({ dragHandleProps }) => renderSectionContent(section, dragHandleProps)}
              </SortableSectionRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Interior Modifiers */}
      <Card>
        <CardHeader>
          <CardTitle>Interior Modifiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModifierDragEnd}>
            <SortableContext items={[...interiorMods].sort((a, b) => a.order - b.order).map((m) => m.id)} strategy={verticalListSortingStrategy}>
              {[...interiorMods].sort((a, b) => a.order - b.order).map((mod) => (
                <SortableModifierRow key={mod.id} modId={mod.id}>
                  {({ dragHandleProps }) => (
                    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
                      <button
                        {...dragHandleProps}
                        className="touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-lg px-1 flex-shrink-0"
                        title="Drag to reorder"
                      >⠿</button>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={mod.name}
                          onChange={(e) => setInteriorMods((prev) =>
                            prev.map((m) => m.id === mod.id ? { ...m, name: e.target.value } : m)
                          )}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Modifier name"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={mod.multiplier}
                          onChange={(e) => setInteriorMods((prev) =>
                            prev.map((m) => m.id === mod.id ? { ...m, multiplier: parseFloat(e.target.value) || 1 } : m)
                          )}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <select
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={mod.scope}
                        onChange={(e) => setInteriorMods((prev) =>
                          prev.map((m) => m.id === mod.id ? { ...m, scope: e.target.value as ModifierScope } : m)
                        )}
                      >
                        <option value="labor">Labor</option>
                        <option value="materials">Materials</option>
                        <option value="both">Both</option>
                      </select>
                      <button
                        onClick={() => handleDeleteModifier(mod.id)}
                        className="text-red-400 hover:text-red-600 text-sm font-bold px-1"
                        title="Delete modifier"
                      >✕</button>
                    </div>
                  )}
                </SortableModifierRow>
              ))}
            </SortableContext>
          </DndContext>
          <div className="flex items-end gap-2 pt-2 border-t border-gray-100">
            <div className="flex-1">
              <Input label="New Modifier Name" type="text" value={newModName}
                onChange={(e) => setNewModName(e.target.value)} placeholder="e.g., High Ceiling" />
            </div>
            <div className="w-24">
              <Input label="Multiplier" type="number" min="0" step="0.01" value={newModMultiplier}
                onChange={(e) => setNewModMultiplier(e.target.value)} placeholder="1.00" />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-500 mb-1">Scope</label>
              <select
                value={newModScope}
                onChange={(e) => setNewModScope(e.target.value as ModifierScope)}
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="labor">Labor</option>
                <option value="materials">Materials</option>
                <option value="both">Both</option>
              </select>
            </div>
            <Button onClick={handleAddModifier} variant="outline" size="sm" className="mb-0.5">+ Add</Button>
          </div>
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
