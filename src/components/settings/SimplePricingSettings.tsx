import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { SectionConfig } from '../../types/settings.types';

export function SimplePricingSettings() {
  const { settings, updatePricing, updateSection } = useSettingsStore();
  const [formData, setFormData] = useState(settings.pricing);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const simpleSections = settings.pricing.sections
    .filter((s) => s.calculatorType === 'simple-pricing')
    .sort((a, b) => a.order - b.order);

  const moveSection = (section: SectionConfig, direction: 'up' | 'down') => {
    const idx = simpleSections.findIndex((s) => s.id === section.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= simpleSections.length) return;
    const other = simpleSections[swapIdx];
    updateSection(section.id, { order: other.order });
    updateSection(other.id, { order: section.order });
  };

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

      {/* Simple Pricing Sections */}
      {simpleSections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Simple Pricing Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {simpleSections.map((section, idx) => {
              const itemCount = settings.pricing.lineItems.filter((i) => i.category === section.id).length;
              const isEditing = editingId === section.id;
              return (
                <div key={section.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveSection(section, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs">▲</button>
                    <button onClick={() => moveSection(section, 'down')} disabled={idx === simpleSections.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs">▼</button>
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { updateSection(section.id, { name: editingName.trim() }); setEditingId(null); }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="w-full px-2 py-1 text-sm border border-primary-400 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <span className="font-medium text-gray-900 text-sm">{section.name}
                        <span className="ml-2 text-xs text-gray-500">· {itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {isEditing ? (
                      <>
                        <Button onClick={() => { updateSection(section.id, { name: editingName.trim() }); setEditingId(null); }} variant="primary" size="sm">Save</Button>
                        <Button onClick={() => setEditingId(null)} variant="outline" size="sm">Cancel</Button>
                      </>
                    ) : (
                      <Button onClick={() => { setEditingId(section.id); setEditingName(section.name); }} variant="outline" size="sm">Edit</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary">
          Save Simple Pricing Settings
        </Button>
      </div>
    </div>
  );
}
