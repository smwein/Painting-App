import { useMemo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { CustomerInfoSection } from './shared/CustomerInfoSection';
import { MarkupSelector } from './shared/MarkupSelector';
import { useSettingsStore } from '../../store/settingsStore';
import type { ExteriorSqftInputs, ExteriorSqftOption, MarkupPercentage } from '../../types/calculator.types';
import type { CustomerInfo, Bid } from '../../types/bid.types';
import { JobDurationEstimate } from '../results/JobDurationEstimate';
import {
  calculateExteriorSquareFootage,
  calculateExteriorSqftAutoMeasurements,
} from '../../core/calculators/exteriorSquareFootage';

interface ExteriorSqftFormData {
  customer: CustomerInfo;
  houseSquareFootage: number;
  pricingOption: ExteriorSqftOption;
  markup: number;
}

interface ExteriorSquareFootageProps {
  onResultChange?: (result: any) => void;
  loadedBid?: Bid;
}

export function ExteriorSquareFootage({ onResultChange, loadedBid }: ExteriorSquareFootageProps) {
  const { settings } = useSettingsStore();
  const pricing = settings.pricing;

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

  const [customItemValues, setCustomItemValues] = useState<Record<string, number>>({});

  const { register, watch, reset } = useForm<ExteriorSqftFormData>({
    defaultValues: {
      houseSquareFootage: 0,
      pricingOption: 'full-exterior',
      markup: 50,
    },
  });

  // Pre-fill form when loading a saved bid
  useEffect(() => {
    if (loadedBid && loadedBid.calculatorType === 'exterior-sqft') {
      const inputs = loadedBid.inputs as ExteriorSqftInputs;
      reset({
        customer: loadedBid.customer,
        houseSquareFootage: inputs.houseSquareFootage,
        pricingOption: inputs.pricingOption,
        markup: inputs.markup,
      });
      setCustomItemValues(inputs.customItemValues ?? {});
    }
  }, [loadedBid, reset]);

  // Watch only the specific fields needed for calculation
  const houseSquareFootage = watch('houseSquareFootage');
  const pricingOption = watch('pricingOption');
  const markup = watch('markup');
  const customer = watch('customer');

  // Real-time calculation
  const result = useMemo(() => {
    if (!houseSquareFootage || houseSquareFootage <= 0) {
      return null;
    }

    const inputs: ExteriorSqftInputs = {
      houseSquareFootage,
      pricingOption,
      markup: markup as MarkupPercentage,
      customItemValues,
    };

    const calculatedResult = calculateExteriorSquareFootage(inputs, pricing);

    if (onResultChange) {
      onResultChange({
        customer,
        inputs,
        result: calculatedResult,
      });
    }

    return calculatedResult;
  }, [houseSquareFootage, pricingOption, markup, customItemValues, customer, onResultChange, pricing]);

  const autoCalcs = useMemo(() => {
    if (!houseSquareFootage || houseSquareFootage <= 0) {
      return null;
    }
    return calculateExteriorSqftAutoMeasurements(houseSquareFootage, pricing);
  }, [houseSquareFootage, pricing]);

  // Estimate gallons from auto-calculations
  const gallonEstimate = useMemo(() => {
    if (!autoCalcs) return null;
    const wallGallons = autoCalcs.sidingSqft / pricing.exteriorCoverage.wallSqftPerGallon;
    const trimGallons = autoCalcs.trimLF / pricing.exteriorCoverage.trimLfPerGallon;
    return { wallGallons, trimGallons, total: wallGallons + trimGallons };
  }, [autoCalcs, pricing]);

  return (
    <div className="space-y-6">
      <CustomerInfoSection register={register} />

      <Card>
        <CardHeader>
          <CardTitle>House Square Footage</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            label="Square Footage"
            type="number"
            min="0"
            step="1"
            placeholder="2000"
            {...register('houseSquareFootage', {
              required: true,
              valueAsNumber: true,
              min: 0,
            })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Option</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="radio"
              value="full-exterior"
              className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-2 focus:ring-primary-500"
              {...register('pricingOption', { required: true })}
            />
            <span className="text-sm font-medium text-gray-700">
              Full Exterior (${pricing.exteriorSqft.fullExterior.toFixed(2)}/sqft)
            </span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="radio"
              value="trim-only"
              className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-2 focus:ring-primary-500"
              {...register('pricingOption', { required: true })}
            />
            <span className="text-sm font-medium text-gray-700">
              Trim Only (${pricing.exteriorSqft.trimOnly.toFixed(2)}/sqft)
            </span>
          </label>
        </CardContent>
      </Card>

      <MarkupSelector register={register} />

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
                type="number"
                min="0"
                step="1"
                value={customItemValues[item.id] ?? ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCustomItemValues((prev) => ({
                    ...prev,
                    [item.id]: isNaN(val) ? 0 : val,
                  }));
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
                  <span className="text-xs text-gray-400">({result.total > 0 ? ((result.labor / result.total) * 100).toFixed(0) : 0}%)</span>
                  <span className="text-lg font-semibold text-gray-800">
                    ${result.labor.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Materials</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">({result.total > 0 ? ((result.materials.totalCost / result.total) * 100).toFixed(0) : 0}%)</span>
                  <span className="text-lg font-semibold text-gray-800">
                    ${result.materials.totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Gross Profit</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 font-medium">({markup}%)</span>
                  <span className="text-lg font-semibold text-green-700">
                    ${result.profit.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="border-t border-primary-200 pt-3 flex justify-between items-center">
                <span className="text-base font-semibold text-gray-700">Retail Total</span>
                <span className="text-3xl font-bold text-primary-700">
                  ${result.total.toFixed(2)}
                </span>
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
              <div className="text-xl font-bold text-yellow-700">{gallonEstimate.wallGallons.toFixed(1)} gal</div>
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
    </div>
  );
}
