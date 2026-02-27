import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { CustomerInfoSection } from './shared/CustomerInfoSection';
import type { InteriorSqftInputs, InteriorSqftOption } from '../../types/calculator.types';
import type { CustomerInfo } from '../../types/bid.types';
import {
  calculateInteriorSquareFootage,
  calculateInteriorSqftAutoMeasurements,
} from '../../core/calculators/interiorSquareFootage';

interface InteriorSqftFormData {
  customer: CustomerInfo;
  houseSquareFootage: number;
  pricingOption: InteriorSqftOption;
}

interface InteriorSquareFootageProps {
  onResultChange?: (result: any) => void;
}

export function InteriorSquareFootage({ onResultChange }: InteriorSquareFootageProps) {
  const { register, watch } = useForm<InteriorSqftFormData>({
    defaultValues: {
      houseSquareFootage: 0,
      pricingOption: 'complete',
    },
  });

  // Watch only the specific fields needed for calculation
  const houseSquareFootage = watch('houseSquareFootage');
  const pricingOption = watch('pricingOption');
  const customer = watch('customer');

  // Real-time calculation
  const result = useMemo(() => {
    if (!houseSquareFootage || houseSquareFootage <= 0) {
      return null;
    }

    const inputs: InteriorSqftInputs = {
      houseSquareFootage,
      pricingOption,
    };

    const calculatedResult = calculateInteriorSquareFootage(inputs);

    if (onResultChange) {
      onResultChange({
        customer,
        inputs,
        result: calculatedResult,
      });
    }

    return calculatedResult;
  }, [houseSquareFootage, pricingOption, customer, onResultChange]);

  const autoCalcs = useMemo(() => {
    if (!houseSquareFootage || houseSquareFootage <= 0) {
      return null;
    }
    return calculateInteriorSqftAutoMeasurements(houseSquareFootage);
  }, [houseSquareFootage]);

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
              value="walls-only"
              className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-2 focus:ring-primary-500"
              {...register('pricingOption', { required: true })}
            />
            <span className="text-sm font-medium text-gray-700">
              Walls Only ($1.75/sqft)
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
              Trim Only ($1.25/sqft)
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
              Ceilings Only ($1.00/sqft)
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
              Complete ($2.50/sqft)
            </span>
          </label>
        </CardContent>
      </Card>

      {autoCalcs && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Auto-Calculated Measurements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Wall Square Footage:</span>
              <span className="text-sm font-semibold">{autoCalcs.wallSqft.toFixed(0)} sqft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Ceiling Square Footage:</span>
              <span className="text-sm font-semibold">{autoCalcs.ceilingSqft.toFixed(0)} sqft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Trim Linear Feet:</span>
              <span className="text-sm font-semibold">{autoCalcs.trimLF.toFixed(0)} LF</span>
            </div>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
