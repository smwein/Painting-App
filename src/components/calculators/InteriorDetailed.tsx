import { useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { CustomerInfoSection } from './shared/CustomerInfoSection';
import { ModifierSection } from './shared/ModifierSection';
import { PaintTypeSelector } from './shared/PaintTypeSelector';
import { MarkupSelector } from './shared/MarkupSelector';
import { BidSummary } from '../results/BidSummary';
import { CostBreakdown } from '../results/CostBreakdown';
import type { InteriorDetailedInputs } from '../../types/calculator.types';
import type { CustomerInfo, Bid } from '../../types/bid.types';
import { calculateInteriorDetailed } from '../../core/calculators/interiorDetailed';

interface InteriorDetailedFormData {
  customer: CustomerInfo;
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
  paintType: 'ProMar' | 'SuperPaint' | 'Duration' | 'Emerald';
  markup: number;
  'modifiers.heavilyFurnished': boolean;
  'modifiers.emptyHouse': boolean;
  'modifiers.extensivePrep': boolean;
  'modifiers.additionalCoat': boolean;
  'modifiers.oneCoat': boolean;
}

const interiorModifiers = [
  { name: 'modifiers.heavilyFurnished', label: 'Heavily Furnished (×1.25)' },
  { name: 'modifiers.emptyHouse', label: 'Empty House (×0.85)' },
  { name: 'modifiers.extensivePrep', label: 'Extensive Prep (×1.15)' },
  { name: 'modifiers.additionalCoat', label: 'Additional Coat (×1.25)' },
  { name: 'modifiers.oneCoat', label: 'Reduce to 1 Coat (×0.85)' },
];

interface InteriorDetailedProps {
  onResultChange?: (result: any) => void;
  loadedBid?: Bid;
}

export function InteriorDetailed({ onResultChange, loadedBid }: InteriorDetailedProps) {
  const { register, watch, reset } = useForm<InteriorDetailedFormData>({
    defaultValues: {
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
      markup: 40 as const,
      'modifiers.heavilyFurnished': false,
      'modifiers.emptyHouse': false,
      'modifiers.extensivePrep': false,
      'modifiers.additionalCoat': false,
      'modifiers.oneCoat': false,
    },
  });

  // Watch calculation fields separately from customer fields
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
      modifiers: {
        heavilyFurnished: modifierHeavilyFurnished || false,
        emptyHouse: modifierEmptyHouse || false,
        extensivePrep: modifierExtensivePrep || false,
        additionalCoat: modifierAdditionalCoat || false,
        oneCoat: modifierOneCoat || false,
      },
    };

    return calculateInteriorDetailed(inputs);
  }, [
    wallSqft, ceilingSqft, trimLF, doors, cabinetDoors, cabinetDrawers,
    newCabinetDoors, newCabinetDrawers, colorsAboveThree, wallpaperRemovalSqft,
    primingLF, primingSqft, drywallReplacementSqft, popcornRemovalSqft,
    wallTextureRemovalSqft, trimReplacementLF, drywallRepairs, accentWalls,
    miscWorkHours, miscellaneousDollars, paintType, markup,
    modifierHeavilyFurnished, modifierEmptyHouse, modifierExtensivePrep,
    modifierAdditionalCoat, modifierOneCoat
  ]);

  // Notify parent of changes separately
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
        modifiers: {
          heavilyFurnished: modifierHeavilyFurnished || false,
          emptyHouse: modifierEmptyHouse || false,
          extensivePrep: modifierExtensivePrep || false,
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

  return (
    <div className="space-y-6">
      <CustomerInfoSection register={register} />

      <Card>
        <CardHeader>
          <CardTitle>Measurements</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Wall Sq Ft ($1.00/sqft)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('wallSqft', { valueAsNumber: true })}
          />
          <Input
            label="Ceiling Sq Ft ($0.50/sqft)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('ceilingSqft', { valueAsNumber: true })}
          />
          <Input
            label="Trim LF ($0.75/LF)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('trimLF', { valueAsNumber: true })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Doors & Cabinets</CardTitle>
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
            label="Cabinet Doors ($40/door)"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            {...register('cabinetDoors', { valueAsNumber: true })}
          />
          <Input
            label="Cabinet Drawers ($40/drawer)"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            {...register('cabinetDrawers', { valueAsNumber: true })}
          />
          <Input
            label="New Cabinet Doors ($60/door)"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            {...register('newCabinetDoors', { valueAsNumber: true })}
          />
          <Input
            label="New Cabinet Drawers ($60/drawer)"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            {...register('newCabinetDrawers', { valueAsNumber: true })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prep Work</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Wallpaper Removal Sq Ft ($2/sqft)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('wallpaperRemovalSqft', { valueAsNumber: true })}
          />
          <Input
            label="Priming LF ($0.50/LF)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('primingLF', { valueAsNumber: true })}
          />
          <Input
            label="Priming Sq Ft ($0.50/sqft)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('primingSqft', { valueAsNumber: true })}
          />
          <Input
            label="Drywall Replacement Sq Ft ($2/sqft)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('drywallReplacementSqft', { valueAsNumber: true })}
          />
          <Input
            label="Popcorn Removal Sq Ft ($1.25/sqft)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('popcornRemovalSqft', { valueAsNumber: true })}
          />
          <Input
            label="Wall Texture Removal Sq Ft ($1/sqft)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            {...register('wallTextureRemovalSqft', { valueAsNumber: true })}
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
            label="Drywall Repairs ($40/repair)"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            {...register('drywallRepairs', { valueAsNumber: true })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Work</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Colors Above 3 ($75/color)"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            {...register('colorsAboveThree', { valueAsNumber: true })}
          />
          <Input
            label="Accent Walls ($60/wall)"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            {...register('accentWalls', { valueAsNumber: true })}
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

      <PaintTypeSelector register={register} />
      <MarkupSelector register={register} />
      <ModifierSection register={register} modifiers={interiorModifiers} />

      {result && result.total > 0 && (
        <>
          <BidSummary result={result} />
          <CostBreakdown result={result} breakdown={result.breakdown} />
        </>
      )}
    </div>
  );
}
