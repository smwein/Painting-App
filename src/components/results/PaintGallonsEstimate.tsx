import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { BidResult } from '../../types/calculator.types';

interface PaintGallonsEstimateProps {
  result: BidResult;
}

/**
 * Requirement #5: Display estimated paint gallons needed
 * Extracts gallon quantities from material breakdown
 */
export function PaintGallonsEstimate({ result }: PaintGallonsEstimateProps) {
  // Extract gallons from material items
  const wallsGallons = result.materials.items.find((item) =>
    item.name.toLowerCase().includes('wall') || item.name.toLowerCase().includes('siding')
  )?.quantity || 0;

  const ceilingsGallons = result.materials.items.find((item) =>
    item.name.toLowerCase().includes('ceiling')
  )?.quantity || 0;

  const trimGallons = result.materials.items.find((item) =>
    item.name.toLowerCase().includes('trim') || item.name.toLowerCase().includes('fascia')
  )?.quantity || 0;

  const cabinetsGallons = result.materials.items.find((item) =>
    item.name.toLowerCase().includes('cabinet')
  )?.quantity || 0;

  const doorsGallons = result.materials.items.find((item) =>
    item.name.toLowerCase().includes('door') && !item.name.toLowerCase().includes('cabinet')
  )?.quantity || 0;

  const totalGallons = result.materials.items.reduce((sum, item) => sum + item.quantity, 0);

  if (totalGallons === 0) return null;

  return (
    <Card className="bg-amber-50 border-amber-200">
      <CardHeader>
        <CardTitle>Estimated Paint Gallons Needed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {wallsGallons > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-700">Walls/Siding:</span>
              <span className="font-medium">{wallsGallons} gal</span>
            </div>
          )}
          {ceilingsGallons > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-700">Ceilings:</span>
              <span className="font-medium">{ceilingsGallons} gal</span>
            </div>
          )}
          {trimGallons > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-700">Trim/Fascia/Soffit:</span>
              <span className="font-medium">{trimGallons} gal</span>
            </div>
          )}
          {cabinetsGallons > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-700">Cabinets:</span>
              <span className="font-medium">{cabinetsGallons} gal</span>
            </div>
          )}
          {doorsGallons > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-700">Doors:</span>
              <span className="font-medium">{doorsGallons} gal</span>
            </div>
          )}
          <div className="border-t border-amber-300 pt-2 mt-2">
            <div className="flex justify-between font-bold text-amber-900">
              <span>Total Paint Needed:</span>
              <span>{totalGallons} gallons</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
