import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

export function JobEstimationSettings() {
  const { settings, updatePricing } = useSettingsStore();
  const [crewRates, setCrewRates] = useState(settings.pricing.crewRates);
  const [markupOptions, setMarkupOptions] = useState(settings.pricing.markupOptions);

  const handleCrewRateChange = (crewSize: 2 | 3 | 4, newRate: number) => {
    setCrewRates((prev) =>
      prev.map((crew) => (crew.crewSize === crewSize ? { ...crew, dailyRate: newRate } : crew))
    );
  };

  const handleMarkupOptionsChange = (value: string) => {
    // Parse comma-separated values
    const options = value
      .split(',')
      .map((v) => parseFloat(v.trim()))
      .filter((v) => !isNaN(v) && v > 0);

    setMarkupOptions(options);
  };

  const handleSave = () => {
    updatePricing({ crewRates, markupOptions });
    alert('Job estimation settings saved successfully!');
  };

  const crew2 = crewRates.find((c) => c.crewSize === 2);
  const crew3 = crewRates.find((c) => c.crewSize === 3);
  const crew4 = crewRates.find((c) => c.crewSize === 4);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crew Production Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Configure daily production rates for different crew sizes. These rates are used to estimate
            job duration based on labor costs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="2-Person Crew ($/day)"
              type="number"
              min="0"
              step="50"
              value={crew2?.dailyRate || 1000}
              onChange={(e) => handleCrewRateChange(2, parseFloat(e.target.value))}
              helperText="Default: $1,000/day"
            />
            <Input
              label="3-Person Crew ($/day)"
              type="number"
              min="0"
              step="50"
              value={crew3?.dailyRate || 1500}
              onChange={(e) => handleCrewRateChange(3, parseFloat(e.target.value))}
              helperText="Default: $1,500/day"
            />
            <Input
              label="4-Person Crew ($/day)"
              type="number"
              min="0"
              step="50"
              value={crew4?.dailyRate || 2000}
              onChange={(e) => handleCrewRateChange(4, parseFloat(e.target.value))}
              helperText="Default: $2,000/day"
            />
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">How Job Duration is Calculated</h4>
            <p className="text-sm text-blue-800">
              Estimated Days = Labor Cost ÷ Daily Rate
            </p>
            <p className="text-xs text-blue-700 mt-2">
              For example, if labor cost is $3,000 and you select a 2-person crew ($1,000/day), the estimated
              duration is 3 days.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Markup Percentage Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Configure which markup percentages appear in calculator dropdowns (comma-separated).
          </p>

          <Input
            label="Markup Options (%)"
            type="text"
            value={markupOptions.join(', ')}
            onChange={(e) => handleMarkupOptionsChange(e.target.value)}
            helperText="Default: 35, 40, 45, 50, 55, 60"
            placeholder="35, 40, 45, 50, 55, 60"
          />

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">Preview:</p>
            <div className="flex flex-wrap gap-2">
              {markupOptions.sort((a, b) => a - b).map((option) => (
                <span
                  key={option}
                  className="px-3 py-1 bg-white border border-gray-300 rounded text-sm"
                >
                  {option}%
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary">
          Save Job Estimation Settings
        </Button>
      </div>
    </div>
  );
}
