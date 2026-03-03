import { useMemo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { CustomerInfoSection } from './shared/CustomerInfoSection';
import { MarkupSelector } from './shared/MarkupSelector';
import { useSettingsStore } from '../../store/settingsStore';
import type { InteriorSqftInputs, InteriorSqftOption, MarkupPercentage, HouseCondition } from '../../types/calculator.types';
import type { CustomerInfo, Bid } from '../../types/bid.types';
import { JobDurationEstimate } from '../results/JobDurationEstimate';
import {
  calculateInteriorSquareFootage,
  calculateInteriorSqftAutoMeasurements,
} from '../../core/calculators/interiorSquareFootage';

interface InteriorSqftFormData {
  customer: CustomerInfo;
  houseSquareFootage: number;
  markup: number;
  houseCondition: HouseCondition;
}

interface InteriorSquareFootageProps {
  onResultChange?: (result: any) => void;
  loadedBid?: Bid;
}

const ALL_OPTIONS: { value: InteriorSqftOption; label: string }[] = [
  { value: 'walls-only', label: 'Walls Only' },
  { value: 'trim-only', label: 'Trim Only' },
  { value: 'ceilings-only', label: 'Ceilings Only' },
  { value: 'complete', label: 'Complete' },
];

export function InteriorSquareFootage({ onResultChange, loadedBid }: InteriorSquareFootageProps) {
  const { settings } = useSettingsStore();
  const pricing = settings.pricing;

  const [selectedOptions, setSelectedOptions] = useState<InteriorSqftOption[]>(['complete']);
  const [customItemValues, setCustomItemValues] = useState<Record<string, number>>({});
  const [simpleModifiers, setSimpleModifiers] = useState<Record<string, boolean>>({});

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

  const { register, watch, reset } = useForm<InteriorSqftFormData>({
    defaultValues: {
      houseSquareFootage: 0,
      markup: 50,
      houseCondition: 'furnished',
    },
  });

  // Pre-fill form when loading a saved bid
  useEffect(() => {
    if (loadedBid && loadedBid.calculatorType === 'interior-sqft') {
      const inputs = loadedBid.inputs as InteriorSqftInputs & { pricingOption?: InteriorSqftOption };
      reset({
        customer: loadedBid.customer,
        houseSquareFootage: inputs.houseSquareFootage,
        markup: inputs.markup,
        houseCondition: inputs.houseCondition ?? 'furnished',
      });
      // Handle both old single-option and new multi-option format
      const opts = inputs.pricingOptions ?? (inputs.pricingOption ? [inputs.pricingOption] : ['complete']);
      setSelectedOptions(opts);
      setCustomItemValues(inputs.customItemValues ?? {});
    }
  }, [loadedBid, reset]);

  const handleOptionToggle = (option: InteriorSqftOption, checked: boolean) => {
    if (option === 'complete' && checked) {
      setSelectedOptions(['complete']);
    } else if (checked) {
      setSelectedOptions((prev) => [...prev.filter((o) => o !== 'complete'), option]);
    } else {
      setSelectedOptions((prev) => prev.filter((o) => o !== option));
    }
  };

  const houseSquareFootage = watch('houseSquareFootage');
  const markup = watch('markup');
  const customer = watch('customer');
  const houseCondition = watch('houseCondition');

  const rates = houseCondition === 'empty'
    ? (pricing.interiorSqftEmpty ?? pricing.interiorSqft)
    : pricing.interiorSqft;

  const rateMap: Record<InteriorSqftOption, number> = {
    'walls-only': rates.wallsOnly,
    'trim-only': rates.trimOnly,
    'ceilings-only': rates.ceilingsOnly,
    'complete': rates.complete,
  };

  const result = useMemo(() => {
    if (!houseSquareFootage || houseSquareFootage <= 0 || selectedOptions.length === 0) return null;

    const inputs: InteriorSqftInputs = {
      houseSquareFootage,
      pricingOptions: selectedOptions,
      markup: markup as MarkupPercentage,
      houseCondition,
      customItemValues,
    };

    const calculatedResult = calculateInteriorSquareFootage({ ...inputs, simpleModifiers }, pricing);

    if (onResultChange) {
      onResultChange({ customer, inputs: { ...inputs, simpleModifiers }, result: calculatedResult });
    }

    return calculatedResult;
  }, [houseSquareFootage, selectedOptions, markup, houseCondition, customItemValues, simpleModifiers, customer, onResultChange, pricing]);

  const autoCalcs = useMemo(() => {
    if (!houseSquareFootage || houseSquareFootage <= 0) return null;
    return calculateInteriorSqftAutoMeasurements(houseSquareFootage, pricing);
  }, [houseSquareFootage, pricing]);

  const gallonEstimate = useMemo(() => {
    if (!autoCalcs) return null;
    const wallGallons = autoCalcs.wallSqft / pricing.interiorCoverage.wallSqftPerGallon;
    const ceilingGallons = autoCalcs.ceilingSqft / pricing.interiorCoverage.ceilingSqftPerGallon;
    const trimGallons = autoCalcs.trimLF / pricing.interiorCoverage.trimLfPerGallon;
    return { wallGallons, ceilingGallons, trimGallons, total: wallGallons + ceilingGallons + trimGallons };
  }, [autoCalcs, pricing]);

  const laborPct = pricing.sqftLaborPct ?? 85;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>House Condition</CardTitle>
        </CardHeader>
        <CardContent>
          <Select label="Is the house empty or furnished?" {...register('houseCondition')}>
            <option value="furnished">Furnished</option>
            <option value="empty">Empty</option>
          </Select>
        </CardContent>
      </Card>

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
          <p className="text-xs text-gray-500 mb-2">Select one or more options. "Complete" is exclusive.</p>
          {ALL_OPTIONS.map(({ value, label }) => {
            const checked = selectedOptions.includes(value);
            const disabled = value !== 'complete' && selectedOptions.includes('complete');
            return (
              <label
                key={value}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  checked ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => handleOptionToggle(value, e.target.checked)}
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 flex-1">
                  {label}
                </span>
                <span className="text-sm text-gray-500">${rateMap[value].toFixed(2)}/sqft</span>
              </label>
            );
          })}
        </CardContent>
      </Card>

      <MarkupSelector register={register} />

      {pricing.simpleInteriorModifiers && pricing.simpleInteriorModifiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Modifiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pricing.simpleInteriorModifiers
              .sort((a, b) => a.order - b.order)
              .map((mod) => (
                <label
                  key={mod.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    simpleModifiers[mod.id] ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={simpleModifiers[mod.id] ?? false}
                    onChange={(e) => setSimpleModifiers((prev) => ({ ...prev, [mod.id]: e.target.checked }))}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700 flex-1">{mod.name}</span>
                  <span className="text-sm text-gray-500">×{mod.multiplier.toFixed(2)}</span>
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
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Wall Paint</div>
              <div className="text-xl font-bold text-yellow-700">{gallonEstimate.wallGallons.toFixed(1)} gal</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Ceiling Paint</div>
              <div className="text-xl font-bold text-yellow-700">{gallonEstimate.ceilingGallons.toFixed(1)} gal</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Trim Paint</div>
              <div className="text-xl font-bold text-yellow-700">{gallonEstimate.trimGallons.toFixed(1)} gal</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Total</div>
              <div className="text-xl font-bold text-yellow-800">{gallonEstimate.total.toFixed(1)} gal</div>
            </div>
          </CardContent>
        </Card>
      )}

      {autoCalcs && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Auto-Calculated Measurements</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Wall Sq Ft</div>
              <div className="text-xl font-bold text-blue-700">{autoCalcs.wallSqft.toFixed(0)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Ceiling Sq Ft</div>
              <div className="text-xl font-bold text-blue-700">{autoCalcs.ceilingSqft.toFixed(0)}</div>
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
