import { useMemo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { CustomerInfoSection } from './shared/CustomerInfoSection';
import { MarkupSelector } from './shared/MarkupSelector';
import { PaintTypeSelector } from './shared/PaintTypeSelector';
import { useSettingsStore } from '../../store/settingsStore';
import type { ExteriorSqftInputs, ExteriorPaintType, MarkupPercentage } from '../../types/calculator.types';
import type { CustomerInfo, Bid } from '../../types/bid.types';
import { JobDurationEstimate } from '../results/JobDurationEstimate';
import {
  calculateExteriorSquareFootage,
  calculateExteriorSqftAutoMeasurements,
} from '../../core/calculators/exteriorSquareFootage';

interface ExteriorSqftFormData {
  customer: CustomerInfo;
  houseSquareFootage: number;
  markup: number;
  paintType: string;
  houseMaterial: string;
}

interface ExteriorSquareFootageProps {
  onResultChange?: (result: any) => void;
  loadedBid?: Bid;
}

const BUILT_IN_OPTIONS: { value: string; label: string }[] = [
  { value: 'full-exterior', label: 'Full Exterior' },
  { value: 'trim-only', label: 'Trim Only' },
];

export function ExteriorSquareFootage({ onResultChange, loadedBid }: ExteriorSquareFootageProps) {
  const { settings } = useSettingsStore();
  const pricing = settings.pricing;

  const [selectedOptions, setSelectedOptions] = useState<string[]>(['full-exterior']);
  const [customItemValues, setCustomItemValues] = useState<Record<string, number>>({});
  const [exteriorModifiers, setExteriorModifiers] = useState<Record<string, boolean>>({});

  const rateMap: Record<string, number> = {
    'full-exterior': pricing.exteriorSqft.fullExterior,
    'trim-only': pricing.exteriorSqft.trimOnly,
  };

  // Custom sqft line items for pricing options
  const customSqftItems = useMemo(() =>
    pricing.lineItems
      .filter((li) => li.category === 'ext-sqft-pricing')
      .sort((a, b) => a.order - b.order),
    [pricing.lineItems]
  );

  const allOptions = useMemo(() => {
    const builtIn = BUILT_IN_OPTIONS.map(({ value, label }) => ({
      value,
      label,
      rate: rateMap[value] ?? 0,
    }));
    const custom = customSqftItems.map((item) => ({
      value: item.id,
      label: item.name,
      rate: item.rate,
    }));
    return [...builtIn, ...custom];
  }, [customSqftItems, pricing.exteriorSqft.fullExterior, pricing.exteriorSqft.trimOnly]);

  // Custom simple-pricing sections with their line items
  const customSections = useMemo(() => {
    return pricing.sections
      .filter((s) => s.calculatorType === 'simple-pricing')
      .map((s) => ({
        section: s,
        items: pricing.lineItems.filter((li) => li.category === s.id).sort((a, b) => a.order - b.order),
      }))
      .filter((s) => s.items.length > 0)
      .sort((a, b) => a.section.order - b.section.order);
  }, [pricing.sections, pricing.lineItems]);

  const defaultPaintType = Object.keys(pricing.exteriorPaint)[0] ?? '';
  const { register, watch, reset } = useForm<ExteriorSqftFormData>({
    defaultValues: {
      houseSquareFootage: 0,
      markup: 50,
      paintType: defaultPaintType,
      houseMaterial: '',
    },
  });

  // Pre-fill form when loading a saved bid
  useEffect(() => {
    if (loadedBid && loadedBid.calculatorType === 'exterior-sqft') {
      const inputs = loadedBid.inputs as ExteriorSqftInputs & { pricingOption?: string };
      reset({
        customer: loadedBid.customer,
        houseSquareFootage: inputs.houseSquareFootage,
        markup: inputs.markup,
        paintType: inputs.paintType ?? defaultPaintType,
        houseMaterial: inputs.houseMaterial ?? '',
      });
      const opts = inputs.pricingOptions ?? (inputs.pricingOption ? [inputs.pricingOption] : ['full-exterior']);
      setSelectedOptions(opts);
      setCustomItemValues(inputs.customItemValues ?? {});
    }
  }, [loadedBid, reset]);

  const handleOptionToggle = (option: string, checked: boolean) => {
    if (checked) {
      if (option === 'full-exterior') {
        // Full Exterior selected: uncheck everything else
        setSelectedOptions(['full-exterior']);
      } else {
        // Non-full-exterior selected: remove full-exterior, add this one
        setSelectedOptions((prev) => [...prev.filter((o) => o !== option && o !== 'full-exterior'), option]);
      }
    } else {
      setSelectedOptions((prev) => prev.filter((o) => o !== option));
    }
  };

  const houseSquareFootage = watch('houseSquareFootage');
  const markup = watch('markup');
  const customer = watch('customer');
  const paintType = watch('paintType');
  const houseMaterial = watch('houseMaterial');

  const result = useMemo(() => {
    if (!houseSquareFootage || houseSquareFootage <= 0 || selectedOptions.length === 0) return null;

    const inputs: ExteriorSqftInputs = {
      houseSquareFootage,
      pricingOptions: selectedOptions,
      markup: markup as MarkupPercentage,
      paintType: paintType as ExteriorPaintType,
      houseMaterial: houseMaterial || undefined,
      customItemValues,
    };

    const calculatedResult = calculateExteriorSquareFootage({ ...inputs, exteriorModifiers }, pricing);

    if (onResultChange) {
      onResultChange({ customer, inputs: { ...inputs, exteriorModifiers }, result: calculatedResult });
    }

    return calculatedResult;
  }, [houseSquareFootage, selectedOptions, markup, paintType, houseMaterial, customItemValues, exteriorModifiers, customer, onResultChange, pricing]);

  const autoCalcs = useMemo(() => {
    if (!houseSquareFootage || houseSquareFootage <= 0) return null;
    return calculateExteriorSqftAutoMeasurements(houseSquareFootage, pricing);
  }, [houseSquareFootage, pricing]);

  const gallonEstimate = useMemo(() => {
    if (!autoCalcs) return null;
    const wallGallons = Math.ceil(autoCalcs.sidingSqft / pricing.exteriorCoverage.wallSqftPerGallon);
    const trimGallons = Math.ceil(autoCalcs.trimLF / pricing.exteriorCoverage.trimLfPerGallon);
    return { wallGallons, trimGallons, total: wallGallons + trimGallons };
  }, [autoCalcs, pricing]);

  const laborPct = pricing.sqftLaborPct ?? 85;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>House Square Footage</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            label="Square Footage"
            type="number" min="0" step="1" placeholder="2000"
            {...register('houseSquareFootage', { required: true, valueAsNumber: true, min: 0 })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-gray-500 mb-2">Select one or more options. Full Exterior is exclusive.</p>
          {allOptions.map(({ value, label, rate }) => {
            const checked = selectedOptions.includes(value);
            const isFullExterior = value === 'full-exterior';
            const fullExteriorSelected = selectedOptions.includes('full-exterior');
            const disabled = !isFullExterior && fullExteriorSelected;
            return (
              <label
                key={value}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  disabled ? 'opacity-50 cursor-not-allowed' :
                  checked ? 'bg-primary-50 border border-primary-200 cursor-pointer' : 'hover:bg-gray-50 border border-transparent cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => handleOptionToggle(value, e.target.checked)}
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 flex-1">{label}</span>
                <span className="text-sm text-gray-500">${rate.toFixed(2)}/sqft</span>
              </label>
            );
          })}
        </CardContent>
      </Card>

      <PaintTypeSelector register={register} isExterior fieldName="paintType" />

      <MarkupSelector register={register} />

      {pricing.exteriorModifiers && pricing.exteriorModifiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Modifiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pricing.exteriorModifiers
              .sort((a, b) => a.order - b.order)
              .map((mod) => (
                <label
                  key={mod.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    exteriorModifiers[mod.id] ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={exteriorModifiers[mod.id] ?? false}
                    onChange={(e) => setExteriorModifiers((prev) => ({ ...prev, [mod.id]: e.target.checked }))}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700 flex-1">{mod.name}</span>
                  <span className="text-sm text-gray-500">{'\u00d7'}{mod.multiplier.toFixed(2)}</span>
                </label>
              ))}
          </CardContent>
        </Card>
      )}

      {customSections.map(({ section, items }) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <Input
                key={item.id}
                label={`${item.name} (${item.unit === 'each' ? 'qty' : item.unit} × $${item.rate.toFixed(2)})`}
                type="number" min="0" step="1"
                value={customItemValues[item.id] ?? ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCustomItemValues((prev) => ({ ...prev, [item.id]: isNaN(val) ? 0 : val }));
                }}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {result && (
        <>
          <JobDurationEstimate laborCost={result.labor} pricing={pricing} />
          <Card className="bg-primary-50 border-primary-200">
            <CardHeader>
              <CardTitle>Bid Total</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Labor Cost</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">({laborPct}%)</span>
                  <span className="text-lg font-semibold text-gray-800">${result.labor.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Materials</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">({100 - laborPct}%)</span>
                  <span className="text-lg font-semibold text-gray-800">${result.materials.totalCost.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Gross Profit</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 font-medium">({markup}%)</span>
                  <span className="text-lg font-semibold text-green-700">${result.profit.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-primary-200 pt-3 flex justify-between items-center">
                <span className="text-base font-semibold text-gray-700">Retail Total</span>
                <span className="text-3xl font-bold text-primary-700">${result.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {gallonEstimate && gallonEstimate.total > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle>Estimated Paint</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Siding Paint</div>
              <div className="text-xl font-bold text-yellow-700">{gallonEstimate.wallGallons} gal</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Trim Paint</div>
              <div className="text-xl font-bold text-yellow-700">{gallonEstimate.trimGallons} gal</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Total</div>
              <div className="text-xl font-bold text-yellow-800">{gallonEstimate.total} gal</div>
            </div>
          </CardContent>
        </Card>
      )}

      {autoCalcs && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Auto-Calculated Measurements</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Siding Sq Ft</div>
              <div className="text-xl font-bold text-blue-700">{autoCalcs.sidingSqft.toFixed(0)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Trim LF</div>
              <div className="text-xl font-bold text-blue-700">{autoCalcs.trimLF.toFixed(0)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <CustomerInfoSection register={register} />
    </div>
  );
}
