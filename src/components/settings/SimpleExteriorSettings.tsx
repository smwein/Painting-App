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
import type { SectionConfig, LineItemConfig } from '../../types/settings.types';

const UNIT_OPTIONS = ['sqft', 'lf', 'each', 'hour', 'dollars'] as const;

interface SortableSectionRowProps {
  section: SectionConfig;
  children: (props: { dragHandleProps: React.HTMLAttributes<HTMLElement> }) => React.ReactNode;
}

function SortableSectionRow({ section, children }: SortableSectionRowProps) {
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

interface AddItemForm {
  name: string;
  rate: string;
  unit: LineItemConfig['unit'];
}

export function SimpleExteriorSettings() {
  const {
    settings,
    updatePricing,
    updateSection,
    deleteSection,
    addSection,
    addLineItem,
    updateLineItem,
    deleteLineItem,
  } = useSettingsStore();
  const [formData, setFormData] = useState(settings.pricing);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Paint type inputs
  const [newExtPaintName, setNewExtPaintName] = useState('');
  const [newExtPaintPrice, setNewExtPaintPrice] = useState('');

  // Add line item forms per section
  const [addItemForms, setAddItemForms] = useState<Record<string, AddItemForm>>({});

  // Add new section form
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const simpleSections = settings.pricing.sections
    .filter((s) => s.calculatorType === 'simple-pricing')
    .sort((a, b) => a.order - b.order);

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = simpleSections.findIndex((s) => s.id === active.id);
    const newIndex = simpleSections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(simpleSections, oldIndex, newIndex);
    reordered.forEach((section, index) => {
      updateSection(section.id, { order: index + 1 });
    });
  };

  const handleNumberChange = (path: string, value: number) => {
    const keys = path.split('.');
    setFormData((prev) => {
      const updated = { ...prev };
      let current: any = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handlePaintPriceChange = (name: string, value: number) => {
    setFormData((prev) => ({ ...prev, exteriorPaint: { ...prev.exteriorPaint, [name]: value } }));
  };

  const handleAddPaintType = () => {
    const name = newExtPaintName.trim();
    const price = parseFloat(newExtPaintPrice);
    if (!name || isNaN(price) || price <= 0) {
      alert('Please enter a valid paint name and price.');
      return;
    }
    setFormData((prev) => ({ ...prev, exteriorPaint: { ...prev.exteriorPaint, [name]: price } }));
    setNewExtPaintName('');
    setNewExtPaintPrice('');
  };

  const handleRemovePaintType = (name: string) => {
    setFormData((prev) => {
      const updated = { ...prev.exteriorPaint };
      delete updated[name];
      return { ...prev, exteriorPaint: updated };
    });
  };

  const handleAddItem = (sectionId: string) => {
    const form = addItemForms[sectionId];
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
    setAddItemForms((prev) => ({ ...prev, [sectionId]: { name: '', rate: '', unit: 'each' } }));
  };

  const updateAddItemForm = (sectionId: string, changes: Partial<AddItemForm>) => {
    setAddItemForms((prev) => {
      const existing = prev[sectionId] ?? { name: '', rate: '', unit: 'each' as const };
      return { ...prev, [sectionId]: { ...existing, ...changes } };
    });
  };

  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    addSection({
      name: newSectionName.trim(),
      calculatorType: 'simple-pricing',
      isDefault: false,
    });
    setNewSectionName('');
    setShowAddSection(false);
  };

  const handleSave = () => {
    updatePricing(formData);
    alert('Simple Exterior settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Exterior Square Footage Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Exterior Square Footage Pricing (per sq ft)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Exterior" type="number" min="0" step="0.01" value={formData.exteriorSqft.fullExterior}
            onChange={(e) => handleNumberChange('exteriorSqft.fullExterior', parseFloat(e.target.value))} />
          <Input label="Trim Only" type="number" min="0" step="0.01" value={formData.exteriorSqft.trimOnly}
            onChange={(e) => handleNumberChange('exteriorSqft.trimOnly', parseFloat(e.target.value))} />
        </CardContent>
      </Card>

      {/* Exterior Paint Prices */}
      <Card>
        <CardHeader>
          <CardTitle>Exterior Paint Prices (per gallon)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(formData.exteriorPaint).map(([name, price]) => (
              <div key={name} className="relative">
                <Input label={name} type="number" min="0" step="1" value={price}
                  onChange={(e) => handlePaintPriceChange(name, parseFloat(e.target.value))} />
                <button onClick={() => handleRemovePaintType(name)}
                  className="absolute top-0 right-0 text-red-400 hover:text-red-600 text-xs px-1" title="Remove">{'\u2715'}</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-end pt-2 border-t border-gray-100">
            <div className="flex-1">
              <Input label="New Paint Name" type="text" value={newExtPaintName}
                onChange={(e) => setNewExtPaintName(e.target.value)} placeholder="e.g., A-100" />
            </div>
            <div className="w-28">
              <Input label="Price ($/gal)" type="number" min="0" step="1" value={newExtPaintPrice}
                onChange={(e) => setNewExtPaintPrice(e.target.value)} placeholder="40" />
            </div>
            <Button onClick={handleAddPaintType} variant="outline" size="sm" className="mb-0.5">+ Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Exterior Coverage Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Exterior Paint Coverage Rates</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Wall Sq Ft per Gallon" type="number" min="0" step="1" value={formData.exteriorCoverage.wallSqftPerGallon}
            onChange={(e) => handleNumberChange('exteriorCoverage.wallSqftPerGallon', parseFloat(e.target.value))} />
          <Input label="Trim LF per Gallon" type="number" min="0" step="1" value={formData.exteriorCoverage.trimLfPerGallon}
            onChange={(e) => handleNumberChange('exteriorCoverage.trimLfPerGallon', parseFloat(e.target.value))} />
          <Input label="Door Gallons per Door" type="number" min="0" step="0.01" value={formData.exteriorCoverage.doorGallonsPerDoor}
            onChange={(e) => handleNumberChange('exteriorCoverage.doorGallonsPerDoor', parseFloat(e.target.value))} />
        </CardContent>
      </Card>

      {/* Exterior Auto-Calc Multipliers */}
      <Card>
        <CardHeader>
          <CardTitle>Exterior Auto-Calculation Multipliers</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Siding Multiplier" type="number" min="0" step="0.1" value={formData.exteriorMultipliers.siding}
            onChange={(e) => handleNumberChange('exteriorMultipliers.siding', parseFloat(e.target.value))}
            helperText="House SF × this = Siding SF" />
          <Input label="Trim Multiplier" type="number" min="0" step="0.01" value={formData.exteriorMultipliers.trim}
            onChange={(e) => handleNumberChange('exteriorMultipliers.trim', parseFloat(e.target.value))}
            helperText="House SF × this = Trim LF" />
        </CardContent>
      </Card>

      {/* Sqft Labor vs Materials Split */}
      <Card>
        <CardHeader>
          <CardTitle>Sqft Calculator — Labor / Materials Split</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">
            The sqft rate is split into labor and materials using this percentage. Materials = 100% minus the labor %.
          </p>
          <div className="flex items-end gap-4">
            <div className="w-40">
              <Input
                label="Labor %"
                type="number"
                min="1"
                max="99"
                step="1"
                value={formData.sqftLaborPct ?? 85}
                onChange={(e) => {
                  const val = Math.min(99, Math.max(1, parseInt(e.target.value) || 85));
                  setFormData((prev) => ({ ...prev, sqftLaborPct: val }));
                }}
              />
            </div>
            <div className="pb-1 text-sm text-gray-600">
              Materials: <span className="font-semibold">{100 - (formData.sqftLaborPct ?? 85)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simple Pricing Sections — drag-and-drop, show line items, add section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Simple Pricing Sections</CardTitle>
            <Button onClick={() => setShowAddSection((v) => !v)} variant="outline" size="sm">
              {showAddSection ? 'Cancel' : '+ Add Section'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">
            Sections are shared between Interior and Exterior Quick Measure calculators.
          </p>
          {showAddSection && (
            <div className="flex gap-2 items-end p-3 bg-primary-50 rounded-lg border border-primary-200">
              <div className="flex-1">
                <Input
                  label="Section Name"
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setShowAddSection(false); }}
                  placeholder="e.g., Specialty Work"
                />
              </div>
              <Button onClick={handleAddSection} variant="primary" size="sm" className="mb-0.5">Add</Button>
            </div>
          )}

          {simpleSections.length === 0 && !showAddSection && (
            <p className="text-sm text-gray-500 text-center py-4">No custom sections yet. Click "+ Add Section" to create one.</p>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={simpleSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {simpleSections.map((section) => {
                  const items = settings.pricing.lineItems
                    .filter((i) => i.category === section.id)
                    .sort((a, b) => a.order - b.order);
                  const isEditing = editingId === section.id;
                  const isCollapsed = collapsed[section.id] ?? true;
                  const addForm = addItemForms[section.id] ?? { name: '', rate: '', unit: 'each' as const };

                  return (
                    <SortableSectionRow key={section.id} section={section}>
                      {({ dragHandleProps }) => (
                        <div className="border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-2 p-3">
                            <button
                              {...dragHandleProps}
                              className="touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-xl px-1 flex-shrink-0"
                              title="Drag to reorder"
                            >{'\u2807'}</button>

                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { updateSection(section.id, { name: editingName.trim() }); setEditingId(null); }
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  autoFocus
                                  className="w-full px-2 py-1 text-sm border border-primary-400 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                              ) : (
                                <span className="font-medium text-gray-900 text-sm">
                                  {section.name}
                                  <span className="ml-2 text-xs text-gray-500">{'\u00b7'} {items.length} item{items.length !== 1 ? 's' : ''}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => toggleCollapse(section.id)}
                                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 bg-white"
                              >
                                {isCollapsed ? '+ Show' : '− Hide'}
                              </button>
                              {isEditing ? (
                                <>
                                  <Button onClick={() => { updateSection(section.id, { name: editingName.trim() }); setEditingId(null); }} variant="primary" size="sm">Save</Button>
                                  <Button onClick={() => setEditingId(null)} variant="outline" size="sm">Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <Button onClick={() => { setEditingId(section.id); setEditingName(section.name); }} variant="outline" size="sm">Edit</Button>
                                  <button
                                    onClick={() => { if (confirm(`Delete section "${section.name}" and all its items?`)) deleteSection(section.id); }}
                                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-red-200 bg-white"
                                    title="Delete section"
                                  >{'\u2715'}</button>
                                </>
                              )}
                            </div>
                          </div>

                          {!isCollapsed && (
                            <div className="px-3 pb-3 space-y-2 border-t border-gray-200 pt-2">
                              {items.length === 0 && (
                                <p className="text-xs text-gray-400 italic">No items yet.</p>
                              )}
                              {items.map((item) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    defaultValue={item.name}
                                    onBlur={(e) => {
                                      const val = e.target.value.trim();
                                      if (val && val !== item.name) updateLineItem(item.id, { name: val });
                                    }}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Item name"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    defaultValue={item.rate}
                                    onBlur={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val) && val !== item.rate) updateLineItem(item.id, { rate: val });
                                    }}
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  />
                                  <span className="text-xs text-gray-500 w-12">{item.unit}</span>
                                  <button
                                    onClick={() => deleteLineItem(item.id)}
                                    className="text-red-400 hover:text-red-600 text-sm font-bold px-1"
                                    title="Delete item"
                                  >{'\u2715'}</button>
                                </div>
                              ))}

                              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                <input
                                  type="text"
                                  placeholder="Item name"
                                  value={addForm.name}
                                  onChange={(e) => updateAddItemForm(section.id, { name: e.target.value })}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Rate"
                                  value={addForm.rate}
                                  onChange={(e) => updateAddItemForm(section.id, { rate: e.target.value })}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <select
                                  value={addForm.unit}
                                  onChange={(e) => updateAddItemForm(section.id, { unit: e.target.value as LineItemConfig['unit'] })}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                  {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                                </select>
                                <button
                                  onClick={() => handleAddItem(section.id)}
                                  className="px-2 py-1 text-sm text-primary-700 border border-primary-300 rounded hover:bg-primary-50 font-medium"
                                >+ Add</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </SortableSectionRow>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary">
          Save Simple Exterior Settings
        </Button>
      </div>
    </div>
  );
}
