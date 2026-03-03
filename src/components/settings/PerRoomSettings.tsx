import { useState } from 'react';
import { Card, CardContent } from '../common/Card';
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

  return (
    <div className="space-y-6">
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
    </div>
  );
}
