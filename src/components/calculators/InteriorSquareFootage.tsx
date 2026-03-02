import { useMemo, useEffect } from 'react';
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
  pricingOption: InteriorSqftOption;
  markup: number;
  houseCondition: HouseCondition;
}

interface InteriorSquareFootageProps {
  onResultChange?: (result: any) => void;
  loadedBid?: Bid;
}

export function InteriorSquareFootage({ onResultChange, loadedBid }: InteriorSquareFootageProps) {
  const { settings } = useSettingsStore();
  const pricing = settings.pricing;

  const { register, watch, reset } = useForm<InteriorSqftFormData>({
    defaultValues: {
      houseSquareFootage: 0,
      pricingOption: 'complete',
      markup: 50,
      houseCondition: 'furnished',
    },
  });

  // Pre-fill form when loading a saved bid
  useEffect(() => {
    if (loadedBid && loadedBid.calculatorType === 'interior-sqft') {
      const inputs = loadedBid.inputs as InteriorSqftInputs;
      reset({
        customer: loadedBid.customer,
        houseSquareFootage: inputs.houseSquareFootage,
        pricingOption: inputs.pricingOption,
        markup: inputs.markup,
        houseCondition: inputs.houseCondition ?? 'furnished',
      });
    }
  }, [loadedBid, reset]);

  // Watch only the specific fields needed for calculation
  const houseSquareFootage = watch('houseSquareFootage');
  const pricingOption = watch('pricingOption');
  const markup = watch('markup');
  const customer = watch('customer');
  const houseCondition = watch('houseCondition');

  // Get the rates based on current condition
  const rates = houseCondition === 'empty'
    ? (pricing.interiorSqftEmpty ?? pricing.interiorSqft)
    : pricing.interiorSqft;

  // Real-time calculation
  const result = useMemo(() => {
    if (!houseSquareFootage || houseSquareFootage <= 0) {
      return null;
    }

    const inputs: InteriorSqftInputs = {
      houseSquareFootage,
      pricingOption,
      markup: markup as MarkupPercentage,
      houseCondition,
    };

    const calculatedResult = calculateInteriorSquareFootage(inputs, pricing);

    if (onResultChange) {
      onResultChange({
        customer,
        inputs,
        result: calculatedResult,
      });
    }

    return calculatedResult;
  }, [houseSquareFootage, pricingOption, markup, houseCondition, customer, onResultChange, pricing]);

  const autoCalcs = useMemo(() => {
    if (!houseSquareFootage || houseSquareFootage <= 0) {
      return null;
    }
    return calculateInteriorSqftAutoMeasurements(houseSquareFootage, pricing);
  }, [houseSquareFootage, pricing]);

  // Estimate gallons from auto-calculations
  const gallonEstimate = useMemo(() => {
    if (!autoCalcs) return null;
    const wallGallons = autoCalcs.wallSqft / pricing.interiorCoverage.wallSqftPerGallon;
    const ceilingGallons = autoCalcs.ceilingSqft / pricing.interiorCoverage.ceilingSqftPerGallon;
    const trimGallons = autoCalcs.trimLF / pricing.interiorCoverage.trimLfPerGallon;
    return { wallGallons, ceilingGallons, trimGallons, total: wallGallons + ceilingGallons + trimGallons };
  }, [autoCalcs, pricing]);

  return (
    <div className="space-y-6">
      <CustomerInfoSection register={register} />

      <Card>
        <CardHeader>
          <CardTitle>House Condition</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            label="Is the house empty or furnished?"
            {...register('houseCondition')}
          >
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
              value="walls-only"
              className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-2 focus:ring-primary-500"
              {...register('pricingOption', { required: true })}
            />
            <span className="text-sm font-medium text-gray-700">
              Walls Only (${rates.wallsOnly.toFixed(2)}/sqft)
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
              Trim Only (${rates.trimOnly.toFixed(2)}/sqft)
            </span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="radio"
              value="ceilings-only"
              className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-2 focus:ring-primary-500"
              {...register('pricingOption', { required: true })}
            />
            <span className="text-sm font-medium text-gray-700">
              Ceilings Only (${rates.ceilingsOnly.toFixed(2)}/sqft)
            </span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="radio"
              value="complete"
              className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-2 focus:ring-primary-500"
              {...register('pricingOption', { required: true })}
            />
            <span className="text-sm font-medium text-gray-700">
              Complete (${rates.complete.toFixed(2)}/sqft)
            </span>
          </label>
        </CardContent>
      </Card>

      <MarkupSelector register={register} />

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
    </div>
  );
}
