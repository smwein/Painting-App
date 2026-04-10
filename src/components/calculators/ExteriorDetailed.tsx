import { useMemo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '../common/Input';
import { Card, CardContent } from '../common/Card';
import { CustomerInfoSection } from './shared/CustomerInfoSection';
import { ModifierSection } from './shared/ModifierSection';
import { SurfacePaintTypeSelector } from './shared/SurfacePaintTypeSelector';
import { MarkupSelector } from './shared/MarkupSelector';
import { BidSummary } from '../results/BidSummary';
import { PaintGallonsEstimate } from '../results/PaintGallonsEstimate';
import { JobDurationEstimate } from '../results/JobDurationEstimate';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import type { ExteriorDetailedInputs } from '../../types/calculator.types';
import type { CustomerInfo, Bid } from '../../types/bid.types';
import { calculateExteriorDetailed } from '../../core/calculators/exteriorDetailed';
import { calculateExteriorSqftAutoMeasurements } from '../../core/calculators/exteriorSquareFootage';

function SortableSection({ id, children }: { id: string; children: (props: { dragHandleProps: React.HTMLAttributes<HTMLElement> }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

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
  wallPaintType: string;
  trimPaintType: string;
  markup: number;
  'modifiers.threeStory': boolean;
  'modifiers.extensivePrep': boolean;
  'modifiers.hardTerrain': boolean;
  'modifiers.additionalCoat': boolean;
  'modifiers.oneCoat': boolean;
}

function getExteriorModifiersList(pricing: import('../../types/settings.types').PricingSettings) {
  if (pricing.exteriorModifiers && pricing.exteriorModifiers.length > 0) {
    return pricing.exteriorModifiers
      .sort((a, b) => a.order - b.order)
      .map((mod) => ({
        name: `dynamicMod.${mod.id}`,
        label: `${mod.name} (×${mod.multiplier})`,
      }));
  }
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
  const { settings, updateSection } = useSettingsStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const pricing = settings.pricing;
  const hiddenItems = pricing.hiddenLineItems ?? [];
  const isHidden = (id: string) => hiddenItems.includes(id);

  const HideableField = ({ lineItemId, children }: { lineItemId: string; children: React.ReactNode }) => {
    if (isHidden(lineItemId)) return null;
    return <>{children}</>;
  };

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

  // All sections for exterior-detailed sorted by order
  const allExtSections = pricing.sections
    .filter((s) => s.calculatorType === 'exterior-detailed')
    .sort((a, b) => a.order - b.order);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = allExtSections.findIndex((s) => s.id === active.id);
    const newIndex = allExtSections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(allExtSections, oldIndex, newIndex);
    reordered.forEach((section, index) => {
      updateSection(section.id, { order: index + 1 });
    });
  };

  // State for custom section line item quantities
  const [customValues, setCustomValues] = useState<Record<string, number>>({});

  // Dynamic modifier state
  const [dynamicModifiers, setDynamicModifiers] = useState<Record<string, boolean>>({});
  const useDynamicModifiers = !!(pricing.exteriorModifiers && pricing.exteriorModifiers.length > 0);

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
      wallPaintType: 'SuperPaint',
      trimPaintType: 'SuperPaint',
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
  const wallPaintType = watch('wallPaintType');
  const trimPaintType = watch('trimPaintType');
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
        wallPaintType: inputs.wallPaintType ?? inputs.paintType,
        trimPaintType: inputs.trimPaintType ?? inputs.paintType,
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
      wallPaintType: wallPaintType,
      trimPaintType: trimPaintType,
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

    return calculateExteriorDetailed(
      useDynamicModifiers ? { ...inputs, dynamicModifiers } : inputs,
      pricing
    );
  }, [
    wallSqft, trimFasciaSoffitLF, doors, shutters, doorsToRefinish,
    primingSqft, primingLF, sidingReplacementSqft, trimReplacementLF,
    soffitFasciaReplacementLF, bondoRepairs, deckStainingSqft,
    miscPressureWashingSqft, miscWorkHours, miscellaneousDollars,
    paintType, wallPaintType, trimPaintType, markup,
    modifierThreeStory, modifierExtensivePrep,
    modifierHardTerrain, modifierAdditionalCoat, modifierOneCoat,
    customValues, pricing, dynamicModifiers, useDynamicModifiers,
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
      {isAdmin ? (
      <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
        <SortableContext items={allExtSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
      {allExtSections.map((section) => {
        const unitLabel: Record<string, string> = { sqft: '/sqft', lf: '/LF', each: '/each', hour: '/hour', dollars: '' };

        const sectionHeader = (sectionId: string, dragHandleProps: React.HTMLAttributes<HTMLElement>) => (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  {...dragHandleProps}
                  className="touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-xl px-1"
                  title="Drag to reorder"
                >⠿</button>
              )}
              <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
            </div>
            <button onClick={() => toggleSection(sectionId)} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
              {collapsed[sectionId] ? '+ Show' : '− Hide'}
            </button>
          </div>
        );

        const renderInner = (dhp: React.HTMLAttributes<HTMLElement>) => {
          if (section.id === 'ext-measurements') return (
            <Card>
              {sectionHeader('ext-measurements', dhp)}
              {!collapsed['ext-measurements'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <HideableField lineItemId="ext-wall-sqft"><Input label={`Wall/Siding Sq Ft ($${getRate('ext-wall-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('wallSqft', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="ext-trim-fascia-soffit-lf"><Input label={`Trim/Fascia/Soffit LF ($${getRate('ext-trim-fascia-soffit-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('trimFasciaSoffitLF', { valueAsNumber: true })} /></HideableField>
                  </div>
                  <SectionSubtotal total={measurementsSubtotal} />
                </div>
              )}
            </Card>
          );

          if (section.id === 'ext-doors-shutters') return (
            <Card>
              {sectionHeader('ext-doors-shutters', dhp)}
              {!collapsed['ext-doors-shutters'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <HideableField lineItemId="ext-door"><Input label={`Doors ($${getRate('ext-door').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('doors', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="ext-shutter"><Input label={`Shutters ($${getRate('ext-shutter').toFixed(0)}/shutter)`} type="number" min="0" step="1" placeholder="0" {...register('shutters', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="ext-door-refinish"><Input label={`Doors to Refinish ($${getRate('ext-door-refinish').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('doorsToRefinish', { valueAsNumber: true })} /></HideableField>
                  </div>
                  <SectionSubtotal total={doorsSubtotal} />
                </div>
              )}
            </Card>
          );

          if (section.id === 'ext-prep-work') return (
            <Card>
              {sectionHeader('ext-prep-work', dhp)}
              {!collapsed['ext-prep-work'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <HideableField lineItemId="ext-priming-sqft"><Input label={`Priming Sq Ft ($${getRate('ext-priming-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('primingSqft', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="ext-priming-lf"><Input label={`Priming LF ($${getRate('ext-priming-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('primingLF', { valueAsNumber: true })} /></HideableField>
                  </div>
                  <SectionSubtotal total={prepSubtotal} />
                </div>
              )}
            </Card>
          );

          if (section.id === 'ext-replacements-repairs') return (
            <Card>
              {sectionHeader('ext-replacements-repairs', dhp)}
              {!collapsed['ext-replacements-repairs'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <HideableField lineItemId="ext-siding-replacement-sqft"><Input label={`Siding Replacement Sq Ft ($${getRate('ext-siding-replacement-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('sidingReplacementSqft', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="ext-trim-replacement-lf"><Input label={`Trim Replacement LF ($${getRate('ext-trim-replacement-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('trimReplacementLF', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="ext-soffit-fascia-replacement-lf"><Input label={`Soffit/Fascia Replacement LF ($${getRate('ext-soffit-fascia-replacement-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('soffitFasciaReplacementLF', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="ext-bondo-repair"><Input label={`Bondo Repairs ($${getRate('ext-bondo-repair').toFixed(0)}/repair)`} type="number" min="0" step="1" placeholder="0" {...register('bondoRepairs', { valueAsNumber: true })} /></HideableField>
                  </div>
                  <SectionSubtotal total={replacementsSubtotal} />
                </div>
              )}
            </Card>
          );

          if (section.id === 'ext-additional') return (
            <Card>
              {sectionHeader('ext-additional', dhp)}
              {!collapsed['ext-additional'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <HideableField lineItemId="ext-deck-staining-sqft"><Input label={`Deck Staining Sq Ft ($${getRate('ext-deck-staining-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('deckStainingSqft', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="ext-misc-pressure-washing-sqft"><Input label={`Misc Pressure Washing Sq Ft ($${getRate('ext-misc-pressure-washing-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('miscPressureWashingSqft', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="ext-misc-work-hour"><Input label={`Misc Work Hours ($${getRate('ext-misc-work-hour').toFixed(0)}/hour)`} type="number" min="0" step="0.1" placeholder="0" {...register('miscWorkHours', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="ext-miscellaneous-dollars"><Input label="Miscellaneous $ (custom)" type="number" min="0" step="0.01" placeholder="0" {...register('miscellaneousDollars', { valueAsNumber: true })} /></HideableField>
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
            <Card>
              {sectionHeader(section.id, dhp)}
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
        };

        return (
          <SortableSection key={section.id} id={section.id}>
            {({ dragHandleProps: dhp }) => renderInner(dhp)}
          </SortableSection>
        );
      })}
          </div>
        </SortableContext>
      </DndContext>
      ) : (
        <div className="space-y-6">
          {allExtSections.map((section) => {
            const unitLabel: Record<string, string> = { sqft: '/sqft', lf: '/LF', each: '/each', hour: '/hour', dollars: '' };

            const sectionHeader = (sectionId: string) => (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleSection(sectionId)} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                    {collapsed[sectionId] ? '+ Show' : '− Hide'}
                  </button>
                </div>
              </div>
            );

            if (section.id === 'ext-measurements') return (
              <Card key={section.id}>
                {sectionHeader('ext-measurements')}
                {!collapsed['ext-measurements'] && (
                  <div className="mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <HideableField lineItemId="ext-wall-sqft"><Input label={`Wall/Siding Sq Ft ($${getRate('ext-wall-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('wallSqft', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="ext-trim-fascia-soffit-lf"><Input label={`Trim/Fascia/Soffit LF ($${getRate('ext-trim-fascia-soffit-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('trimFasciaSoffitLF', { valueAsNumber: true })} /></HideableField>
                    </div>
                    <SectionSubtotal total={measurementsSubtotal} />
                  </div>
                )}
              </Card>
            );

            if (section.id === 'ext-doors-shutters') return (
              <Card key={section.id}>
                {sectionHeader('ext-doors-shutters')}
                {!collapsed['ext-doors-shutters'] && (
                  <div className="mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <HideableField lineItemId="ext-door"><Input label={`Doors ($${getRate('ext-door').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('doors', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="ext-shutter"><Input label={`Shutters ($${getRate('ext-shutter').toFixed(0)}/shutter)`} type="number" min="0" step="1" placeholder="0" {...register('shutters', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="ext-door-refinish"><Input label={`Doors to Refinish ($${getRate('ext-door-refinish').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('doorsToRefinish', { valueAsNumber: true })} /></HideableField>
                    </div>
                    <SectionSubtotal total={doorsSubtotal} />
                  </div>
                )}
              </Card>
            );

            if (section.id === 'ext-prep-work') return (
              <Card key={section.id}>
                {sectionHeader('ext-prep-work')}
                {!collapsed['ext-prep-work'] && (
                  <div className="mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <HideableField lineItemId="ext-priming-sqft"><Input label={`Priming Sq Ft ($${getRate('ext-priming-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('primingSqft', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="ext-priming-lf"><Input label={`Priming LF ($${getRate('ext-priming-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('primingLF', { valueAsNumber: true })} /></HideableField>
                    </div>
                    <SectionSubtotal total={prepSubtotal} />
                  </div>
                )}
              </Card>
            );

            if (section.id === 'ext-replacements-repairs') return (
              <Card key={section.id}>
                {sectionHeader('ext-replacements-repairs')}
                {!collapsed['ext-replacements-repairs'] && (
                  <div className="mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <HideableField lineItemId="ext-siding-replacement-sqft"><Input label={`Siding Replacement Sq Ft ($${getRate('ext-siding-replacement-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('sidingReplacementSqft', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="ext-trim-replacement-lf"><Input label={`Trim Replacement LF ($${getRate('ext-trim-replacement-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('trimReplacementLF', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="ext-soffit-fascia-replacement-lf"><Input label={`Soffit/Fascia Replacement LF ($${getRate('ext-soffit-fascia-replacement-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('soffitFasciaReplacementLF', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="ext-bondo-repair"><Input label={`Bondo Repairs ($${getRate('ext-bondo-repair').toFixed(0)}/repair)`} type="number" min="0" step="1" placeholder="0" {...register('bondoRepairs', { valueAsNumber: true })} /></HideableField>
                    </div>
                    <SectionSubtotal total={replacementsSubtotal} />
                  </div>
                )}
              </Card>
            );

            if (section.id === 'ext-additional') return (
              <Card key={section.id}>
                {sectionHeader('ext-additional')}
                {!collapsed['ext-additional'] && (
                  <div className="mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <HideableField lineItemId="ext-deck-staining-sqft"><Input label={`Deck Staining Sq Ft ($${getRate('ext-deck-staining-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('deckStainingSqft', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="ext-misc-pressure-washing-sqft"><Input label={`Misc Pressure Washing Sq Ft ($${getRate('ext-misc-pressure-washing-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('miscPressureWashingSqft', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="ext-misc-work-hour"><Input label={`Misc Work Hours ($${getRate('ext-misc-work-hour').toFixed(0)}/hour)`} type="number" min="0" step="0.1" placeholder="0" {...register('miscWorkHours', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="ext-miscellaneous-dollars"><Input label="Miscellaneous $ (custom)" type="number" min="0" step="0.01" placeholder="0" {...register('miscellaneousDollars', { valueAsNumber: true })} /></HideableField>
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
        </div>
      )}

      <SurfacePaintTypeSelector register={register} setValue={setValue} watch={watch} isExterior />
      <MarkupSelector register={register} />
      {useDynamicModifiers ? (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Modifiers</h3>
          <CardContent className="space-y-2">
            {pricing.exteriorModifiers!.sort((a, b) => a.order - b.order).map((mod) => (
              <label
                key={mod.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  dynamicModifiers[mod.id] ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <input
                  type="checkbox"
                  checked={dynamicModifiers[mod.id] ?? false}
                  onChange={(e) => setDynamicModifiers((prev) => ({ ...prev, [mod.id]: e.target.checked }))}
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 flex-1">{mod.name} (×{mod.multiplier})</span>
                <span className="text-xs text-gray-400">{mod.scope === 'both' ? 'Labor + Materials' : mod.scope === 'materials' ? 'Materials' : 'Labor'}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      ) : (
        <ModifierSection register={register} modifiers={getExteriorModifiersList(pricing)} />
      )}

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
