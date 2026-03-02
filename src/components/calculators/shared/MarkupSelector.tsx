import type { UseFormRegister } from 'react-hook-form';
import { Select } from '../../common/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../../common/Card';
import { useSettingsStore } from '../../../store/settingsStore';

interface MarkupSelectorProps {
  register: UseFormRegister<any>;
  fieldName?: string;
}

export function MarkupSelector({
  register,
  fieldName = 'markup'
}: MarkupSelectorProps) {
  const { settings } = useSettingsStore();
  const marginOptions = (settings.pricing.markupOptions ?? [30, 35, 40, 45, 50]).map((value) => ({
    value: value.toString(),
    label: `${value}%`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Margin Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          label="Margin %"
          options={marginOptions}
          {...register(fieldName, {
            required: true,
            setValueAs: (value) => parseInt(value, 10)
          })}
        />
        <p className="mt-2 text-xs text-gray-500">
          Margin is the percentage of the total price that is profit.
          e.g. 50% margin: $1,000 cost → $2,000 price (50% of price is profit)
        </p>
      </CardContent>
    </Card>
  );
}
