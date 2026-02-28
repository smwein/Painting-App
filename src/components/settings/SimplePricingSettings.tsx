import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

export function SimplePricingSettings() {
  const { settings, updatePricing } = useSettingsStore();
  const [formData, setFormData] = useState(settings.pricing);

  const handleNumberChange = (path: string, value: number) => {
    const keys = path.split('.');
    setFormData((prev) => {
      const updated = { ...prev };
      let current: any = updated;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleSave = () => {
    updatePricing(formData);
    alert('Simple pricing settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Interior Square Footage Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Interior Square Footage Pricing (per sq ft)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Walls Only"
            type="number"
            min="0"
            step="0.01"
            value={formData.interiorSqft.wallsOnly}
            onChange={(e) => handleNumberChange('interiorSqft.wallsOnly', parseFloat(e.target.value))}
          />
          <Input
            label="Trim Only"
            type="number"
            min="0"
            step="0.01"
            value={formData.interiorSqft.trimOnly}
            onChange={(e) => handleNumberChange('interiorSqft.trimOnly', parseFloat(e.target.value))}
          />
          <Input
            label="Ceilings Only"
            type="number"
            min="0"
            step="0.01"
            value={formData.interiorSqft.ceilingsOnly}
            onChange={(e) => handleNumberChange('interiorSqft.ceilingsOnly', parseFloat(e.target.value))}
          />
          <Input
            label="Complete Interior"
            type="number"
            min="0"
            step="0.01"
            value={formData.interiorSqft.complete}
            onChange={(e) => handleNumberChange('interiorSqft.complete', parseFloat(e.target.value))}
          />
        </CardContent>
      </Card>

      {/* Exterior Square Footage Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Exterior Square Footage Pricing (per sq ft)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Exterior"
            type="number"
            min="0"
            step="0.01"
            value={formData.exteriorSqft.fullExterior}
            onChange={(e) => handleNumberChange('exteriorSqft.fullExterior', parseFloat(e.target.value))}
          />
          <Input
            label="Trim Only"
            type="number"
            min="0"
            step="0.01"
            value={formData.exteriorSqft.trimOnly}
            onChange={(e) => handleNumberChange('exteriorSqft.trimOnly', parseFloat(e.target.value))}
          />
        </CardContent>
      </Card>

      {/* Interior Paint Prices */}
      <Card>
        <CardHeader>
          <CardTitle>Interior Paint Prices (per gallon)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Input
            label="ProMar"
            type="number"
            min="0"
            step="1"
            value={formData.interiorPaint.ProMar}
            onChange={(e) => handleNumberChange('interiorPaint.ProMar', parseFloat(e.target.value))}
          />
          <Input
            label="SuperPaint"
            type="number"
            min="0"
            step="1"
            value={formData.interiorPaint.SuperPaint}
            onChange={(e) => handleNumberChange('interiorPaint.SuperPaint', parseFloat(e.target.value))}
          />
          <Input
            label="Duration"
            type="number"
            min="0"
            step="1"
            value={formData.interiorPaint.Duration}
            onChange={(e) => handleNumberChange('interiorPaint.Duration', parseFloat(e.target.value))}
          />
          <Input
            label="Emerald"
            type="number"
            min="0"
            step="1"
            value={formData.interiorPaint.Emerald}
            onChange={(e) => handleNumberChange('interiorPaint.Emerald', parseFloat(e.target.value))}
          />
        </CardContent>
      </Card>

      {/* Exterior Paint Prices */}
      <Card>
        <CardHeader>
          <CardTitle>Exterior Paint Prices (per gallon)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="SuperPaint"
            type="number"
            min="0"
            step="1"
            value={formData.exteriorPaint.SuperPaint}
            onChange={(e) => handleNumberChange('exteriorPaint.SuperPaint', parseFloat(e.target.value))}
          />
          <Input
            label="Duration"
            type="number"
            min="0"
            step="1"
            value={formData.exteriorPaint.Duration}
            onChange={(e) => handleNumberChange('exteriorPaint.Duration', parseFloat(e.target.value))}
          />
          <Input
            label="Emerald"
            type="number"
            min="0"
            step="1"
            value={formData.exteriorPaint.Emerald}
            onChange={(e) => handleNumberChange('exteriorPaint.Emerald', parseFloat(e.target.value))}
          />
        </CardContent>
      </Card>

      {/* Interior Coverage Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Interior Paint Coverage Rates</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Wall Sq Ft per Gallon"
            type="number"
            min="0"
            step="1"
            value={formData.interiorCoverage.wallSqftPerGallon}
            onChange={(e) => handleNumberChange('interiorCoverage.wallSqftPerGallon', parseFloat(e.target.value))}
          />
          <Input
            label="Ceiling Sq Ft per Gallon"
            type="number"
            min="0"
            step="1"
            value={formData.interiorCoverage.ceilingSqftPerGallon}
            onChange={(e) => handleNumberChange('interiorCoverage.ceilingSqftPerGallon', parseFloat(e.target.value))}
          />
          <Input
            label="Trim LF per Gallon"
            type="number"
            min="0"
            step="1"
            value={formData.interiorCoverage.trimLfPerGallon}
            onChange={(e) => handleNumberChange('interiorCoverage.trimLfPerGallon', parseFloat(e.target.value))}
          />
          <Input
            label="Cabinet Gallons per Door"
            type="number"
            min="0"
            step="0.01"
            value={formData.interiorCoverage.cabinetGallonsPerDoor}
            onChange={(e) => handleNumberChange('interiorCoverage.cabinetGallonsPerDoor', parseFloat(e.target.value))}
          />
        </CardContent>
      </Card>

      {/* Exterior Coverage Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Exterior Paint Coverage Rates</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Wall Sq Ft per Gallon"
            type="number"
            min="0"
            step="1"
            value={formData.exteriorCoverage.wallSqftPerGallon}
            onChange={(e) => handleNumberChange('exteriorCoverage.wallSqftPerGallon', parseFloat(e.target.value))}
          />
          <Input
            label="Trim LF per Gallon"
            type="number"
            min="0"
            step="1"
            value={formData.exteriorCoverage.trimLfPerGallon}
            onChange={(e) => handleNumberChange('exteriorCoverage.trimLfPerGallon', parseFloat(e.target.value))}
          />
          <Input
            label="Door Gallons per Door"
            type="number"
            min="0"
            step="0.01"
            value={formData.exteriorCoverage.doorGallonsPerDoor}
            onChange={(e) => handleNumberChange('exteriorCoverage.doorGallonsPerDoor', parseFloat(e.target.value))}
          />
        </CardContent>
      </Card>

      {/* Auto-Calc Multipliers */}
      <Card>
        <CardHeader>
          <CardTitle>Interior Auto-Calculation Multipliers</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Wall Multiplier"
            type="number"
            min="0"
            step="0.1"
            value={formData.interiorMultipliers.wall}
            onChange={(e) => handleNumberChange('interiorMultipliers.wall', parseFloat(e.target.value))}
            helperText="House SF × this = Wall SF"
          />
          <Input
            label="Ceiling Multiplier"
            type="number"
            min="0"
            step="0.1"
            value={formData.interiorMultipliers.ceiling}
            onChange={(e) => handleNumberChange('interiorMultipliers.ceiling', parseFloat(e.target.value))}
            helperText="House SF × this = Ceiling SF"
          />
          <Input
            label="Trim Multiplier"
            type="number"
            min="0"
            step="0.01"
            value={formData.interiorMultipliers.trim}
            onChange={(e) => handleNumberChange('interiorMultipliers.trim', parseFloat(e.target.value))}
            helperText="House SF × this = Trim LF"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exterior Auto-Calculation Multipliers</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Siding Multiplier"
            type="number"
            min="0"
            step="0.1"
            value={formData.exteriorMultipliers.siding}
            onChange={(e) => handleNumberChange('exteriorMultipliers.siding', parseFloat(e.target.value))}
            helperText="House SF × this = Siding SF"
          />
          <Input
            label="Trim Multiplier"
            type="number"
            min="0"
            step="0.01"
            value={formData.exteriorMultipliers.trim}
            onChange={(e) => handleNumberChange('exteriorMultipliers.trim', parseFloat(e.target.value))}
            helperText="House SF × this = Trim LF"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary">
          Save Simple Pricing Settings
        </Button>
      </div>
    </div>
  );
}
