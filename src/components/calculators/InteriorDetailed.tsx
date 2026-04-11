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
  wallPaintType: string;
  ceilingPaintType: string;
  trimPaintType: string;
  markup: number;
  'modifiers.heavilyFurnished': boolean;
  'modifiers.emptyHouse': boolean;
  'modifiers.extensivePrep': boolean;
  'modifiers.additionalCoat': boolean;
  'modifiers.oneCoat': boolean;
}

function getInteriorModifiersList(pricing: import('../../types/settings.types').PricingSettings) {
  // Use dynamic modifiers array if available, fallback to old fixed format
  if (pricing.interiorModifiers && pricing.interiorModifiers.length > 0) {
    return pricing.interiorModifiers
      .sort((a, b) => a.order - b.order)
      .map((mod) => ({
        name: `dynamicMod.${mod.id}`,
        label: `${mod.name} (×${mod.multiplier})`,
      }));
  }
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

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = allIntSections.findIndex((s) => s.id === active.id);
    const newIndex = allIntSections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(allIntSections, oldIndex, newIndex);
    reordered.forEach((section, index) => {
      updateSection(section.id, { order: index + 1 });
    });
  };

  // State for custom section line item quantities
  const [customValues, setCustomValues] = useState<Record<string, number>>({});

  // Dynamic modifier state (for new configurable modifiers)
  const [dynamicModifiers, setDynamicModifiers] = useState<Record<string, boolean>>({});
  const useDynamicModifiers = !!(pricing.interiorModifiers && pricing.interiorModifiers.length > 0);

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
      wallPaintType: 'SuperPaint',
      ceilingPaintType: 'SuperPaint',
      trimPaintType: 'SuperPaint',
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
  const wallPaintType = watch('wallPaintType');
  const ceilingPaintType = watch('ceilingPaintType');
  const trimPaintType = watch('trimPaintType');
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
        wallPaintType: inputs.wallPaintType ?? inputs.paintType,
        ceilingPaintType: inputs.ceilingPaintType ?? inputs.paintType,
        trimPaintType: inputs.trimPaintType ?? inputs.paintType,
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
      wallPaintType: wallPaintType,
      ceilingPaintType: ceilingPaintType,
      trimPaintType: trimPaintType,
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

    return calculateInteriorDetailed(
      useDynamicModifiers ? { ...inputs, dynamicModifiers } : inputs,
      pricing
    );
  }, [
    wallSqft, ceilingSqft, trimLF, doors, cabinetDoors, cabinetDrawers,
    newCabinetDoors, newCabinetDrawers, colorsAboveThree, wallpaperRemovalSqft,
    primingLF, primingSqft, drywallReplacementSqft, popcornRemovalSqft,
    wallTextureRemovalSqft, trimReplacementLF, drywallRepairs, accentWalls,
    miscWorkHours, miscellaneousDollars, paintType, wallPaintType,
    ceilingPaintType, trimPaintType, markup,
    modifierHeavilyFurnished, modifierEmptyHouse, modifierExtensivePrep,
    modifierAdditionalCoat, modifierOneCoat, customValues,
    houseCondition, pricing, dynamicModifiers, useDynamicModifiers,
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

  // Render custom (non-default) line items added to a built-in section
  const unitLabel: Record<string, string> = { sqft: '/sqft', lf: '/LF', each: '/each', hour: '/hour', dollars: '' };
  const renderCustomItemsForSection = (sectionId: string) => {
    const customItems = pricing.lineItems
      .filter((item) => item.category === sectionId && !item.isDefault)
      .sort((a, b) => a.order - b.order);
    if (customItems.length === 0) return null;
    return (
      <>
        {customItems.map((item) => (
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
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* House Condition */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">House Condition</h3>
        <CardContent>
          <label className="block text-sm font-medium text-gray-700 mb-1">Is the house furnished or empty?</label>
          <select
            value={houseCondition}
            onChange={(e) => setHouseCondition(e.target.value as HouseCondition)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="furnished">Furnished</option>
            <option value="empty">Empty</option>
          </select>
        </CardContent>
      </Card>

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
      {isAdmin ? (
      <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
        <SortableContext items={allIntSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
      {allIntSections.map((section) => {
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
          if (section.id === 'int-measurements') return (
            <Card>
              {sectionHeader('int-measurements', dhp)}
              {!collapsed['int-measurements'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <HideableField lineItemId="int-wall-sqft"><Input label={`Wall Sq Ft ($${getRate('int-wall-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('wallSqft', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-ceiling-sqft"><Input label={`Ceiling Sq Ft ($${getRate('int-ceiling-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('ceilingSqft', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-trim-lf"><Input label={`Trim LF ($${getRate('int-trim-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('trimLF', { valueAsNumber: true })} /></HideableField>
                    {renderCustomItemsForSection('int-measurements')}
                  </div>
                  <SectionSubtotal total={measurementsSubtotal} />
                </div>
              )}
            </Card>
          );

          if (section.id === 'int-doors-cabinets') return (
            <Card>
              {sectionHeader('int-doors-cabinets', dhp)}
              {!collapsed['int-doors-cabinets'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <HideableField lineItemId="int-door"><Input label={`Doors ($${getRate('int-door').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('doors', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-cabinet-door"><Input label={`Cabinet Doors ($${getRate('int-cabinet-door').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('cabinetDoors', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-cabinet-drawer"><Input label={`Cabinet Drawers ($${getRate('int-cabinet-drawer').toFixed(0)}/drawer)`} type="number" min="0" step="1" placeholder="0" {...register('cabinetDrawers', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-new-cabinet-door"><Input label={`New Cabinet Doors ($${getRate('int-new-cabinet-door').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('newCabinetDoors', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-new-cabinet-drawer"><Input label={`New Cabinet Drawers ($${getRate('int-new-cabinet-drawer').toFixed(0)}/drawer)`} type="number" min="0" step="1" placeholder="0" {...register('newCabinetDrawers', { valueAsNumber: true })} /></HideableField>
                    {renderCustomItemsForSection('int-doors-cabinets')}
                  </div>
                  <SectionSubtotal total={doorsSubtotal} />
                </div>
              )}
            </Card>
          );

          if (section.id === 'int-prep-work') return (
            <Card>
              {sectionHeader('int-prep-work', dhp)}
              {!collapsed['int-prep-work'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <HideableField lineItemId="int-wallpaper-removal-sqft"><Input label={`Wallpaper Removal Sq Ft ($${getRate('int-wallpaper-removal-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('wallpaperRemovalSqft', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-priming-lf"><Input label={`Priming LF ($${getRate('int-priming-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('primingLF', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-priming-sqft"><Input label={`Priming Sq Ft ($${getRate('int-priming-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('primingSqft', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-drywall-replacement-sqft"><Input label={`Drywall Replacement Sq Ft ($${getRate('int-drywall-replacement-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('drywallReplacementSqft', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-popcorn-removal-sqft"><Input label={`Popcorn Removal Sq Ft ($${getRate('int-popcorn-removal-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('popcornRemovalSqft', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-wall-texture-removal-sqft"><Input label={`Wall Texture Removal Sq Ft ($${getRate('int-wall-texture-removal-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('wallTextureRemovalSqft', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-trim-replacement-lf"><Input label={`Trim Replacement LF ($${getRate('int-trim-replacement-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('trimReplacementLF', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-drywall-repair"><Input label={`Drywall Repairs ($${getRate('int-drywall-repair').toFixed(0)}/repair)`} type="number" min="0" step="1" placeholder="0" {...register('drywallRepairs', { valueAsNumber: true })} /></HideableField>
                    {renderCustomItemsForSection('int-prep-work')}
                  </div>
                  <SectionSubtotal total={prepSubtotal} />
                </div>
              )}
            </Card>
          );

          if (section.id === 'int-additional') return (
            <Card>
              {sectionHeader('int-additional', dhp)}
              {!collapsed['int-additional'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <HideableField lineItemId="int-color-above-three"><Input label={`Colors Above 3 ($${getRate('int-color-above-three').toFixed(0)}/color)`} type="number" min="0" step="1" placeholder="0" {...register('colorsAboveThree', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-accent-wall"><Input label={`Accent Walls ($${getRate('int-accent-wall').toFixed(0)}/wall)`} type="number" min="0" step="1" placeholder="0" {...register('accentWalls', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-misc-work-hour"><Input label={`Misc Work Hours ($${getRate('int-misc-work-hour').toFixed(0)}/hour)`} type="number" min="0" step="0.1" placeholder="0" {...register('miscWorkHours', { valueAsNumber: true })} /></HideableField>
                    <HideableField lineItemId="int-miscellaneous-dollars"><Input label="Miscellaneous $ (custom)" type="number" min="0" step="0.01" placeholder="0" {...register('miscellaneousDollars', { valueAsNumber: true })} /></HideableField>
                    {renderCustomItemsForSection('int-additional')}
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
          {allIntSections.map((section) => {
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

            if (section.id === 'int-measurements') return (
              <Card key={section.id}>
                {sectionHeader('int-measurements')}
                {!collapsed['int-measurements'] && (
                  <div className="mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <HideableField lineItemId="int-wall-sqft"><Input label={`Wall Sq Ft ($${getRate('int-wall-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('wallSqft', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-ceiling-sqft"><Input label={`Ceiling Sq Ft ($${getRate('int-ceiling-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('ceilingSqft', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-trim-lf"><Input label={`Trim LF ($${getRate('int-trim-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('trimLF', { valueAsNumber: true })} /></HideableField>
                      {renderCustomItemsForSection('int-measurements')}
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
                      <HideableField lineItemId="int-door"><Input label={`Doors ($${getRate('int-door').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('doors', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-cabinet-door"><Input label={`Cabinet Doors ($${getRate('int-cabinet-door').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('cabinetDoors', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-cabinet-drawer"><Input label={`Cabinet Drawers ($${getRate('int-cabinet-drawer').toFixed(0)}/drawer)`} type="number" min="0" step="1" placeholder="0" {...register('cabinetDrawers', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-new-cabinet-door"><Input label={`New Cabinet Doors ($${getRate('int-new-cabinet-door').toFixed(0)}/door)`} type="number" min="0" step="1" placeholder="0" {...register('newCabinetDoors', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-new-cabinet-drawer"><Input label={`New Cabinet Drawers ($${getRate('int-new-cabinet-drawer').toFixed(0)}/drawer)`} type="number" min="0" step="1" placeholder="0" {...register('newCabinetDrawers', { valueAsNumber: true })} /></HideableField>
                      {renderCustomItemsForSection('int-doors-cabinets')}
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
                      <HideableField lineItemId="int-wallpaper-removal-sqft"><Input label={`Wallpaper Removal Sq Ft ($${getRate('int-wallpaper-removal-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('wallpaperRemovalSqft', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-priming-lf"><Input label={`Priming LF ($${getRate('int-priming-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('primingLF', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-priming-sqft"><Input label={`Priming Sq Ft ($${getRate('int-priming-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('primingSqft', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-drywall-replacement-sqft"><Input label={`Drywall Replacement Sq Ft ($${getRate('int-drywall-replacement-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('drywallReplacementSqft', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-popcorn-removal-sqft"><Input label={`Popcorn Removal Sq Ft ($${getRate('int-popcorn-removal-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('popcornRemovalSqft', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-wall-texture-removal-sqft"><Input label={`Wall Texture Removal Sq Ft ($${getRate('int-wall-texture-removal-sqft').toFixed(2)}/sqft)`} type="number" min="0" step="0.1" placeholder="0" {...register('wallTextureRemovalSqft', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-trim-replacement-lf"><Input label={`Trim Replacement LF ($${getRate('int-trim-replacement-lf').toFixed(2)}/LF)`} type="number" min="0" step="0.1" placeholder="0" {...register('trimReplacementLF', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-drywall-repair"><Input label={`Drywall Repairs ($${getRate('int-drywall-repair').toFixed(0)}/repair)`} type="number" min="0" step="1" placeholder="0" {...register('drywallRepairs', { valueAsNumber: true })} /></HideableField>
                      {renderCustomItemsForSection('int-prep-work')}
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
                      <HideableField lineItemId="int-color-above-three"><Input label={`Colors Above 3 ($${getRate('int-color-above-three').toFixed(0)}/color)`} type="number" min="0" step="1" placeholder="0" {...register('colorsAboveThree', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-accent-wall"><Input label={`Accent Walls ($${getRate('int-accent-wall').toFixed(0)}/wall)`} type="number" min="0" step="1" placeholder="0" {...register('accentWalls', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-misc-work-hour"><Input label={`Misc Work Hours ($${getRate('int-misc-work-hour').toFixed(0)}/hour)`} type="number" min="0" step="0.1" placeholder="0" {...register('miscWorkHours', { valueAsNumber: true })} /></HideableField>
                      <HideableField lineItemId="int-miscellaneous-dollars"><Input label="Miscellaneous $ (custom)" type="number" min="0" step="0.01" placeholder="0" {...register('miscellaneousDollars', { valueAsNumber: true })} /></HideableField>
                      {renderCustomItemsForSection('int-additional')}
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

      <SurfacePaintTypeSelector register={register} setValue={setValue} watch={watch} />
      <MarkupSelector register={register} />
      {useDynamicModifiers ? (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Modifiers</h3>
          <CardContent className="space-y-2">
            {pricing.interiorModifiers!.sort((a, b) => a.order - b.order).map((mod) => (
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
        <ModifierSection register={register} modifiers={getInteriorModifiersList(pricing)} />
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
