import type { UseFormRegister } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '../../common/Card';
import { useSettingsStore } from '../../../store/settingsStore';

interface PaintTypeSelectorProps {
  register: UseFormRegister<any>;
  isExterior?: boolean;
  fieldName?: string;
}

export function PaintTypeSelector({
  register,
  isExterior = false,
  fieldName = 'paintType'
}: PaintTypeSelectorProps) {
  const { settings } = useSettingsStore();
  const paintPrices = isExterior
    ? settings.pricing.exteriorPaint
    : settings.pricing.interiorPaint;

  const paintOptions = Object.entries(paintPrices).map(([type, price]) => ({
    value: type,
    label: `${type} ($${price}/gal)`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paint Type</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {paintOptions.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <input
              type="radio"
              value={option.value}
              className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-2 focus:ring-primary-500"
              {...register(fieldName, { required: true })}
            />
            <span className="text-sm font-medium text-gray-700">
              {option.label}
            </span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
