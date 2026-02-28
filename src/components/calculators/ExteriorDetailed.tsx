import { useMemo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Card, CardContent } from '../common/Card';
import { CustomerInfoSection } from './shared/CustomerInfoSection';
import { ModifierSection } from './shared/ModifierSection';
import { PaintTypeSelector } from './shared/PaintTypeSelector';
import { MarkupSelector } from './shared/MarkupSelector';
import { BidSummary } from '../results/BidSummary';
import { PaintGallonsEstimate } from '../results/PaintGallonsEstimate';
import { JobDurationEstimate } from '../results/JobDurationEstimate';
import { useSettingsStore } from '../../store/settingsStore';
import type { ExteriorDetailedInputs } from '../../types/calculator.types';
import type { CustomerInfo, Bid } from '../../types/bid.types';
import { calculateExteriorDetailed } from '../../core/calculators/exteriorDetailed';
import { calculateExteriorSqftAutoMeasurements } from '../../core/calculators/exteriorSquareFootage';

interface ExteriorDetailedFormData {
  customer: CustomerInfo;
  houseSquareFootage: number;
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
  loadedBid?: Bid;
}

export function ExteriorDetailed({ onResultChange, loadedBid }: ExteriorDetailedProps) {
  const { settings } = useSettingsStore();
  const pricing = settings.pricing;

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    pricing.sections.forEach((s) => { if (s.defaultCollapsed) init[s.id] = true; });
    return init;
  });
  const toggleSection = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const { register, watch, reset, setValue } = useForm<ExteriorDetailedFormData>({
    defaultValues: {
      houseSquareFootage: 0,
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

  // Watch calculation fields separately from customer fields
  const houseSquareFootage = watch('houseSquareFootage');
  const wallSqft = watch('wallSqft');
  const trimFasciaSoffitLF = watch('trimFasciaSoffitLF');
  const doors = watch('doors');
  const shutters = watch('shutters');
  const doorsToRefinish = watch('doorsToRefinish');
  const primingSqft = watch('primingSqft');
  const primingLF = watch('primingLF');
  const sidingReplacementSqft = watch('sidingReplacementSqft');
  const trimReplacementLF = watch('trimReplacementLF');
  const soffitFasciaReplacementLF = watch('soffitFasciaReplacementLF');
  const bondoRepairs = watch('bondoRepairs');
  const deckStainingSqft = watch('deckStainingSqft');
  const miscPressureWashingSqft = watch('miscPressureWashingSqft');
  const miscWorkHours = watch('miscWorkHours');
  const miscellaneousDollars = watch('miscellaneousDollars');
  const paintType = watch('paintType');
  const markup = watch('markup');
  const modifierThreeStory = watch('modifiers.threeStory');
  const modifierExtensivePrep = watch('modifiers.extensivePrep');
  const modifierHardTerrain = watch('modifiers.hardTerrain');
  const modifierAdditionalCoat = watch('modifiers.additionalCoat');
  const modifierOneCoat = watch('modifiers.oneCoat');
  const customer = watch('customer');

  // Pre-fill form when loading a saved bid
  useEffect(() => {
    if (loadedBid && loadedBid.calculatorType === 'exterior-detailed') {
      const inputs = loadedBid.inputs as ExteriorDetailedInputs;
      reset({
        customer: loadedBid.customer,
        wallSqft: inputs.wallSqft,
        trimFasciaSoffitLF: inputs.trimFasciaSoffitLF,
        doors: inputs.doors,
        shutters: inputs.shutters,
        doorsToRefinish: inputs.doorsToRefinish,
        primingSqft: inputs.primingSqft,
        primingLF: inputs.primingLF,
        sidingReplacementSqft: inputs.sidingReplacementSqft,
        trimReplacementLF: inputs.trimReplacementLF,
        soffitFasciaReplacementLF: inputs.soffitFasciaReplacementLF,
        bondoRepairs: inputs.bondoRepairs,
        deckStainingSqft: inputs.deckStainingSqft,
        miscPressureWashingSqft: inputs.miscPressureWashingSqft,
        miscWorkHours: inputs.miscWorkHours,
        miscellaneousDollars: inputs.miscellaneousDollars,
        paintType: inputs.paintType,
        markup: inputs.markup,
        'modifiers.threeStory': inputs.modifiers.threeStory,
        'modifiers.extensivePrep': inputs.modifiers.extensivePrep,
        'modifiers.hardTerrain': inputs.modifiers.hardTerrain,
        'modifiers.additionalCoat': inputs.modifiers.additionalCoat,
        'modifiers.oneCoat': inputs.modifiers.oneCoat,
      });
    }
  }, [loadedBid, reset]);

  // Real-time calculation
  const result = useMemo(() => {
    const inputs: ExteriorDetailedInputs = {
      wallSqft: wallSqft || 0,
      trimFasciaSoffitLF: trimFasciaSoffitLF || 0,
      doors: doors || 0,
      shutters: shutters || 0,
      doorsToRefinish: doorsToRefinish || 0,
      primingSqft: primingSqft || 0,
      primingLF: primingLF || 0,
      sidingReplacementSqft: sidingReplacementSqft || 0,
      trimReplacementLF: trimReplacementLF || 0,
      soffitFasciaReplacementLF: soffitFasciaReplacementLF || 0,
      bondoRepairs: bondoRepairs || 0,
      deckStainingSqft: deckStainingSqft || 0,
      miscPressureWashingSqft: miscPressureWashingSqft || 0,
      miscWorkHours: miscWorkHours || 0,
      miscellaneousDollars: miscellaneousDollars || 0,
      paintType: paintType,
      markup: markup as import('../../types/calculator.types').MarkupPercentage,
      modifiers: {
        threeStory: modifierThreeStory || false,
        extensivePrep: modifierExtensivePrep || false,
        hardTerrain: modifierHardTerrain || false,
        additionalCoat: modifierAdditionalCoat || false,
        oneCoat: modifierOneCoat || false,
      },
    };

    return calculateExteriorDetailed(inputs, pricing);
  }, [
    wallSqft, trimFasciaSoffitLF, doors, shutters, doorsToRefinish,
    primingSqft, primingLF, sidingReplacementSqft, trimReplacementLF,
    soffitFasciaReplacementLF, bondoRepairs, deckStainingSqft,
    miscPressureWashingSqft, miscWorkHours, miscellaneousDollars,
    paintType, markup, modifierThreeStory, modifierExtensivePrep,
    modifierHardTerrain, modifierAdditionalCoat, modifierOneCoat,
    pricing
  ]);

  // Notify parent of changes separately
  useEffect(() => {
    if (result && onResultChange) {
      const inputs: ExteriorDetailedInputs = {
        wallSqft: wallSqft || 0,
        trimFasciaSoffitLF: trimFasciaSoffitLF || 0,
        doors: doors || 0,
        shutters: shutters || 0,
        doorsToRefinish: doorsToRefinish || 0,
        primingSqft: primingSqft || 0,
        primingLF: primingLF || 0,
        sidingReplacementSqft: sidingReplacementSqft || 0,
        trimReplacementLF: trimReplacementLF || 0,
        soffitFasciaReplacementLF: soffitFasciaReplacementLF || 0,
        bondoRepairs: bondoRepairs || 0,
        deckStainingSqft: deckStainingSqft || 0,
        miscPressureWashingSqft: miscPressureWashingSqft || 0,
        miscWorkHours: miscWorkHours || 0,
        miscellaneousDollars: miscellaneousDollars || 0,
        paintType: paintType,
        markup: markup as import('../../types/calculator.types').MarkupPercentage,
        modifiers: {
          threeStory: modifierThreeStory || false,
          extensivePrep: modifierExtensivePrep || false,
          hardTerrain: modifierHardTerrain || false,
          additionalCoat: modifierAdditionalCoat || false,
          oneCoat: modifierOneCoat || false,
        },
      };

      onResultChange({
        customer,
        inputs,
        result,
      });
    }
  }, [result, customer, onResultChange]);

  // Auto-populate measurements when house SF changes (Requirement #1)
  useEffect(() => {
    if (houseSquareFootage && houseSquareFootage > 0) {
      const autoCalcs = calculateExteriorSqftAutoMeasurements(houseSquareFootage, pricing);
      setValue('wallSqft', autoCalcs.sidingSqft);
      setValue('trimFasciaSoffitLF', autoCalcs.trimLF);
    }
  }, [houseSquareFootage, pricing, setValue]);

  return (
    <div className="space-y-6">
      <CustomerInfoSection register={register} />

      {/* Requirement #1: House SF Auto-Calculate */}
      <Card className="bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">House Square Footage (Auto-Calculate)</h3>
        <CardContent>
          <Input
            label="House Square Footage"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            {...register('houseSquareFootage', { valueAsNumber: true })}
          />
          <p className="text-xs text-gray-500 mt-2">
            Optional: Enter house square footage to auto-populate siding and trim measurements below.
            You can override any auto-calculated values.
          </p>
        </CardContent>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Measurements</h3>
          <button onClick={() => toggleSection('ext-measurements')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            {collapsed['ext-measurements'] ? '+ Show' : '− Hide'}
          </button>
        </div>
        {!collapsed['ext-measurements'] && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Doors & Shutters</h3>
          <button onClick={() => toggleSection('ext-doors-shutters')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            {collapsed['ext-doors-shutters'] ? '+ Show' : '− Hide'}
          </button>
        </div>
        {!collapsed['ext-doors-shutters'] && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Prep Work</h3>
          <button onClick={() => toggleSection('ext-prep-work')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            {collapsed['ext-prep-work'] ? '+ Show' : '− Hide'}
          </button>
        </div>
        {!collapsed['ext-prep-work'] && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Replacements & Repairs</h3>
          <button onClick={() => toggleSection('ext-replacements-repairs')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            {collapsed['ext-replacements-repairs'] ? '+ Show' : '− Hide'}
          </button>
        </div>
        {!collapsed['ext-replacements-repairs'] && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Additional Work</h3>
          <button onClick={() => toggleSection('ext-additional')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            {collapsed['ext-additional'] ? '+ Show' : '− Hide'}
          </button>
        </div>
        {!collapsed['ext-additional'] && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        )}
      </Card>

      <PaintTypeSelector register={register} isExterior={true} />
      <MarkupSelector register={register} />
      <ModifierSection register={register} modifiers={exteriorModifiers} />

      {result && result.total > 0 && (
        <>
          {/* Requirement #5: Paint Gallons Estimate */}
          <PaintGallonsEstimate result={result} />

          {/* Requirement #8: Job Duration Estimate */}
          <JobDurationEstimate laborCost={result.labor} pricing={pricing} />

          <BidSummary result={result} />
        </>
      )}
    </div>
  );
}
