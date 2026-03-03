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
import type { InteriorDetailedInputs, HouseCondition } from '../../types/calculator.types';
import type { CustomerInfo, Bid } from '../../types/bid.types';
import { calculateInteriorDetailed } from '../../core/calculators/interiorDetailed';
import { calculateInteriorSqftAutoMeasurements } from '../../core/calculators/interiorSquareFootage';

interface InteriorDetailedFormData {
  customer: CustomerInfo;
  houseSquareFootage: number;
  wallSqft: number;
  ceilingSqft: number;
  trimLF: number;
  doors: number;
  cabinetDoors: number;
  cabinetDrawers: number;
  newCabinetDoors: number;
  newCabinetDrawers: number;
  colorsAboveThree: number;
  wallpaperRemovalSqft: number;
  primingLF: number;
  primingSqft: number;
  drywallReplacementSqft: number;
  popcornRemovalSqft: number;
  wallTextureRemovalSqft: number;
  trimReplacementLF: number;
  drywallRepairs: number;
  accentWalls: number;
  miscWorkHours: number;
  miscellaneousDollars: number;
  paintType: string;
  markup: number;
  'modifiers.heavilyFurnished': boolean;
  'modifiers.emptyHouse': boolean;
  'modifiers.extensivePrep': boolean;
  'modifiers.additionalCoat': boolean;
  'modifiers.oneCoat': boolean;
}

function getInteriorModifiersList(pricing: import('../../types/settings.types').PricingSettings) {
  const vals = pricing.interiorModifierValues;
  return [
    { name: 'modifiers.heavilyFurnished', label: `${vals?.heavilyFurnishedLabel ?? 'Heavily Furnished'} (×${vals?.heavilyFurnished ?? 1.25})` },
    { name: 'modifiers.emptyHouse', label: `${vals?.emptyHouseLabel ?? 'Empty House'} (×${vals?.emptyHouse ?? 0.85})` },
    { name: 'modifiers.extensivePrep', label: `${vals?.extensivePrepLabel ?? 'Extensive Prep'} (×${vals?.extensivePrep ?? 1.15})` },
    { name: 'modifiers.additionalCoat', label: `${vals?.additionalCoatLabel ?? 'Additional Coat'} (×${vals?.additionalCoat ?? 1.25})` },
    { name: 'modifiers.oneCoat', label: `${vals?.oneCoatLabel ?? 'One Coat'} (×${vals?.oneCoat ?? 0.85})` },
  ];
}

