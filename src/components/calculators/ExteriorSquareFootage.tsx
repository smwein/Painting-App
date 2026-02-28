import { useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { CustomerInfoSection } from './shared/CustomerInfoSection';
import { MarkupSelector } from './shared/MarkupSelector';
import { useSettingsStore } from '../../store/settingsStore';
import type { ExteriorSqftInputs, ExteriorSqftOption, MarkupPercentage } from '../../types/calculator.types';
import type { CustomerInfo, Bid } from '../../types/bid.types';
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

  const { register, watch, reset } = useForm<ExteriorSqftFormData>({
    defaultValues: {
      houseSquareFootage: 0,
      pricingOption: 'full-exterior',
      markup: 40,
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
  }, [houseSquareFootage, pricingOption, markup, customer, onResultChange, pricing]);

  const autoCalcs = useMemo(() => {
    if (!houseSquareFootage || houseSquareFootage <= 0) {
      return null;
    }
    return calculateExteriorSqftAutoMeasurements(houseSquareFootage, pricing);
  }, [houseSquareFootage, pricing]);

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
              Full Exterior ($2.00/sqft)
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
              Trim Only ($1.35/sqft)
            </span>
          </label>
        </CardContent>
      </Card>

      <MarkupSelector register={register} />

      {result && (
        <Card className="bg-primary-50 border-primary-200">
          <CardHeader>
            <CardTitle>Bid Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary-700">
              ${result.total.toFixed(2)}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Labor cost estimate (materials not included)
            </p>
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
