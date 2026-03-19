import { useState, useEffect, useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useSettingsStore } from '../../store/settingsStore';
import {
  BUILT_IN_ROOM_TYPES,
  ROOM_TYPE_LABELS,
  ROOM_DEFAULT_SF,
} from '../../core/calculators/perRoomDetailed';
import type { LineItemConfig } from '../../types/settings.types';

const SECTION_IDS = [
  'pr-furnished',
  'pr-empty',
  'pr-door-rate',
  'pr-paint-prices',
  'pr-multipliers',
  'pr-coverage',
  'pr-builtin-rooms',
  'pr-custom-rooms',
] as const;

const DEFAULT_SECTION_ORDER = [...SECTION_IDS];

const UNIT_OPTIONS = ['sqft', 'lf', 'each', 'hour', 'dollars'] as const;

interface AddItemForm {
  name: string;
  rate: string;
  unit: LineItemConfig['unit'];
}

function SortableSettingsCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div className="relative">
        <button
          {...attributes}
          {...listeners}
          className="absolute top-3 left-3 touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-xl px-1 z-10"
          title="Drag to reorder section"
        >{'\u2807'}</button>
        <div className="pl-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PerRoomSettings() {
  const { settings, updatePricing, addLineItem, updateLineItem, deleteLineItem } = useSettingsStore();
  const pricing = settings.pricing;
  const customRoomTypes = pricing.customRoomTypes ?? [];

  const [newName, setNewName] = useState('');
  const [newDefaultSqft, setNewDefaultSqft] = useState(150);

  // Local state for furnished/empty rates (reuses Interior Detailed rates)
  const [furnishedRates, setFurnishedRates] = useState(
    pricing.interiorDetailedFurnishedRates ?? { wallSqft: 1.0, ceilingSqft: 0.5, trimLF: 0.75 }
  );
  const [emptyRates, setEmptyRates] = useState(
    pricing.interiorDetailedEmptyRates ?? { wallSqft: 0.85, ceilingSqft: 0.42, trimLF: 0.64 }
  );

  // Local state for per-room multipliers
  const [multipliers, setMultipliers] = useState(
    pricing.perRoomMultipliers ?? { wall: 1.0, ceiling: 0.31, trim: 0.11 }
  );

  const [coverage, setCoverage] = useState(
    pricing.perRoomCoverage ?? { wallSqftPerGallon: 400, ceilingSqftPerGallon: 400, trimLfPerGallon: 200 }
  );

  // Door rate from line items (used by per-room calculator)
  const doorItem = pricing.lineItems.find((i) => i.id === 'int-door');
  const [doorRate, setDoorRate] = useState(doorItem?.rate ?? 40);

  // Interior paint prices (used by per-room calculator for paint type selection)
  const [paintPrices, setPaintPrices] = useState(pricing.interiorPaint);

  // Sync local state when settings load from Supabase
  useEffect(() => {
    setFurnishedRates(pricing.interiorDetailedFurnishedRates ?? { wallSqft: 1.0, ceilingSqft: 0.5, trimLF: 0.75 });
    setEmptyRates(pricing.interiorDetailedEmptyRates ?? { wallSqft: 0.85, ceilingSqft: 0.42, trimLF: 0.64 });
    setMultipliers(pricing.perRoomMultipliers ?? { wall: 1.0, ceiling: 0.31, trim: 0.11 });
    setCoverage(pricing.perRoomCoverage ?? { wallSqftPerGallon: 400, ceilingSqftPerGallon: 400, trimLfPerGallon: 200 });
    setPaintPrices(pricing.interiorPaint);
    const door = pricing.lineItems.find((i) => i.id === 'int-door');
    if (door) setDoorRate(door.rate);
  }, [pricing]);

  // Add line item forms per section
  const [addItemForms, setAddItemForms] = useState<Record<string, AddItemForm>>({});

  // Section order state
  const sectionOrder = useMemo(
    () => settings.pricing.settingsPageSectionOrder?.perRoom ?? DEFAULT_SECTION_ORDER,
    [settings.pricing.settingsPageSectionOrder?.perRoom]
  );
  const [localSectionOrder, setLocalSectionOrder] = useState<string[]>(sectionOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleCardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localSectionOrder.indexOf(active.id as string);
    const newIndex = localSectionOrder.indexOf(over.id as string);
    const newOrder = arrayMove(localSectionOrder, oldIndex, newIndex);
    setLocalSectionOrder(newOrder);
    updatePricing({
      settingsPageSectionOrder: {
        ...settings.pricing.settingsPageSectionOrder,
        perRoom: newOrder,
      },
    });
  };

  const updateAddItemForm = (sectionId: string, changes: Partial<AddItemForm>) => {
    setAddItemForms((prev) => {
      const existing = prev[sectionId] ?? { name: '', rate: '', unit: 'each' as const };
      return { ...prev, [sectionId]: { ...existing, ...changes } };
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
      unit: (form.unit || 'each') as LineItemConfig['unit'],
      category: sectionId,
      isDefault: false,
    });
    setAddItemForms((prev) => ({ ...prev, [sectionId]: { name: '', rate: '', unit: 'each' } }));
  };

  const renderCustomLineItems = (category: string) => {
    const items = pricing.lineItems
      .filter((i) => i.category === category)
      .sort((a, b) => a.order - b.order);
    const addForm = addItemForms[category] ?? { name: '', rate: '', unit: 'each' as const };

    return (
      <>
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
            onChange={(e) => updateAddItemForm(category, { name: e.target.value })}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Rate"
            value={addForm.rate}
            onChange={(e) => updateAddItemForm(category, { rate: e.target.value })}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={addForm.unit}
            onChange={(e) => updateAddItemForm(category, { unit: e.target.value as LineItemConfig['unit'] })}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <button
            onClick={() => handleAddItem(category)}
            className="px-2 py-1 text-sm text-primary-700 border border-primary-300 rounded hover:bg-primary-50 font-medium"
          >+ Add</button>
        </div>
      </>
    );
  };

  const addRoomType = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = `custom-${trimmed.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    updatePricing({
      customRoomTypes: [...customRoomTypes, { id, name: trimmed, defaultSqft: newDefaultSqft }],
    });
    setNewName('');
    setNewDefaultSqft(150);
  };

  const deleteRoomType = (id: string) => {
    if (confirm('Delete this room type?')) {
      updatePricing({
        customRoomTypes: customRoomTypes.filter((r) => r.id !== id),
      });
    }
  };

  const handleSave = () => {
    updatePricing({
      interiorDetailedFurnishedRates: furnishedRates,
      interiorDetailedEmptyRates: emptyRates,
      perRoomMultipliers: multipliers,
      perRoomCoverage: coverage,
      interiorPaint: paintPrices,
    });
    // Update door rate line item
    if (doorItem) {
      updateLineItem('int-door', { rate: doorRate });
    }
    alert('Per Room settings saved successfully!');
  };

  // Build section content map
  const sectionContent: Record<string, React.ReactNode> = {
    'pr-furnished': (
      <Card>
        <CardHeader>
          <CardTitle>Furnished Room Pricing (per unit)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Wall Sq Ft Rate"
              type="number" min="0" step="0.01"
              value={furnishedRates.wallSqft}
              onChange={(e) => setFurnishedRates((prev) => ({ ...prev, wallSqft: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Ceiling Sq Ft Rate"
              type="number" min="0" step="0.01"
              value={furnishedRates.ceilingSqft}
              onChange={(e) => setFurnishedRates((prev) => ({ ...prev, ceilingSqft: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Trim LF Rate"
              type="number" min="0" step="0.01"
              value={furnishedRates.trimLF}
              onChange={(e) => setFurnishedRates((prev) => ({ ...prev, trimLF: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          {renderCustomLineItems('pr-furnished')}
        </CardContent>
      </Card>
    ),
    'pr-empty': (
      <Card>
        <CardHeader>
          <CardTitle>Empty Room Pricing (per unit)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Wall Sq Ft Rate"
              type="number" min="0" step="0.01"
              value={emptyRates.wallSqft}
              onChange={(e) => setEmptyRates((prev) => ({ ...prev, wallSqft: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Ceiling Sq Ft Rate"
              type="number" min="0" step="0.01"
              value={emptyRates.ceilingSqft}
              onChange={(e) => setEmptyRates((prev) => ({ ...prev, ceilingSqft: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Trim LF Rate"
              type="number" min="0" step="0.01"
              value={emptyRates.trimLF}
              onChange={(e) => setEmptyRates((prev) => ({ ...prev, trimLF: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          {renderCustomLineItems('pr-empty')}
        </CardContent>
      </Card>
    ),
    'pr-door-rate': (
      <Card>
        <CardHeader>
          <CardTitle>Door Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-48">
            <Input
              label="Price per Door"
              type="number" min="0" step="1"
              value={doorRate}
              onChange={(e) => setDoorRate(parseFloat(e.target.value) || 0)}
              helperText="Applied per door in each room"
            />
          </div>
        </CardContent>
      </Card>
    ),
    'pr-paint-prices': (
      <Card>
        <CardHeader>
          <CardTitle>Paint Prices (per gallon)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-3">
            These prices are used when selecting paint type per room. Shared with Simple Interior settings.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(paintPrices).map(([name, price]) => (
              <Input
                key={name}
                label={name}
                type="number" min="0" step="1"
                value={price}
                onChange={(e) => setPaintPrices((prev) => ({ ...prev, [name]: parseFloat(e.target.value) || 0 }))}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    ),
    'pr-multipliers': (
      <Card>
        <CardHeader>
          <CardTitle>Auto-Calculate Multipliers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">
            When a room's square footage is entered, these multipliers auto-populate wall, ceiling, and trim measurements.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Wall Multiplier"
              type="number" min="0" step="0.01"
              value={multipliers.wall}
              onChange={(e) => setMultipliers((prev) => ({ ...prev, wall: parseFloat(e.target.value) || 0 }))}
              helperText="Room SF × this = Wall SF"
            />
            <Input
              label="Ceiling Multiplier"
              type="number" min="0" step="0.01"
              value={multipliers.ceiling}
              onChange={(e) => setMultipliers((prev) => ({ ...prev, ceiling: parseFloat(e.target.value) || 0 }))}
              helperText="Room SF × this = Ceiling SF"
            />
            <Input
              label="Trim Multiplier"
              type="number" min="0" step="0.01"
              value={multipliers.trim}
              onChange={(e) => setMultipliers((prev) => ({ ...prev, trim: parseFloat(e.target.value) || 0 }))}
              helperText="Room SF × this = Trim LF"
            />
          </div>
        </CardContent>
      </Card>
    ),
    'pr-coverage': (
      <Card>
        <CardHeader>
          <CardTitle>Per Room Paint Coverage Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">
            How many square feet or linear feet one gallon of paint covers. Used to estimate total paint needed.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Wall Sq Ft per Gallon"
              type="number" min="1" step="1"
              value={coverage.wallSqftPerGallon}
              onChange={(e) => setCoverage((prev) => ({ ...prev, wallSqftPerGallon: parseFloat(e.target.value) || 400 }))}
            />
            <Input
              label="Ceiling Sq Ft per Gallon"
              type="number" min="1" step="1"
              value={coverage.ceilingSqftPerGallon}
              onChange={(e) => setCoverage((prev) => ({ ...prev, ceilingSqftPerGallon: parseFloat(e.target.value) || 400 }))}
            />
            <Input
              label="Trim LF per Gallon"
              type="number" min="1" step="1"
              value={coverage.trimLfPerGallon}
              onChange={(e) => setCoverage((prev) => ({ ...prev, trimLfPerGallon: parseFloat(e.target.value) || 200 }))}
            />
          </div>
        </CardContent>
      </Card>
    ),
    'pr-builtin-rooms': (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Built-in Room Types</h3>
        <CardContent>
          <div className="space-y-2">
            {BUILT_IN_ROOM_TYPES.map((id) => (
              <div key={id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm font-medium text-gray-700">{ROOM_TYPE_LABELS[id]}</span>
                <span className="text-sm text-gray-500">{ROOM_DEFAULT_SF[id]} sqft default</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    ),
    'pr-custom-rooms': (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Room Types</h3>
        <CardContent>
          {customRoomTypes.length === 0 ? (
            <p className="text-sm text-gray-500 mb-4">No custom room types added yet.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {customRoomTypes.map((room) => (
                <div key={room.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{room.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({room.defaultSqft} sqft default)</span>
                  </div>
                  <button
                    onClick={() => deleteRoomType(room.id)}
                    className="text-sm text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Room Type</h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Room Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Laundry Room"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-600 mb-1">Default Sqft</label>
                <input
                  type="number"
                  min="0"
                  value={newDefaultSqft}
                  onChange={(e) => setNewDefaultSqft(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Button onClick={addRoomType} variant="primary" size="sm" disabled={!newName.trim()}>
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    ),
  };

  return (
    <div className="space-y-6">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCardDragEnd}>
        <SortableContext items={localSectionOrder} strategy={verticalListSortingStrategy}>
          {localSectionOrder.map((sectionId) => (
            <SortableSettingsCard key={sectionId} id={sectionId}>
              {sectionContent[sectionId]}
            </SortableSettingsCard>
          ))}
        </SortableContext>
      </DndContext>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary">
          Save Per Room Settings
        </Button>
      </div>
    </div>
  );
}
