import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useSettingsStore } from '../../store/settingsStore';
import {
  BUILT_IN_ROOM_TYPES,
  ROOM_TYPE_LABELS,
  ROOM_DEFAULT_SF,
} from '../../core/calculators/perRoomDetailed';

export function PerRoomSettings() {
  const { settings, updatePricing } = useSettingsStore();
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
    });
    alert('Per Room settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Furnished Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Furnished Room Pricing (per unit)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Wall Sq Ft Rate"
            type="number"
            min="0"
            step="0.01"
            value={furnishedRates.wallSqft}
            onChange={(e) => setFurnishedRates((prev) => ({ ...prev, wallSqft: parseFloat(e.target.value) || 0 }))}
          />
          <Input
            label="Ceiling Sq Ft Rate"
            type="number"
            min="0"
            step="0.01"
            value={furnishedRates.ceilingSqft}
            onChange={(e) => setFurnishedRates((prev) => ({ ...prev, ceilingSqft: parseFloat(e.target.value) || 0 }))}
          />
          <Input
            label="Trim LF Rate"
            type="number"
            min="0"
            step="0.01"
            value={furnishedRates.trimLF}
            onChange={(e) => setFurnishedRates((prev) => ({ ...prev, trimLF: parseFloat(e.target.value) || 0 }))}
          />
        </CardContent>
      </Card>

      {/* Empty Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Empty Room Pricing (per unit)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Wall Sq Ft Rate"
            type="number"
            min="0"
            step="0.01"
            value={emptyRates.wallSqft}
            onChange={(e) => setEmptyRates((prev) => ({ ...prev, wallSqft: parseFloat(e.target.value) || 0 }))}
          />
          <Input
            label="Ceiling Sq Ft Rate"
            type="number"
            min="0"
            step="0.01"
            value={emptyRates.ceilingSqft}
            onChange={(e) => setEmptyRates((prev) => ({ ...prev, ceilingSqft: parseFloat(e.target.value) || 0 }))}
          />
          <Input
            label="Trim LF Rate"
            type="number"
            min="0"
            step="0.01"
            value={emptyRates.trimLF}
            onChange={(e) => setEmptyRates((prev) => ({ ...prev, trimLF: parseFloat(e.target.value) || 0 }))}
          />
        </CardContent>
      </Card>

      {/* Auto-Calculate Multipliers */}
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
              type="number"
              min="0"
              step="0.01"
              value={multipliers.wall}
              onChange={(e) => setMultipliers((prev) => ({ ...prev, wall: parseFloat(e.target.value) || 0 }))}
              helperText="Room SF × this = Wall SF"
            />
            <Input
              label="Ceiling Multiplier"
              type="number"
              min="0"
              step="0.01"
              value={multipliers.ceiling}
              onChange={(e) => setMultipliers((prev) => ({ ...prev, ceiling: parseFloat(e.target.value) || 0 }))}
              helperText="Room SF × this = Ceiling SF"
            />
            <Input
              label="Trim Multiplier"
              type="number"
              min="0"
              step="0.01"
              value={multipliers.trim}
              onChange={(e) => setMultipliers((prev) => ({ ...prev, trim: parseFloat(e.target.value) || 0 }))}
              helperText="Room SF × this = Trim LF"
            />
          </div>
        </CardContent>
      </Card>

      {/* Built-in Room Types */}
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

      {/* Custom Room Types */}
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

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary">
          Save Per Room Settings
        </Button>
      </div>
    </div>
  );
}
