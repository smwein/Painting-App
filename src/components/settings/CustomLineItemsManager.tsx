import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { LineItemConfig } from '../../types/settings.types';

type CalcType = 'interior-detailed' | 'exterior-detailed' | 'simple-pricing';

const CALC_LABELS: Record<CalcType, string> = {
  'interior-detailed': 'Interior Detailed',
  'exterior-detailed': 'Exterior Detailed',
  'simple-pricing': 'Simple Pricing',
};

interface NewItemRow {
  name: string;
  rate: number;
  unit: LineItemConfig['unit'];
}

const emptyRow = (): NewItemRow => ({ name: '', rate: 0, unit: 'each' });

export function CustomLineItemsManager() {
  const { settings, addLineItem, updateLineItem, deleteLineItem } = useSettingsStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Shared for all rows in a batch
  const [batchCalcType, setBatchCalcType] = useState<CalcType>('interior-detailed');
  const [batchSection, setBatchSection] = useState('');
  const [rows, setRows] = useState<NewItemRow[]>([emptyRow()]);

  const customItems = settings.pricing.lineItems.filter((item) => !item.isDefault);
  const sections = settings.pricing.sections;

  const filteredSections = sections.filter((s) => s.calculatorType === batchCalcType);

  const handleCalcTypeChange = (type: CalcType) => {
    setBatchCalcType(type);
    setBatchSection(''); // reset section when type changes
  };

  const updateRow = (idx: number, field: keyof NewItemRow, value: string | number) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    if (rows.length < 10) setRows((prev) => [...prev, emptyRow()]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveAll = () => {
    if (!batchSection) {
      alert('Please select a section.');
      return;
    }
    const validRows = rows.filter((r) => r.name.trim() && r.rate > 0);
    if (validRows.length === 0) {
      alert('Please fill in at least one item with a name and rate greater than 0.');
      return;
    }
    validRows.forEach((row) => {
      addLineItem({ name: row.name.trim(), rate: row.rate, unit: row.unit, category: batchSection, isDefault: false });
    });
    setRows([emptyRow()]);
    setBatchSection('');
    setShowAddForm(false);
    alert(`${validRows.length} line item${validRows.length !== 1 ? 's' : ''} added successfully!`);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Delete this custom line item?')) deleteLineItem(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Add custom line items to the detailed calculators. Add up to 10 at a time.
        </p>
        <Button onClick={() => setShowAddForm(!showAddForm)} variant="primary">
          {showAddForm ? 'Cancel' : '+ Add Line Items'}
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Add New Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Calculator Type + Section (shared) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Calculator Type"
                value={batchCalcType}
                onChange={(e) => handleCalcTypeChange(e.target.value as CalcType)}
              >
                <option value="interior-detailed">Interior Detailed</option>
                <option value="exterior-detailed">Exterior Detailed</option>
                <option value="simple-pricing">Simple Pricing</option>
              </Select>

              <Select
                label="Section"
                value={batchSection}
                onChange={(e) => setBatchSection(e.target.value)}
              >
                <option value="">Select a section...</option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>

            {/* Item rows */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Line Items ({rows.length}/10)</p>
              {rows.map((row, idx) => (
                <div key={idx} className="flex items-end gap-2 p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <Input
                      label="Name"
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(idx, 'name', e.target.value)}
                      placeholder="e.g., Garage Door"
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      label="Rate ($)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.rate}
                      onChange={(e) => updateRow(idx, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-36">
                    <Select
                      label="Unit"
                      value={row.unit}
                      onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                    >
                      <option value="sqft">Per Sq Ft</option>
                      <option value="lf">Per Lin Ft</option>
                      <option value="each">Per Each</option>
                      <option value="hour">Per Hour</option>
                      <option value="dollars">Custom $</option>
                    </Select>
                  </div>
                  {rows.length > 1 && (
                    <button
                      onClick={() => removeRow(idx)}
                      className="mb-0.5 text-red-400 hover:text-red-600 text-lg leading-none"
                      title="Remove row"
                    >×</button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                onClick={addRow}
                variant="outline"
                size="sm"
                disabled={rows.length >= 10}
              >
                + Add Another Item
              </Button>
              <div className="flex gap-2">
                <Button onClick={() => setShowAddForm(false)} variant="outline">Cancel</Button>
                <Button onClick={handleSaveAll} variant="primary">Save All Items</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing custom items */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Line Items ({customItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No custom line items yet.
            </p>
          ) : (
            <div className="space-y-3">
              {customItems.map((item) => {
                const section = sections.find((s) => s.id === item.category);
                const calcType = section?.calculatorType ?? '';
                const isEditing = editingId === item.id;

                return (
                  <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
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
                            <option value="sqft">Per Sq Ft</option>
                            <option value="lf">Per Lin Ft</option>
                            <option value="each">Per Each</option>
                            <option value="hour">Per Hour</option>
                            <option value="dollars">Custom $</option>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => setEditingId(null)} variant="outline" size="sm">Cancel</Button>
                          <Button onClick={() => setEditingId(null)} variant="primary" size="sm">Done</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">
                            ${item.rate} per {item.unit}
                            {section && <> · {section.name} · {CALC_LABELS[calcType as CalcType] ?? calcType}</>}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => setEditingId(item.id)} variant="outline" size="sm">Edit</Button>
                          <Button
                            onClick={() => handleDeleteItem(item.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >Delete</Button>
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
