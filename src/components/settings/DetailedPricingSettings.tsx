import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

export function DetailedPricingSettings() {
  const { settings, updatePricing, updateSection } = useSettingsStore();
  const [lineItems, setLineItems] = useState(settings.pricing.lineItems);

  const handleRateChange = (id: string, newRate: number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, rate: newRate } : item))
    );
  };

  const handleSave = () => {
    updatePricing({ lineItems });
    alert('Detailed pricing settings saved successfully!');
  };

  const moveSection = (
    sectionId: string,
    currentOrder: number,
    calcType: string,
    direction: 'up' | 'down'
  ) => {
    const siblings = settings.pricing.sections
      .filter((s) => s.calculatorType === calcType)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((s) => s.id === sectionId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    updateSection(sectionId, { order: other.order });
    updateSection(other.id, { order: currentOrder });
  };

  const interiorSections = settings.pricing.sections
    .filter((s) => s.calculatorType === 'interior-detailed')
    .sort((a, b) => a.order - b.order);

  const exteriorSections = settings.pricing.sections
    .filter((s) => s.calculatorType === 'exterior-detailed')
    .sort((a, b) => a.order - b.order);

  const getItemsForSection = (sectionId: string) => {
    return lineItems
      .filter((item) => item.category === sectionId)
      .sort((a, b) => a.order - b.order);
  };

  const renderSections = (sections: typeof interiorSections) =>
    sections.map((section, idx) => {
      const items = getItemsForSection(section.id);
      if (items.length === 0) return null;

      return (
        <Card key={section.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{section.name}</CardTitle>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Reorder */}
                <div className="flex gap-1">
                  <button
                    onClick={() => moveSection(section.id, section.order, section.calculatorType, 'up')}
                    disabled={idx === 0}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs px-1"
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => moveSection(section.id, section.order, section.calculatorType, 'down')}
                    disabled={idx === sections.length - 1}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs px-1"
                    title="Move down"
                  >▼</button>
                </div>
                {/* Default collapsed toggle */}
                <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={section.defaultCollapsed ?? false}
                    onChange={(e) => updateSection(section.id, { defaultCollapsed: e.target.checked })}
                    className="rounded"
                  />
                  Start collapsed
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <Input
                key={item.id}
                label={`${item.name} (per ${item.unit})`}
                type="number"
                min="0"
                step={item.unit === 'sqft' || item.unit === 'lf' ? '0.01' : '1'}
                value={item.rate}
                onChange={(e) => handleRateChange(item.id, parseFloat(e.target.value))}
              />
            ))}
          </CardContent>
        </Card>
      );
    });

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Edit pricing rates, reorder sections, and set which sections start collapsed on the calculator page.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Interior Detailed</h3>
          {renderSections(interiorSections)}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Exterior Detailed</h3>
          {renderSections(exteriorSections)}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary">
          Save Detailed Pricing Settings
        </Button>
      </div>
    </div>
  );
}
