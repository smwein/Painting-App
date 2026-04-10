import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '../../common/Card';
import { useSettingsStore } from '../../../store/settingsStore';

interface SurfacePaintTypeSelectorProps {
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  isExterior?: boolean;
}

export function SurfacePaintTypeSelector({
  register,
  setValue,
  watch,
  isExterior = false,
}: SurfacePaintTypeSelectorProps) {
  const { settings } = useSettingsStore();
  const paintPrices = isExterior
    ? settings.pricing.exteriorPaint
    : settings.pricing.interiorPaint;

  const paintOptions = Object.entries(paintPrices).map(([type, price]) => ({
    value: type,
    label: `${type} ($${price}/gal)`,
  }));

  const mainPaintType = watch('paintType');
  const wallPaintType = watch('wallPaintType');
  const ceilingPaintType = watch('ceilingPaintType');
  const trimPaintType = watch('trimPaintType');

  // When main paint type changes, update any surface that hasn't been individually set
  const handleMainChange = (value: string) => {
    setValue('paintType', value);
    if (!wallPaintType || wallPaintType === mainPaintType) setValue('wallPaintType', value);
    if (!isExterior && (!ceilingPaintType || ceilingPaintType === mainPaintType)) setValue('ceilingPaintType', value);
    if (!trimPaintType || trimPaintType === mainPaintType) setValue('trimPaintType', value);
  };

  const surfaces = isExterior
    ? [
        { field: 'wallPaintType', label: 'Siding' },
        { field: 'trimPaintType', label: 'Trim/Fascia/Soffit' },
      ]
    : [
        { field: 'wallPaintType', label: 'Walls' },
        { field: 'ceilingPaintType', label: 'Ceilings' },
        { field: 'trimPaintType', label: 'Trim' },
      ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paint Type</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Default Paint</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={mainPaintType}
            onChange={(e) => handleMainChange(e.target.value)}
          >
            {paintOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className={`grid gap-3 ${isExterior ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {surfaces.map(({ field, label }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                {...register(field)}
              >
                {paintOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
