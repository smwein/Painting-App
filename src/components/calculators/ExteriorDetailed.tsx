import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { CustomerInfoSection } from './shared/CustomerInfoSection';
import { ModifierSection } from './shared/ModifierSection';
import { PaintTypeSelector } from './shared/PaintTypeSelector';
import { MarkupSelector } from './shared/MarkupSelector';
import { BidSummary } from '../results/BidSummary';
import { CostBreakdown } from '../results/CostBreakdown';
import type { ExteriorDetailedInputs } from '../../types/calculator.types';
import type { CustomerInfo } from '../../types/bid.types';
import { calculateExteriorDetailed } from '../../core/calculators/exteriorDetailed';

interface ExteriorDetailedFormData {
  customer: CustomerInfo;
  wallSqft: number;
  trimFasciaSoffitLF: number;
  doors: number;
  shutters: number;
  doorsToRefinish: number;
  primingSqft: number;
  primingLF: number;
  sidingReplacementSqft: number;
  trimReplacementLF: number;
  soffitFasciaReplacementLF: number;
  bondoRepairs: number;
  deckStainingSqft: number;
  miscPressureWashingSqft: number;
  miscWorkHours: number;
  miscellaneousDollars: number;
  paintType: 'SuperPaint' | 'Duration' | 'Emerald';
  markup: number;
  'modifiers.threeStory': boolean;
  'modifiers.extensivePrep': boolean;
  'modifiers.hardTerrain': boolean;
  'modifiers.additionalCoat': boolean;
  'modifiers.oneCoat': boolean;
}

const exteriorModifiers = [
  { name: 'modifiers.threeStory', label: '3 Story (×1.15)' },
  { name: 'modifiers.extensivePrep', label: 'Extensive Prep (×1.2)' },
  { name: 'modifiers.hardTerrain', label: 'Hard Terrain (×1.15)' },
  { name: 'modifiers.additionalCoat', label: 'Additional Coat (×1.25)' },
  { name: 'modifiers.oneCoat', label: 'Reduce to 1 Coat (×0.85)' },
];

interface ExteriorDetailedProps {
  onResultChange?: (result: any) => void;
}

export function ExteriorDetailed({ onResultChange }: ExteriorDetailedProps) {
  const { register, watch } = useForm<ExteriorDetailedFormData>({
    defaultValues: {
      wallSqft: 0,
      trimFasciaSoffitLF: 0,
      doors: 0,
      shutters: 0,
      doorsToRefinish: 0,
      primingSqft: 0,
      primingLF: 0,
      sidingReplacementSqft: 0,
      trimReplacementLF: 0,
      soffitFasciaReplacementLF: 0,
      bondoRepairs: 0,
      deckStainingSqft: 0,
      miscPressureWashingSqft: 0,
      miscWorkHours: 0,
      miscellaneousDollars: 0,
      paintType: 'SuperPaint',
      markup: 40 as const,
      'modifiers.threeStory': false,
      'modifiers.extensivePrep': false,
      'modifiers.hardTerrain': false,
      'modifiers.additionalCoat': false,
      'modifiers.oneCoat': false,
    },
  });

  const formValues = watch();

  // Real-time calculation
  const result = useMemo(() => {
    const inputs: ExteriorDetailedInputs = {
      wallSqft: formValues.wallSqft || 0,
      trimFasciaSoffitLF: formValues.trimFasciaSoffitLF || 0,
      doors: formValues.doors || 0,
      shutters: formValues.shutters || 0,
      doorsToRefinish: formValues.doorsToRefinish || 0,
      primingSqft: formValues.primingSqft || 0,
      primingLF: formValues.primingLF || 0,
      sidingReplacementSqft: formValues.sidingReplacementSqft || 0,
      trimReplacementLF: formValues.trimReplacementLF || 0,
      soffitFasciaReplacementLF: formValues.soffitFasciaReplacementLF || 0,
      bondoRepairs: formValues.bondoRepairs || 0,
      deckStainingSqft: formValues.deckStainingSqft || 0,
      miscPressureWashingSqft: formValues.miscPressureWashingSqft || 0,
      miscWorkHours: formValues.miscWorkHours || 0,
      miscellaneousDollars: formValues.miscellaneousDollars || 0,
      paintType: formValues.paintType,
      markup: formValues.markup as import('../../types/calculator.types').MarkupPercentage,
      modifiers: {
        threeStory: formValues['modifiers.threeStory'] || false,
        extensivePrep: formValues['modifiers.extensivePrep'] || false,
        hardTerrain: formValues['modifiers.hardTerrain'] || false,
        additionalCoat: formValues['modifiers.additionalCoat'] || false,
        oneCoat: formValues['modifiers.oneCoat'] || false,
      },
    };

    const calculatedResult = calculateExteriorDetailed(inputs);

    if (onResultChange) {
      onResultChange({
        customer: formValues.customer,
        inputs,
        result: calculatedResult,
      });
    }

    return calculatedResult;
  }, [formValues]);

  return (
    <div className="space-y-6">
      <CustomerInfoSection register={register} />

      <Card>
        <CardHeader>
          <CardTitle>Measurements</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Wall Sq Ft ($0.70/sqft)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('wallSqft', { valueAsNumber: true })}
          />
          <Input
            label="Trim/Fascia/Soffit LF ($0.50/LF)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('trimFasciaSoffitLF', { valueAsNumber: true })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Doors & Shutters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Doors ($40/door)"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            {...register('doors', { valueAsNumber: true })}
          />
          <Input
            label="Shutters ($25/shutter)"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            {...register('shutters', { valueAsNumber: true })}
          />
          <Input
            label="Doors to Refinish ($100/door)"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            {...register('doorsToRefinish', { valueAsNumber: true })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prep Work</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Priming Sq Ft ($0.50/sqft)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('primingSqft', { valueAsNumber: true })}
          />
          <Input
            label="Priming LF ($0.50/LF)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('primingLF', { valueAsNumber: true })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Replacements & Repairs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Siding Replacement Sq Ft ($2/sqft)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('sidingReplacementSqft', { valueAsNumber: true })}
          />
          <Input
            label="Trim Replacement LF ($4/LF)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('trimReplacementLF', { valueAsNumber: true })}
          />
          <Input
            label="Soffit/Fascia Replacement LF ($8/LF)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('soffitFasciaReplacementLF', { valueAsNumber: true })}
          />
          <Input
            label="Bondo Repairs ($30/repair)"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            {...register('bondoRepairs', { valueAsNumber: true })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Work</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Deck Staining Sq Ft ($1/sqft)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('deckStainingSqft', { valueAsNumber: true })}
          />
          <Input
            label="Misc Pressure Washing Sq Ft ($0.50/sqft)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('miscPressureWashingSqft', { valueAsNumber: true })}
          />
          <Input
            label="Misc Work Hours ($50/hour)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('miscWorkHours', { valueAsNumber: true })}
          />
          <Input
            label="Miscellaneous $ (custom)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            {...register('miscellaneousDollars', { valueAsNumber: true })}
          />
        </CardContent>
      </Card>

      <PaintTypeSelector register={register} isExterior={true} />
      <MarkupSelector register={register} />
      <ModifierSection register={register} modifiers={exteriorModifiers} />

      {result && result.total > 0 && (
        <>
          <BidSummary result={result} />
          <CostBreakdown result={result} breakdown={result.breakdown} />
        </>
      )}
    </div>
  );
}
