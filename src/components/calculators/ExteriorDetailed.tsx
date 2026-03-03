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
  paintType: string;
  markup: number;
  'modifiers.threeStory': boolean;
  'modifiers.extensivePrep': boolean;
  'modifiers.hardTerrain': boolean;
  'modifiers.additionalCoat': boolean;
  'modifiers.oneCoat': boolean;
}

function getExteriorModifiersList(pricing: import('../../types/settings.types').PricingSettings) {
  const vals = pricing.exteriorModifierValues;
  return [
    { name: 'modifiers.threeStory', label: `${vals?.threeStoryLabel ?? '3 Story'} (×${vals?.threeStory ?? 1.15})` },
    { name: 'modifiers.extensivePrep', label: `${vals?.extensivePrepLabel ?? 'Extensive Prep'} (×${vals?.extensivePrep ?? 1.2})` },
    { name: 'modifiers.hardTerrain', label: `${vals?.hardTerrainLabel ?? 'Hard Terrain'} (×${vals?.hardTerrain ?? 1.15})` },
    { name: 'modifiers.additionalCoat', label: `${vals?.additionalCoatLabel ?? 'Additional Coat'} (×${vals?.additionalCoat ?? 1.25})` },
    { name: 'modifiers.oneCoat', label: `${vals?.oneCoatLabel ?? 'One Coat'} (×${vals?.oneCoat ?? 0.85})` },
  ];
}

interface ExteriorDetailedProps {
  onResultChange?: (result: any) => void;
  loadedBid?: Bid;
}

function SectionSubtotal({ total }: { total: number }) {
  if (total <= 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
      <span className="text-sm font-medium text-gray-600">Section Total</span>
      <span className="text-base font-bold text-primary-700">${total.toFixed(2)}</span>
    </div>
  );
}

