import type { UseFormRegister } from 'react-hook-form';
import { Input } from '../../common/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../common/Card';

interface CustomerInfoSectionProps {
  register: UseFormRegister<any>;
}

export function CustomerInfoSection({ register }: CustomerInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          label="Customer Name"
          type="text"
          placeholder="John Doe"
          {...register('customer.name', { required: true })}
        />
        <Input
          label="Address"
          type="text"
          placeholder="123 Main St, City, State 12345"
          {...register('customer.address', { required: true })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phone"
            type="tel"
            placeholder="(555) 123-4567"
            {...register('customer.phone', { required: true })}
          />
          <Input
            label="Email (optional)"
            type="email"
            placeholder="customer@email.com"
            {...register('customer.email')}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Job Date (optional)"
            type="date"
            {...register('customer.jobDate')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            placeholder="Additional notes about the job..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={3}
            {...register('customer.notes')}
          />
        </div>
      </CardContent>
    </Card>
  );
}
