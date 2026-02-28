import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { SectionConfig } from '../../types/settings.types';

export function CustomSectionsManager() {
  const { settings, addSection, deleteSection } = useSettingsStore();
  const [showAddForm, setShowAddForm] = useState(false);

  const [newSection, setNewSection] = useState<Omit<SectionConfig, 'id' | 'order' | 'isDefault'>>({
    name: '',
    calculatorType: 'interior-detailed',
  });

  const customSections = settings.pricing.sections.filter((section) => !section.isDefault);

  const handleAddSection = () => {
    if (!newSection.name) {
      alert('Please enter a section name');
      return;
    }

    addSection({ ...newSection, isDefault: false });
    setNewSection({ name: '', calculatorType: 'interior-detailed' });
    setShowAddForm(false);
    alert('Custom section added successfully!');
  };

  const handleDeleteSection = (id: string) => {
    const itemsInSection = settings.pricing.lineItems.filter((item) => item.category === id);

    if (itemsInSection.length > 0) {
      const confirmMsg = `This section contains ${itemsInSection.length} line item(s). Deleting the section will also remove these items. Are you sure?`;
      if (!confirm(confirmMsg)) {
        return;
      }
    } else {
      if (!confirm('Are you sure you want to delete this custom section?')) {
        return;
      }
    }

    deleteSection(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Add custom sections to organize line items in the detailed calculators.
        </p>
        <Button onClick={() => setShowAddForm(!showAddForm)} variant="primary">
          {showAddForm ? 'Cancel' : 'Add Custom Section'}
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
              onChange={(e) =>
                setNewSection({ ...newSection, calculatorType: e.target.value as any })
              }
            >
              <option value="interior-detailed">Interior Detailed</option>
              <option value="exterior-detailed">Exterior Detailed</option>
            </Select>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowAddForm(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleAddSection} variant="primary">
                Add Section
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Sections List */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Sections ({customSections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customSections.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No custom sections yet. Click "Add Custom Section" to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {customSections.map((section) => {
                const itemsInSection = settings.pricing.lineItems.filter(
                  (item) => item.category === section.id
                );

                return (
                  <div
                    key={section.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{section.name}</h4>
                        <p className="text-sm text-gray-600">
                          {section.calculatorType === 'interior-detailed' ? 'Interior' : 'Exterior'} Detailed •{' '}
                          {itemsInSection.length} line item{itemsInSection.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDeleteSection(section.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {itemsInSection.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2">Line Items:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {itemsInSection.map((item) => (
                            <li key={item.id}>
                              • {item.name} (${item.rate}/{item.unit})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="py-3">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Default sections cannot be deleted. You can only delete custom sections
            that you've created.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