export function ExteriorDetailed({ onResultChange, loadedBid }: ExteriorDetailedProps) {
  const { settings } = useSettingsStore();
  const pricing = settings.pricing;

  const getRate = (lineItemId: string): number => {
    const item = pricing.lineItems.find((i) => i.id === lineItemId);
    return item?.rate ?? 0;
  };

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    pricing.sections.forEach((s) => { if (s.defaultCollapsed) init[s.id] = true; });
    return init;
  });
  const toggleSection = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  // State for custom section line item quantities
  const [customValues, setCustomValues] = useState<Record<string, number>>({});

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
      markup: 50 as const,
      'modifiers.threeStory': false,
      'modifiers.extensivePrep': false,
      'modifiers.hardTerrain': false,
      'modifiers.additionalCoat': false,
      'modifiers.oneCoat': false,
    },
  });

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

  // Section subtotals
  const measurementsSubtotal =
    (wallSqft || 0) * getRate('ext-wall-sqft') +
    (trimFasciaSoffitLF || 0) * getRate('ext-trim-fascia-soffit-lf');

  const doorsSubtotal =
    (doors || 0) * getRate('ext-door') +
    (shutters || 0) * getRate('ext-shutter') +
    (doorsToRefinish || 0) * getRate('ext-door-refinish');

  const prepSubtotal =
    (primingSqft || 0) * getRate('ext-priming-sqft') +
    (primingLF || 0) * getRate('ext-priming-lf');

  const replacementsSubtotal =
    (sidingReplacementSqft || 0) * getRate('ext-siding-replacement-sqft') +
    (trimReplacementLF || 0) * getRate('ext-trim-replacement-lf') +
    (soffitFasciaReplacementLF || 0) * getRate('ext-soffit-fascia-replacement-lf') +
    (bondoRepairs || 0) * getRate('ext-bondo-repair');

  const additionalSubtotal =
    (deckStainingSqft || 0) * getRate('ext-deck-staining-sqft') +
    (miscPressureWashingSqft || 0) * getRate('ext-misc-pressure-washing-sqft') +
    (miscWorkHours || 0) * getRate('ext-misc-work-hour') +
    (miscellaneousDollars || 0) * getRate('ext-miscellaneous-dollars');

  // All sections for exterior-detailed sorted by order
  const allExtSections = pricing.sections
    .filter((s) => s.calculatorType === 'exterior-detailed')
    .sort((a, b) => a.order - b.order);

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
      if (inputs.customItemValues) setCustomValues(inputs.customItemValues);
    }
  }, [loadedBid, reset]);

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
      customItemValues: customValues,
    };

    return calculateExteriorDetailed(inputs, pricing);
  }, [
    wallSqft, trimFasciaSoffitLF, doors, shutters, doorsToRefinish,
    primingSqft, primingLF, sidingReplacementSqft, trimReplacementLF,
    soffitFasciaReplacementLF, bondoRepairs, deckStainingSqft,
    miscPressureWashingSqft, miscWorkHours, miscellaneousDollars,
    paintType, markup, modifierThreeStory, modifierExtensivePrep,
    modifierHardTerrain, modifierAdditionalCoat, modifierOneCoat,
    customValues, pricing,
  ]);

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
        customItemValues: customValues,
      };
      onResultChange({ customer, inputs, result });
    }
  }, [result, customer, onResultChange]);

  useEffect(() => {
    if (houseSquareFootage && houseSquareFootage > 0) {
      const autoCalcs = calculateExteriorSqftAutoMeasurements(houseSquareFootage, pricing);
      setValue('wallSqft', autoCalcs.sidingSqft);
      setValue('trimFasciaSoffitLF', autoCalcs.trimLF);
    }
  }, [houseSquareFootage, pricing, setValue]);

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">House Square Footage (Auto-Calculate)</h3>
        <CardContent>
          <Input
            label="House Square Footage"
            type="number" min="0" step="1" placeholder="0"
            {...register('houseSquareFootage', { valueAsNumber: true })}
          />
          <p className="text-xs text-gray-500 mt-2">
            Optional: Enter house square footage to auto-populate siding and trim measurements below.
            You can override any auto-calculated values.
          </p>
        </CardContent>
      </Card>

      {/* All sections rendered in dynamic sorted order */}
      {allExtSections.map((section) => {
        const unitLabel: Record<string, string> = { sqft: '/sqft', lf: '/LF', each: '/each', hour: '/hour', dollars: '' };

        if (section.id === 'ext-measurements') return (
          <Card key={section.id}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
              <button onClick={() => toggleSection('ext-measurements')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                {collapsed['ext-measurements'] ? '+ Show' : '− Hide'}
              </button>
            </div>
            {!collapsed['ext-measurements'] && (
              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={`Wall/Siding Sq Ft ($${getRate('ext-wall-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('wallSqft', { valueAsNumber: true })} />
                  <Input label={`Trim/Fascia/Soffit LF ($${getRate('ext-trim-fascia-soffit-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('trimFasciaSoffitLF', { valueAsNumber: true })} />
                </div>
                <SectionSubtotal total={measurementsSubtotal} />
              </div>
            )}
          </Card>
        );

        if (section.id === 'ext-doors-shutters') return (
          <Card key={section.id}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
              <button onClick={() => toggleSection('ext-doors-shutters')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                {collapsed['ext-doors-shutters'] ? '+ Show' : '− Hide'}
              </button>
            </div>
            {!collapsed['ext-doors-shutters'] && (
              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={`Doors ($${getRate('ext-door').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('doors', { valueAsNumber: true })} />
                  <Input label={`Shutters ($${getRate('ext-shutter').toFixed(0)}/shutter)`} type="number" min="0" step="1" placeholder="0" {...register('shutters', { valueAsNumber: true })} />
                  <Input label={`Doors to Refinish ($${getRate('ext-door-refinish').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('doorsToRefinish', { valueAsNumber: true })} />
                </div>
                <SectionSubtotal total={doorsSubtotal} />
              </div>
            )}
          </Card>
        );

        if (section.id === 'ext-prep-work') return (
          <Card key={section.id}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
              <button onClick={() => toggleSection('ext-prep-work')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                {collapsed['ext-prep-work'] ? '+ Show' : '− Hide'}
              </button>
            </div>
            {!collapsed['ext-prep-work'] && (
              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={`Priming Sq Ft ($${getRate('ext-priming-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('primingSqft', { valueAsNumber: true })} />
                  <Input label={`Priming LF ($${getRate('ext-priming-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('primingLF', { valueAsNumber: true })} />
                </div>
                <SectionSubtotal total={prepSubtotal} />
              </div>
            )}
          </Card>
        );

        if (section.id === 'ext-replacements-repairs') return (
          <Card key={section.id}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
              <button onClick={() => toggleSection('ext-replacements-repairs')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                {collapsed['ext-replacements-repairs'] ? '+ Show' : '− Hide'}
              </button>
            </div>
            {!collapsed['ext-replacements-repairs'] && (
              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={`Siding Replacement Sq Ft ($${getRate('ext-siding-replacement-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('sidingReplacementSqft', { valueAsNumber: true })} />
                  <Input label={`Trim Replacement LF ($${getRate('ext-trim-replacement-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('trimReplacementLF', { valueAsNumber: true })} />
                  <Input label={`Soffit/Fascia Replacement LF ($${getRate('ext-soffit-fascia-replacement-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('soffitFasciaReplacementLF', { valueAsNumber: true })} />
                  <Input label={`Bondo Repairs ($${getRate('ext-bondo-repair').toFixed(0)}/repair)`} type="number" min="0" step="1" placeholder="0" {...register('bondoRepairs', { valueAsNumber: true })} />
                </div>
                <SectionSubtotal total={replacementsSubtotal} />
              </div>
            )}
          </Card>
        );

        if (section.id === 'ext-additional') return (
          <Card key={section.id}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
              <button onClick={() => toggleSection('ext-additional')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                {collapsed['ext-additional'] ? '+ Show' : '− Hide'}
              </button>
            </div>
            {!collapsed['ext-additional'] && (
              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={`Deck Staining Sq Ft ($${getRate('ext-deck-staining-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('deckStainingSqft', { valueAsNumber: true })} />
                  <Input label={`Misc Pressure Washing Sq Ft ($${getRate('ext-misc-pressure-washing-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('miscPressureWashingSqft', { valueAsNumber: true })} />
                  <Input label={`Misc Work Hours ($${getRate('ext-misc-work-hour').toFixed(0)}/hour)`} type="number" min="0" step="0.1" placeholder="0" {...register('miscWorkHours', { valueAsNumber: true })} />
                  <Input label="Miscellaneous $ (custom)" type="number" min="0" step="0.01" placeholder="0" {...register('miscellaneousDollars', { valueAsNumber: true })} />
                </div>
                <SectionSubtotal total={additionalSubtotal} />
              </div>
            )}
          </Card>
        );

        // Custom section
        const sectionItems = pricing.lineItems
          .filter((item) => item.category === section.id)
          .sort((a, b) => a.order - b.order);
        if (sectionItems.length === 0) return null;

        const sectionSubtotal = sectionItems.reduce(
          (sum, item) => sum + (customValues[item.id] || 0) * item.rate, 0
        );

        return (
          <Card key={section.id}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
              <button onClick={() => toggleSection(section.id)} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                {collapsed[section.id] ? '+ Show' : '− Hide'}
              </button>
            </div>
            {!collapsed[section.id] && (
              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sectionItems.map((item) => (
                    <Input
                      key={item.id}
                      label={`${item.name} ($${item.rate.toFixed(item.unit === 'sqft' || item.unit === 'lf' ? 2 : 0)}${unitLabel[item.unit] || ''})`}
                      type="number" min="0"
                      step={item.unit === 'sqft' || item.unit === 'lf' ? '0.1' : '1'}
                      placeholder="0"
                      value={customValues[item.id] ?? 0}
                      onChange={(e) => setCustomValues((prev) => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                    />
                  ))}
                </div>
                <SectionSubtotal total={sectionSubtotal} />
              </div>
            )}
          </Card>
        );
      })}

      <PaintTypeSelector register={register} isExterior={true} />
      <MarkupSelector register={register} />
      <ModifierSection register={register} modifiers={getExteriorModifiersList(pricing)} />

      {result && result.total > 0 && (
        <>
          <PaintGallonsEstimate result={result} />
          <JobDurationEstimate laborCost={result.labor} pricing={pricing} />
          <BidSummary result={result} />
        </>
      )}

      <CustomerInfoSection register={register} />
    </div>
  );
}
