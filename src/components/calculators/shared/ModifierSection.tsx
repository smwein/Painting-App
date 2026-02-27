import type { UseFormRegister } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '../../common/Card';

interface ModifierOption {
  name: string;
  label: string;
}

interface ModifierSectionProps {
  register: UseFormRegister<any>;
  modifiers: ModifierOption[];
  title?: string;
}

export function ModifierSection({
  register,
  modifiers,
  title = 'Labor Modifiers'
}: ModifierSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {modifiers.map((modifier) => (
          <label
            key={modifier.name}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
              {...register(modifier.name)}
            />
            <span className="text-sm font-medium text-gray-700">
              {modifier.label}
            </span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