interface InteriorDetailedProps {
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

export function InteriorDetailed({ onResultChange, loadedBid }: InteriorDetailedProps) {
  const { settings, updateSection, deleteSection } = useSettingsStore();
  const pricing = settings.pricing;

  const [houseCondition, setHouseCondition] = useState<HouseCondition>('furnished');

  const getRate = (lineItemId: string): number => {
    const conditionRates = houseCondition === 'empty'
      ? pricing.interiorDetailedEmptyRates
      : pricing.interiorDetailedFurnishedRates;
    if (lineItemId === 'int-wall-sqft' && conditionRates) return conditionRates.wallSqft;
    if (lineItemId === 'int-ceiling-sqft' && conditionRates) return conditionRates.ceilingSqft;
    if (lineItemId === 'int-trim-lf' && conditionRates) return conditionRates.trimLF;
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

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const sorted = [...pricing.sections]
      .filter((s) => s.calculatorType === 'interior-detailed')
      .sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === sectionId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const currentOrder = sorted[idx].order;
    const swapOrder = sorted[swapIdx].order;
    updateSection(sorted[idx].id, { order: swapOrder });
    updateSection(sorted[swapIdx].id, { order: currentOrder });
  };

  const handleDeleteSection = (sectionId: string) => {
    const section = pricing.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const itemCount = pricing.lineItems.filter((i) => i.category === sectionId).length;
    const msg = itemCount > 0
      ? `Delete "${section.name}"? This section has ${itemCount} line item(s) that will also be removed.`
      : `Delete "${section.name}"?`;
    if (confirm(msg)) deleteSection(sectionId);
  };

  // State for custom section line item quantities
  const [customValues, setCustomValues] = useState<Record<string, number>>({});

  const { register, watch, reset, setValue } = useForm<InteriorDetailedFormData>({
    defaultValues: {
      houseSquareFootage: 0,
      wallSqft: 0,
      ceilingSqft: 0,
      trimLF: 0,
      doors: 0,
      cabinetDoors: 0,
      cabinetDrawers: 0,
      newCabinetDoors: 0,
      newCabinetDrawers: 0,
      colorsAboveThree: 0,
      wallpaperRemovalSqft: 0,
      primingLF: 0,
      primingSqft: 0,
      drywallReplacementSqft: 0,
      popcornRemovalSqft: 0,
      wallTextureRemovalSqft: 0,
      trimReplacementLF: 0,
      drywallRepairs: 0,
      accentWalls: 0,
      miscWorkHours: 0,
      miscellaneousDollars: 0,
      paintType: 'SuperPaint',
      markup: 50 as const,
      'modifiers.heavilyFurnished': false,
      'modifiers.emptyHouse': false,
      'modifiers.extensivePrep': false,
      'modifiers.additionalCoat': false,
      'modifiers.oneCoat': false,
    },
  });

  // Watch calculation fields
  const houseSquareFootage = watch('houseSquareFootage');
  const wallSqft = watch('wallSqft');
  const ceilingSqft = watch('ceilingSqft');
  const trimLF = watch('trimLF');
  const doors = watch('doors');
  const cabinetDoors = watch('cabinetDoors');
  const cabinetDrawers = watch('cabinetDrawers');
  const newCabinetDoors = watch('newCabinetDoors');
  const newCabinetDrawers = watch('newCabinetDrawers');
  const colorsAboveThree = watch('colorsAboveThree');
  const wallpaperRemovalSqft = watch('wallpaperRemovalSqft');
  const primingLF = watch('primingLF');
  const primingSqft = watch('primingSqft');
  const drywallReplacementSqft = watch('drywallReplacementSqft');
  const popcornRemovalSqft = watch('popcornRemovalSqft');
  const wallTextureRemovalSqft = watch('wallTextureRemovalSqft');
  const trimReplacementLF = watch('trimReplacementLF');
  const drywallRepairs = watch('drywallRepairs');
  const accentWalls = watch('accentWalls');
  const miscWorkHours = watch('miscWorkHours');
  const miscellaneousDollars = watch('miscellaneousDollars');
  const paintType = watch('paintType');
  const markup = watch('markup');
  const modifierHeavilyFurnished = watch('modifiers.heavilyFurnished');
  const modifierEmptyHouse = watch('modifiers.emptyHouse');
  const modifierExtensivePrep = watch('modifiers.extensivePrep');
  const modifierAdditionalCoat = watch('modifiers.additionalCoat');
  const modifierOneCoat = watch('modifiers.oneCoat');
  const customer = watch('customer');

  // Section subtotals
  const measurementsSubtotal =
    (wallSqft || 0) * getRate('int-wall-sqft') +
    (ceilingSqft || 0) * getRate('int-ceiling-sqft') +
    (trimLF || 0) * getRate('int-trim-lf');

  const doorsSubtotal =
    (doors || 0) * getRate('int-door') +
    (cabinetDoors || 0) * getRate('int-cabinet-door') +
    (cabinetDrawers || 0) * getRate('int-cabinet-drawer') +
    (newCabinetDoors || 0) * getRate('int-new-cabinet-door') +
    (newCabinetDrawers || 0) * getRate('int-new-cabinet-drawer');

  const prepSubtotal =
    (wallpaperRemovalSqft || 0) * getRate('int-wallpaper-removal-sqft') +
    (primingLF || 0) * getRate('int-priming-lf') +
    (primingSqft || 0) * getRate('int-priming-sqft') +
    (drywallReplacementSqft || 0) * getRate('int-drywall-replacement-sqft') +
    (popcornRemovalSqft || 0) * getRate('int-popcorn-removal-sqft') +
    (wallTextureRemovalSqft || 0) * getRate('int-wall-texture-removal-sqft') +
    (trimReplacementLF || 0) * getRate('int-trim-replacement-lf') +
    (drywallRepairs || 0) * getRate('int-drywall-repair');

  const additionalSubtotal =
    (colorsAboveThree || 0) * getRate('int-color-above-three') +
    (accentWalls || 0) * getRate('int-accent-wall') +
    (miscWorkHours || 0) * getRate('int-misc-work-hour') +
    (miscellaneousDollars || 0) * getRate('int-miscellaneous-dollars');

  // All sections for interior-detailed sorted by order (enables user-defined ordering)
  const allIntSections = pricing.sections
    .filter((s) => s.calculatorType === 'interior-detailed')
    .sort((a, b) => a.order - b.order);

  // Pre-fill form when loading a saved bid
  useEffect(() => {
    if (loadedBid && loadedBid.calculatorType === 'interior-detailed') {
      const inputs = loadedBid.inputs as InteriorDetailedInputs;
      reset({
        customer: loadedBid.customer,
        wallSqft: inputs.wallSqft,
        ceilingSqft: inputs.ceilingSqft,
        trimLF: inputs.trimLF,
        doors: inputs.doors,
        cabinetDoors: inputs.cabinetDoors,
        cabinetDrawers: inputs.cabinetDrawers,
        newCabinetDoors: inputs.newCabinetDoors,
        newCabinetDrawers: inputs.newCabinetDrawers,
        colorsAboveThree: inputs.colorsAboveThree,
        wallpaperRemovalSqft: inputs.wallpaperRemovalSqft,
        primingLF: inputs.primingLF,
        primingSqft: inputs.primingSqft,
        drywallReplacementSqft: inputs.drywallReplacementSqft,
        popcornRemovalSqft: inputs.popcornRemovalSqft,
        wallTextureRemovalSqft: inputs.wallTextureRemovalSqft,
        trimReplacementLF: inputs.trimReplacementLF,
        drywallRepairs: inputs.drywallRepairs,
        accentWalls: inputs.accentWalls,
        miscWorkHours: inputs.miscWorkHours,
        miscellaneousDollars: inputs.miscellaneousDollars,
        paintType: inputs.paintType,
        markup: inputs.markup,
        'modifiers.heavilyFurnished': inputs.modifiers.heavilyFurnished,
        'modifiers.emptyHouse': inputs.modifiers.emptyHouse,
        'modifiers.extensivePrep': inputs.modifiers.extensivePrep,
        'modifiers.additionalCoat': inputs.modifiers.additionalCoat,
        'modifiers.oneCoat': inputs.modifiers.oneCoat,
      });
      if (inputs.customItemValues) setCustomValues(inputs.customItemValues);
      if (inputs.houseCondition) setHouseCondition(inputs.houseCondition);
    }
  }, [loadedBid, reset]);

  // Real-time calculation
  const result = useMemo(() => {
    const inputs: InteriorDetailedInputs = {
      wallSqft: wallSqft || 0,
      ceilingSqft: ceilingSqft || 0,
      trimLF: trimLF || 0,
      doors: doors || 0,
      cabinetDoors: cabinetDoors || 0,
      cabinetDrawers: cabinetDrawers || 0,
      newCabinetDoors: newCabinetDoors || 0,
      newCabinetDrawers: newCabinetDrawers || 0,
      colorsAboveThree: colorsAboveThree || 0,
      wallpaperRemovalSqft: wallpaperRemovalSqft || 0,
      primingLF: primingLF || 0,
      primingSqft: primingSqft || 0,
      drywallReplacementSqft: drywallReplacementSqft || 0,
      popcornRemovalSqft: popcornRemovalSqft || 0,
      wallTextureRemovalSqft: wallTextureRemovalSqft || 0,
      trimReplacementLF: trimReplacementLF || 0,
      drywallRepairs: drywallRepairs || 0,
      accentWalls: accentWalls || 0,
      miscWorkHours: miscWorkHours || 0,
      miscellaneousDollars: miscellaneousDollars || 0,
      paintType: paintType,
      markup: markup as import('../../types/calculator.types').MarkupPercentage,
      houseCondition,
      modifiers: {
        heavilyFurnished: modifierHeavilyFurnished || false,
        emptyHouse: modifierEmptyHouse || false,
        extensivePrep: modifierExtensivePrep || false,
        additionalCoat: modifierAdditionalCoat || false,
        oneCoat: modifierOneCoat || false,
      },
      customItemValues: customValues,
    };

    return calculateInteriorDetailed(inputs, pricing);
  }, [
    wallSqft, ceilingSqft, trimLF, doors, cabinetDoors, cabinetDrawers,
    newCabinetDoors, newCabinetDrawers, colorsAboveThree, wallpaperRemovalSqft,
    primingLF, primingSqft, drywallReplacementSqft, popcornRemovalSqft,
    wallTextureRemovalSqft, trimReplacementLF, drywallRepairs, accentWalls,
    miscWorkHours, miscellaneousDollars, paintType, markup,
    modifierHeavilyFurnished, modifierEmptyHouse, modifierExtensivePrep,
    modifierAdditionalCoat, modifierOneCoat, customValues,
    houseCondition, pricing,
  ]);

  // Notify parent of changes
  useEffect(() => {
    if (result && onResultChange) {
      const inputs: InteriorDetailedInputs = {
        wallSqft: wallSqft || 0,
        ceilingSqft: ceilingSqft || 0,
        trimLF: trimLF || 0,
        doors: doors || 0,
        cabinetDoors: cabinetDoors || 0,
        cabinetDrawers: cabinetDrawers || 0,
        newCabinetDoors: newCabinetDoors || 0,
        newCabinetDrawers: newCabinetDrawers || 0,
        colorsAboveThree: colorsAboveThree || 0,
        wallpaperRemovalSqft: wallpaperRemovalSqft || 0,
        primingLF: primingLF || 0,
        primingSqft: primingSqft || 0,
        drywallReplacementSqft: drywallReplacementSqft || 0,
        popcornRemovalSqft: popcornRemovalSqft || 0,
        wallTextureRemovalSqft: wallTextureRemovalSqft || 0,
        trimReplacementLF: trimReplacementLF || 0,
        drywallRepairs: drywallRepairs || 0,
        accentWalls: accentWalls || 0,
        miscWorkHours: miscWorkHours || 0,
        miscellaneousDollars: miscellaneousDollars || 0,
        paintType: paintType,
        markup: markup as import('../../types/calculator.types').MarkupPercentage,
        houseCondition,
        modifiers: {
          heavilyFurnished: modifierHeavilyFurnished || false,
          emptyHouse: modifierEmptyHouse || false,
          extensivePrep: modifierExtensivePrep || false,
          additionalCoat: modifierAdditionalCoat || false,
          oneCoat: modifierOneCoat || false,
        },
        customItemValues: customValues,
      };
      onResultChange({ customer, inputs, result });
    }
  }, [result, customer, onResultChange]);

  // Auto-populate measurements when house SF changes
  useEffect(() => {
    if (houseSquareFootage && houseSquareFootage > 0) {
      const autoCalcs = calculateInteriorSqftAutoMeasurements(houseSquareFootage, pricing);
      setValue('wallSqft', autoCalcs.wallSqft);
      setValue('ceilingSqft', autoCalcs.ceilingSqft);
      setValue('trimLF', autoCalcs.trimLF);
    }
  }, [houseSquareFootage, pricing, setValue]);

  return (
    <div className="space-y-6">
      {/* House Condition Rate Cards */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setHouseCondition('furnished')}
          className={`text-left rounded-lg border-2 p-4 transition-colors ${
            houseCondition === 'furnished'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-white opacity-60'
          }`}
        >
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Interior Furnished Rates</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Wall Sqft</span>
              <span className="font-medium">${(pricing.interiorDetailedFurnishedRates?.wallSqft ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Ceiling Sqft</span>
              <span className="font-medium">${(pricing.interiorDetailedFurnishedRates?.ceilingSqft ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Trim LF</span>
              <span className="font-medium">${(pricing.interiorDetailedFurnishedRates?.trimLF ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setHouseCondition('empty')}
          className={`text-left rounded-lg border-2 p-4 transition-colors ${
            houseCondition === 'empty'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-white opacity-60'
          }`}
        >
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Interior Empty Rates</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Wall Sqft</span>
              <span className="font-medium">${(pricing.interiorDetailedEmptyRates?.wallSqft ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Ceiling Sqft</span>
              <span className="font-medium">${(pricing.interiorDetailedEmptyRates?.ceilingSqft ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Trim LF</span>
              <span className="font-medium">${(pricing.interiorDetailedEmptyRates?.trimLF ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </button>
      </div>

      {/* House SF Auto-Calculate */}
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
            Optional: Enter house square footage to auto-populate wall, ceiling, and trim measurements below.
            You can override any auto-calculated values.
          </p>
        </CardContent>
      </Card>

      {/* All sections rendered in dynamic sorted order */}
      {allIntSections.map((section, sectionIdx) => {
        const unitLabel: Record<string, string> = { sqft: '/sqft', lf: '/LF', each: '/each', hour: '/hour', dollars: '' };
        const isFirst = sectionIdx === 0;
        const isLast = sectionIdx === allIntSections.length - 1;

        const sectionHeader = (sectionId: string) => (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex flex-col -my-1">
                <button
                  onClick={() => moveSection(sectionId, 'up')}
                  disabled={isFirst}
                  className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed px-1 leading-none"
                >&#9650;</button>
                <button
                  onClick={() => moveSection(sectionId, 'down')}
                  disabled={isLast}
                  className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed px-1 leading-none"
                >&#9660;</button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleSection(sectionId)} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                {collapsed[sectionId] ? '+ Show' : '− Hide'}
              </button>
              {!section.isDefault && (
                <button
                  onClick={() => handleDeleteSection(sectionId)}
                  className="text-sm text-red-400 hover:text-red-600 font-bold px-1"
                >&#10005;</button>
              )}
            </div>
          </div>
        );

        if (section.id === 'int-measurements') return (
          <Card key={section.id}>
            {sectionHeader('int-measurements')}
            {!collapsed['int-measurements'] && (
              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={`Wall Sq Ft ($${getRate('int-wall-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('wallSqft', { valueAsNumber: true })} />
                  <Input label={`Ceiling Sq Ft ($${getRate('int-ceiling-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('ceilingSqft', { valueAsNumber: true })} />
                  <Input label={`Trim LF ($${getRate('int-trim-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('trimLF', { valueAsNumber: true })} />
                </div>
                <SectionSubtotal total={measurementsSubtotal} />
              </div>
            )}
          </Card>
        );

        if (section.id === 'int-doors-cabinets') return (
          <Card key={section.id}>
            {sectionHeader('int-doors-cabinets')}
            {!collapsed['int-doors-cabinets'] && (
              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={`Doors ($${getRate('int-door').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('doors', { valueAsNumber: true })} />
                  <Input label={`Cabinet Doors ($${getRate('int-cabinet-door').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('cabinetDoors', { valueAsNumber: true })} />
                  <Input label={`Cabinet Drawers ($${getRate('int-cabinet-drawer').toFixed(0)}/drawer)`} type="number" min="0" step="1" placeholder="0" {...register('cabinetDrawers', { valueAsNumber: true })} />
                  <Input label={`New Cabinet Doors ($${getRate('int-new-cabinet-door').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('newCabinetDoors', { valueAsNumber: true })} />
                  <Input label={`New Cabinet Drawers ($${getRate('int-new-cabinet-drawer').toFixed(0)}/drawer)`} type="number" min="0" step="1" placeholder="0" {...register('newCabinetDrawers', { valueAsNumber: true })} />
                </div>
                <SectionSubtotal total={doorsSubtotal} />
              </div>
            )}
          </Card>
        );

        if (section.id === 'int-prep-work') return (
          <Card key={section.id}>
            {sectionHeader('int-prep-work')}
            {!collapsed['int-prep-work'] && (
              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={`Wallpaper Removal Sq Ft ($${getRate('int-wallpaper-removal-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('wallpaperRemovalSqft', { valueAsNumber: true })} />
                  <Input label={`Priming LF ($${getRate('int-priming-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('primingLF', { valueAsNumber: true })} />
                  <Input label={`Priming Sq Ft ($${getRate('int-priming-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('primingSqft', { valueAsNumber: true })} />
                  <Input label={`Drywall Replacement Sq Ft ($${getRate('int-drywall-replacement-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('drywallReplacementSqft', { valueAsNumber: true })} />
                  <Input label={`Popcorn Removal Sq Ft ($${getRate('int-popcorn-removal-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('popcornRemovalSqft', { valueAsNumber: true })} />
                  <Input label={`Wall Texture Removal Sq Ft ($${getRate('int-wall-texture-removal-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('wallTextureRemovalSqft', { valueAsNumber: true })} />
                  <Input label={`Trim Replacement LF ($${getRate('int-trim-replacement-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('trimReplacementLF', { valueAsNumber: true })} />
                  <Input label={`Drywall Repairs ($${getRate('int-drywall-repair').toFixed(0)}/repair)`} type="number" min="0" step="1" placeholder="0" {...register('drywallRepairs', { valueAsNumber: true })} />
                </div>
                <SectionSubtotal total={prepSubtotal} />
              </div>
            )}
          </Card>
        );

        if (section.id === 'int-additional') return (
          <Card key={section.id}>
            {sectionHeader('int-additional')}
            {!collapsed['int-additional'] && (
              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={`Colors Above 3 ($${getRate('int-color-above-three').toFixed(0)}/color)`} type="number" min="0" step="1" placeholder="0" {...register('colorsAboveThree', { valueAsNumber: true })} />
                  <Input label={`Accent Walls ($${getRate('int-accent-wall').toFixed(0)}/wall)`} type="number" min="0" step="1" placeholder="0" {...register('accentWalls', { valueAsNumber: true })} />
                  <Input label={`Misc Work Hours ($${getRate('int-misc-work-hour').toFixed(0)}/hour)`} type="number" min="0" step="0.1" placeholder="0" {...register('miscWorkHours', { valueAsNumber: true })} />
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
            {sectionHeader(section.id)}
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

      <PaintTypeSelector register={register} />
      <MarkupSelector register={register} />
      <ModifierSection register={register} modifiers={getInteriorModifiersList(pricing)} />

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
