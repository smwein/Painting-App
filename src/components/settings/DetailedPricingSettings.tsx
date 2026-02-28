import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

export function DetailedPricingSettings() {
  const { settings, updatePricing } = useSettingsStore();
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

  // Group line items by calculator type and section
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

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Edit pricing rates for detailed calculator line items. Changes apply to all new bids.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interior Detailed */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Interior Detailed</h3>

          {interiorSections.map((section) => {
            const items = getItemsForSection(section.id);
            if (items.length === 0) return null;

            return (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle>{section.name}</CardTitle>
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
          })}
        </div>

        {/* Exterior Detailed */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Exterior Detailed</h3>

          {exteriorSections.map((section) => {
            const items = getItemsForSection(section.id);
            if (items.length === 0) return null;

            return (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle>{section.name}</CardTitle>
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
          })}
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
