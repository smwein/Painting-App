import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { SectionConfig } from '../../types/settings.types';

type CalcType = 'interior-detailed' | 'exterior-detailed' | 'simple-pricing';

const CALC_LABELS: Record<CalcType, string> = {
  'interior-detailed': 'Interior Detailed',
  'exterior-detailed': 'Exterior Detailed',
  'simple-pricing': 'Simple Pricing',
};

export function CustomSectionsManager() {
  const { settings, addSection, updateSection, deleteSection } = useSettingsStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [newSection, setNewSection] = useState<Omit<SectionConfig, 'id' | 'order' | 'isDefault'>>({
    name: '',
    calculatorType: 'interior-detailed',
  });

  const allSections = [...settings.pricing.sections].sort((a, b) => a.order - b.order);

  const getSectionsForType = (type: CalcType) =>
    allSections.filter((s) => s.calculatorType === type);

  const handleAddSection = () => {
    if (!newSection.name.trim()) {
      alert('Please enter a section name');
      return;
    }
    addSection({ ...newSection, isDefault: false });
    setNewSection({ name: '', calculatorType: 'interior-detailed' });
    setShowAddForm(false);
  };

  const handleDeleteSection = (section: SectionConfig) => {
    const itemsInSection = settings.pricing.lineItems.filter((item) => item.category === section.id);
    const msg = itemsInSection.length > 0
      ? `This section contains ${itemsInSection.length} line item(s). Deleting it will also remove those items. Continue?`
      : 'Delete this section?';
    if (confirm(msg)) deleteSection(section.id);
  };

  const startEdit = (section: SectionConfig) => {
    setEditingId(section.id);
    setEditingName(section.name);
  };

  const saveEdit = (id: string) => {
    if (editingName.trim()) updateSection(id, { name: editingName.trim() });
    setEditingId(null);
  };

  const moveSection = (section: SectionConfig, direction: 'up' | 'down') => {
    const siblings = getSectionsForType(section.calculatorType as CalcType);
    const idx = siblings.findIndex((s) => s.id === section.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    updateSection(section.id, { order: other.order });
    updateSection(other.id, { order: section.order });
  };

  const renderSectionList = (type: CalcType) => {
    const sections = getSectionsForType(type);
    if (sections.length === 0) return (
      <p className="text-sm text-gray-400 text-center py-2">No sections yet.</p>
    );

    return (
      <div className="space-y-2">
        {sections.map((section, idx) => {
          const itemCount = settings.pricing.lineItems.filter((i) => i.category === section.id).length;
          const isEditing = editingId === section.id;

          return (
            <div key={section.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
              {/* Reorder arrows */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveSection(section, 'up')}
                  disabled={idx === 0}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none"
                  title="Move up"
                >▲</button>
                <button
                  onClick={() => moveSection(section, 'down')}
                  disabled={idx === sections.length - 1}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none"
                  title="Move down"
                >▼</button>
              </div>

              {/* Name (editable) */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(section.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                    className="w-full px-2 py-1 text-sm border border-primary-400 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{section.name}</span>
                    {section.isDefault && (
                      <span className="ml-2 text-xs text-gray-400">(default)</span>
                    )}
                    <span className="ml-2 text-xs text-gray-500">· {itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                {isEditing ? (
                  <>
                    <Button onClick={() => saveEdit(section.id)} variant="primary" size="sm">Save</Button>
                    <Button onClick={() => setEditingId(null)} variant="outline" size="sm">Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => startEdit(section)} variant="outline" size="sm">Edit</Button>
                    {!section.isDefault && (
                      <Button
                        onClick={() => handleDeleteSection(section)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >Delete</Button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Manage sections for all calculator types. Drag to reorder using the arrows.
        </p>
        <Button onClick={() => setShowAddForm(!showAddForm)} variant="primary">
          {showAddForm ? 'Cancel' : '+ Add Section'}
        </Button>
      </div>

      {/* Add New Section Form */}
      {showAddForm && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Add New Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Section Name"
              type="text"
              value={newSection.name}
              onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
              placeholder="e.g., Specialty Work"
            />
            <Select
              label="Calculator Type"
              value={newSection.calculatorType}
              onChange={(e) => setNewSection({ ...newSection, calculatorType: e.target.value as CalcType })}
            >
              <option value="interior-detailed">Interior Detailed</option>
              <option value="exterior-detailed">Exterior Detailed</option>
              <option value="simple-pricing">Simple Pricing</option>
            </Select>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowAddForm(false)} variant="outline">Cancel</Button>
              <Button onClick={handleAddSection} variant="primary">Add Section</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections by calculator type */}
      {(['interior-detailed', 'exterior-detailed', 'simple-pricing'] as CalcType[]).map((type) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle>{CALC_LABELS[type]} Sections</CardTitle>
          </CardHeader>
          <CardContent>
            {renderSectionList(type)}
          </CardContent>
        </Card>
      ))}

      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="py-3">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Default sections cannot be deleted, but their names can be edited. Only custom sections can be deleted.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
