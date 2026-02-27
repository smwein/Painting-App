import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { CustomerInfoSection } from './shared/CustomerInfoSection';
import type { ExteriorSqftInputs, ExteriorSqftOption } from '../../types/calculator.types';
import type { CustomerInfo } from '../../types/bid.types';
import {
  calculateExteriorSquareFootage,
  calculateExteriorSqftAutoMeasurements,
} from '../../core/calculators/exteriorSquareFootage';

interface ExteriorSqftFormData {
  customer: CustomerInfo;
  houseSquareFootage: number;
  pricingOption: ExteriorSqftOption;
}

interface ExteriorSquareFootageProps {
  onResultChange?: (result: any) => void;
}

export function ExteriorSquareFootage({ onResultChange }: ExteriorSquareFootageProps) {
  const { register, watch } = useForm<ExteriorSqftFormData>({
    defaultValues: {
      houseSquareFootage: 0,
      pricingOption: 'full-exterior',
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

    const inputs: ExteriorSqftInputs = {
      houseSquareFootage,
      pricingOption,
    };

    const calculatedResult = calculateExteriorSquareFootage(inputs);

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
    return calculateExteriorSqftAutoMeasurements(houseSquareFootage);
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

      {autoCalcs && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Auto-Calculated Measurements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Siding Square Footage:</span>
              <span className="text-sm font-semibold">{autoCalcs.sidingSqft.toFixed(0)} sqft</span>
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
