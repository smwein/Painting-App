import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { LineItemConfig } from '../../types/settings.types';

export function CustomLineItemsManager() {
  const { settings, addLineItem, updateLineItem, deleteLineItem } = useSettingsStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newItem, setNewItem] = useState<Omit<LineItemConfig, 'id' | 'order' | 'isDefault'>>({
    name: '',
    rate: 0,
    unit: 'each',
    category: '',
  });

  const customItems = settings.pricing.lineItems.filter((item) => !item.isDefault);
  const sections = settings.pricing.sections;

  const handleAddItem = () => {
    if (!newItem.name || !newItem.category || newItem.rate <= 0) {
      alert('Please fill in all fields with valid values');
      return;
    }

    addLineItem({ ...newItem, isDefault: false });
    setNewItem({ name: '', rate: 0, unit: 'each', category: '' });
    setShowAddForm(false);
    alert('Custom line item added successfully!');
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this custom line item?')) {
      deleteLineItem(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Add custom line items that will appear in the detailed calculators.
        </p>
        <Button onClick={() => setShowAddForm(!showAddForm)} variant="primary">
          {showAddForm ? 'Cancel' : 'Add Custom Line Item'}
        </Button>
      </div>

      {/* Add New Item Form */}
      {showAddForm && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Add New Line Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Line Item Name"
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="e.g., Garage Door"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Rate"
                type="number"
                min="0"
                step="0.01"
                value={newItem.rate}
                onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) })}
              />

              <Select
                label="Unit"
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as any })}
              >
                <option value="sqft">Per Square Foot</option>
                <option value="lf">Per Linear Foot</option>
                <option value="each">Per Each</option>
                <option value="hour">Per Hour</option>
                <option value="dollars">Custom Dollar Amount</option>
              </Select>
            </div>

            <Select
              label="Section"
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            >
              <option value="">Select a section...</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name} ({section.calculatorType === 'interior-detailed' ? 'Interior' : 'Exterior'})
                </option>
              ))}
            </Select>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowAddForm(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleAddItem} variant="primary">
                Add Line Item
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Line Items ({customItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No custom line items yet. Click "Add Custom Line Item" to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {customItems.map((item) => {
                const section = sections.find((s) => s.id === item.category);
                const isEditing = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <Input
                          label="Name"
                          type="text"
                          value={item.name}
                          onChange={(e) => updateLineItem(item.id, { name: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Rate"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateLineItem(item.id, { rate: parseFloat(e.target.value) })}
                          />
                          <Select
                            label="Unit"
                            value={item.unit}
                            onChange={(e) => updateLineItem(item.id, { unit: e.target.value as any })}
                          >
                            <option value="sqft">Per Square Foot</option>
                            <option value="lf">Per Linear Foot</option>
                            <option value="each">Per Each</option>
                            <option value="hour">Per Hour</option>
                            <option value="dollars">Custom Dollar Amount</option>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => setEditingId(null)} variant="outline" size="sm">
                            Cancel
                          </Button>
                          <Button onClick={() => setEditingId(null)} variant="primary" size="sm">
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">
                            ${item.rate} per {item.unit} • {section?.name || 'Unknown Section'} •{' '}
                            {section?.calculatorType === 'interior-detailed' ? 'Interior' : 'Exterior'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setEditingId(item.id)}
                            variant="outline"
                            size="sm"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteItem(item.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
