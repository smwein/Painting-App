import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { CustomerInfoSection } from './shared/CustomerInfoSection';
import { MarkupSelector } from './shared/MarkupSelector';
import { useSettingsStore } from '../../store/settingsStore';
import type { PaintType, MarkupPercentage } from '../../types/calculator.types';
import type { CustomerInfo } from '../../types/bid.types';
import { JobDurationEstimate } from '../results/JobDurationEstimate';
import {
  calculatePerRoom,
  ROOM_TYPE_LABELS,
  ROOM_DEFAULT_SF,
  getAllRoomTypes,
} from '../../core/calculators/perRoomDetailed';
import type { RoomEntry, RoomType } from '../../core/calculators/perRoomDetailed';

interface PerRoomFormData {
  customer: CustomerInfo;
  markup: number;
}

interface PerRoomDetailedProps {
  onResultChange?: (result: any) => void;
}

const PAINT_TYPES: PaintType[] = ['ProMar', 'SuperPaint', 'Duration', 'Emerald'];

export function PerRoomDetailed({ onResultChange }: PerRoomDetailedProps) {
  const { settings } = useSettingsStore();
  const pricing = settings.pricing;

  const allRoomTypes = getAllRoomTypes(pricing);

  const createRoom = (type: RoomType = 'bedroom'): RoomEntry => {
    const roomDef = allRoomTypes.find((r) => r.id === type);
    const sf = roomDef?.defaultSqft ?? ROOM_DEFAULT_SF[type] ?? 150;
    const label = roomDef?.name ?? ROOM_TYPE_LABELS[type] ?? type;
    return {
      id: crypto.randomUUID(),
      roomType: type,
      roomLabel: label,
      wallSqft: sf,
      ceilingSqft: Math.round(sf * 0.31),
      trimLF: Math.round(sf * 0.11),
      doors: type === 'bathroom' || type === 'closet' ? 1 : 2,
      paintType: 'SuperPaint',
    };
  };

  const { register, watch } = useForm<PerRoomFormData>({
    defaultValues: { markup: 50 },
  });

  const markup = watch('markup');
  const customer = watch('customer');

  const [rooms, setRooms] = useState<RoomEntry[]>(() => [createRoom('bedroom')]);
  const [collapsedRooms, setCollapsedRooms] = useState<Record<string, boolean>>({});

  // Custom per-room sections with their line items
  const customPerRoomSections = useMemo(() => {
    return pricing.sections
      .filter((s) => s.calculatorType === 'per-room')
      .map((s) => ({
        section: s,
        items: pricing.lineItems.filter((li) => li.category === s.id).sort((a, b) => a.order - b.order),
      }))
      .filter((s) => s.items.length > 0)
      .sort((a, b) => a.section.order - b.section.order);
  }, [pricing.sections, pricing.lineItems]);

  // State for custom line item values per room: { [roomId]: { [itemId]: qty } }
  const [customItemValues, setCustomItemValues] = useState<Record<string, Record<string, number>>>({});

  const toggleRoom = (id: string) =>
    setCollapsedRooms((prev) => ({ ...prev, [id]: !prev[id] }));

  const addRoom = () => {
    const newRoom = createRoom('bedroom');
    setRooms((prev) => [...prev, newRoom]);
  };

  const removeRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRoom = (id: string, updates: Partial<RoomEntry>) => {
    setRooms((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };
      // Auto-fill measurements if room type changed
      if (updates.roomType && updates.roomType !== r.roomType) {
        const roomDef = allRoomTypes.find((rt) => rt.id === updates.roomType);
        const sf = roomDef?.defaultSqft ?? ROOM_DEFAULT_SF[updates.roomType!] ?? 150;
        updated.wallSqft = sf;
        updated.ceilingSqft = Math.round(sf * 0.31);
        updated.trimLF = Math.round(sf * 0.11);
        updated.doors = updates.roomType === 'bathroom' || updates.roomType === 'closet' ? 1 : 2;
        if (!updates.roomLabel) {
          updated.roomLabel = roomDef?.name ?? ROOM_TYPE_LABELS[updates.roomType!] ?? updates.roomType!;
        }
      }
      return updated;
    }));
  };

  const result = useMemo(() => {
    if (rooms.length === 0) return null;
    const inputs = {
      rooms,
      markup: markup as MarkupPercentage,
      customItemValues,
    };
    const calc = calculatePerRoom(inputs, pricing);
    if (onResultChange) {
      onResultChange({ customer, inputs, result: calc });
    }
    return calc;
  }, [rooms, markup, customer, pricing, onResultChange, customItemValues]);

  return (
    <div className="space-y-6">
      <MarkupSelector register={register} />

      {/* Rooms */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Rooms ({rooms.length})</h3>
          <Button onClick={addRoom} variant="primary" size="sm">+ Add Room</Button>
        </div>

        {rooms.map((room, idx) => {
          const isCollapsed = collapsedRooms[room.id];
          const getRate = (id: string) => pricing.lineItems.find((i) => i.id === id)?.rate ?? 0;
          const roomLabor =
            room.wallSqft * getRate('int-wall-sqft') +
            room.ceilingSqft * getRate('int-ceiling-sqft') +
            room.trimLF * getRate('int-trim-lf') +
            room.doors * getRate('int-door');

          return (
            <Card key={room.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm text-gray-500 font-medium">#{idx + 1}</span>
                    <span className="font-semibold text-gray-900 truncate">{room.roomLabel}</span>
                    {roomLabor > 0 && (
                      <span className="text-sm text-primary-600 font-medium ml-2">
                        ${roomLabor.toFixed(0)} labor
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleRoom(room.id)}
                      className="text-sm text-gray-500 hover:text-gray-800 px-2 py-1 border border-gray-200 rounded"
                    >
                      {isCollapsed ? 'Show' : 'Hide'}
                    </button>
                    {rooms.length > 1 && (
                      <button
                        onClick={() => removeRoom(room.id)}
                        className="text-sm text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {!isCollapsed && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={room.roomType}
                        onChange={(e) => updateRoom(room.id, { roomType: e.target.value as RoomType })}
                      >
                        {allRoomTypes.map((rt) => (
                          <option key={rt.id} value={rt.id}>{rt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room Label</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={room.roomLabel}
                        onChange={(e) => updateRoom(room.id, { roomLabel: e.target.value })}
                        placeholder="e.g. Master Bedroom"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Wall Sq Ft (${getRate('int-wall-sqft').toFixed(2)}/sqft)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={room.wallSqft}
                        onChange={(e) => updateRoom(room.id, { wallSqft: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Ceiling Sq Ft (${getRate('int-ceiling-sqft').toFixed(2)}/sqft)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={room.ceilingSqft}
                        onChange={(e) => updateRoom(room.id, { ceilingSqft: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Trim LF (${getRate('int-trim-lf').toFixed(2)}/lf)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={room.trimLF}
                        onChange={(e) => updateRoom(room.id, { trimLF: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Doors (${getRate('int-door').toFixed(0)}/door)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={room.doors}
                        onChange={(e) => updateRoom(room.id, { doors: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="w-48">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Paint Type</label>
                    <select
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={room.paintType}
                      onChange={(e) => updateRoom(room.id, { paintType: e.target.value as PaintType })}
                    >
                      {PAINT_TYPES.map((type) => (
                        <option key={type} value={type}>{type} (${pricing.interiorPaint[type]}/gal)</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom per-room sections */}
                  {customPerRoomSections.map(({ section, items }) => (
                    <div key={section.id} className="col-span-full pt-2 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">{section.name}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {items.map((item) => (
                          <div key={item.id}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {item.name} (${item.rate.toFixed(2)}/{item.unit})
                            </label>
                            <input
                              type="number"
                              min="0"
                              step={item.unit === 'sqft' || item.unit === 'lf' ? '0.1' : '1'}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              value={customItemValues[room.id]?.[item.id] ?? ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setCustomItemValues((prev) => ({
                                  ...prev,
                                  [room.id]: {
                                    ...(prev[room.id] ?? {}),
                                    [item.id]: isNaN(val) ? 0 : val,
                                  },
                                }));
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}

        <div className="flex justify-center">
          <Button onClick={addRoom} variant="outline">+ Add Another Room</Button>
        </div>
      </div>

      {/* Results */}
      {result && result.total > 0 && (
        <>
          {/* Per-room breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Room Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.roomResults.map((rr) => (
                  <div key={rr.roomId} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm font-medium text-gray-700">{rr.roomLabel}</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-800">${rr.subtotal.toFixed(2)} cost</div>
                      <div className="text-xs text-gray-500">
                        ${rr.labor.toFixed(2)} labor
                        {rr.materials.totalCost > 0 && ` + $${rr.materials.totalCost.toFixed(2)} paint`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <JobDurationEstimate laborCost={result.labor} pricing={pricing} />

          {/* Grand Total */}
          <Card className="bg-primary-50 border-primary-200">
            <CardHeader>
              <CardTitle>Bid Total</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Labor Cost</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    ({result.total > 0 ? ((result.labor / result.total) * 100).toFixed(0) : 0}%)
                  </span>
                  <span className="text-lg font-semibold text-gray-800">${result.labor.toFixed(2)}</span>
                </div>
              </div>
              {result.materials.totalCost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Material Cost</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      ({result.total > 0 ? ((result.materials.totalCost / result.total) * 100).toFixed(0) : 0}%)
                    </span>
                    <span className="text-lg font-semibold text-gray-800">${result.materials.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Gross Profit</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 font-medium">
                    ({result.total > 0 ? ((result.profit / result.total) * 100).toFixed(0) : 0}%)
                  </span>
                  <span className="text-lg font-semibold text-green-700">${result.profit.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-primary-200 pt-3 flex justify-between items-center">
                <span className="text-base font-semibold text-gray-700">Retail Total</span>
                <span className="text-3xl font-bold text-primary-700">${result.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <CustomerInfoSection register={register} />
    </div>
  );
}
