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
      <CardContent>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          {...register(fieldName, { required: true })}
        >
          {paintOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </CardContent>
    </Card>
  );
}
