import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

export function JobEstimationSettings() {
  const { settings, updatePricing } = useSettingsStore();
  const [crewRates, setCrewRates] = useState(settings.pricing.crewRates);
  const [markupOptions, setMarkupOptions] = useState(settings.pricing.markupOptions);
  const [formulaText, setFormulaText] = useState(
    settings.pricing.jobDurationFormulaText ?? 'Estimated Days = Labor Cost ÷ Daily Rate'
  );
  const [exampleText, setExampleText] = useState(
    settings.pricing.jobDurationExampleText ??
      'For example, if labor cost is $3,000 and you select a 2-person crew ($1,000/day), the estimated duration is 3 days.'
  );

  const handleCrewRateChange = (crewSize: 2 | 3 | 4, newRate: number) => {
    setCrewRates((prev) =>
      prev.map((crew) => (crew.crewSize === crewSize ? { ...crew, dailyRate: newRate } : crew))
    );
  };

  const handleCrewDescriptionChange = (crewSize: 2 | 3 | 4, description: string) => {
    setCrewRates((prev) =>
      prev.map((crew) => (crew.crewSize === crewSize ? { ...crew, description } : crew))
    );
  };

  const handleMarkupOptionsChange = (value: string) => {
    const options = value
      .split(',')
      .map((v) => parseFloat(v.trim()))
      .filter((v) => !isNaN(v) && v > 0);
    setMarkupOptions(options);
  };

  const handleSave = () => {
    updatePricing({
      crewRates,
      markupOptions,
      jobDurationFormulaText: formulaText,
      jobDurationExampleText: exampleText,
    });
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
            {[
              { crew: crew2, size: 2 as const },
              { crew: crew3, size: 3 as const },
              { crew: crew4, size: 4 as const },
            ].map(({ crew, size }) => (
              <div key={size} className="space-y-2">
                <Input
                  label={`${size}-Person Crew ($/day)`}
                  type="number"
                  min="0"
                  step="50"
                  value={crew?.dailyRate ?? 0}
                  onChange={(e) => handleCrewRateChange(size, parseFloat(e.target.value))}
                />
                <input
                  type="text"
                  value={crew?.description ?? ''}
                  onChange={(e) => handleCrewDescriptionChange(size, e.target.value)}
                  placeholder={`e.g. Default: $${(crew?.dailyRate ?? 0).toLocaleString()}/day`}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-600"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <h4 className="text-sm font-medium text-blue-900">How Job Duration is Calculated</h4>
            <input
              type="text"
              value={formulaText}
              onChange={(e) => setFormulaText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-blue-800"
            />
            <textarea
              value={exampleText}
              onChange={(e) => setExampleText(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-blue-700 resize-none"
            />
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
