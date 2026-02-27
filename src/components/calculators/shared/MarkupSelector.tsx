import type { UseFormRegister } from 'react-hook-form';
import { Select } from '../../common/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../../common/Card';
import { MARKUP_OPTIONS } from '../../../core/constants/pricing';

interface MarkupSelectorProps {
  register: UseFormRegister<any>;
  fieldName?: string;
}

export function MarkupSelector({
  register,
  fieldName = 'markup'
}: MarkupSelectorProps) {
  const markupOptions = MARKUP_OPTIONS.map((value) => ({
    value: value.toString(),
    label: `${value}%`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit Markup</CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          label="Markup Percentage"
          options={markupOptions}
          {...register(fieldName, {
            required: true,
            setValueAs: (value) => parseInt(value, 10)
          })}
        />
        <p className="mt-2 text-xs text-gray-500">
          Markup is applied to the sum of labor and materials
        </p>
      </CardContent>
    </Card>
  );
}
