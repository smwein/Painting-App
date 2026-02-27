import type { BidResult } from '../../types/calculator.types';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

interface BidSummaryProps {
  result: BidResult;
}

export function BidSummary({ result }: BidSummaryProps) {
  return (
    <Card className="bg-primary-50 border-primary-200">
      <CardHeader>
        <CardTitle>Bid Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <span className="text-base text-gray-700">Labor:</span>
            <span className="text-lg font-semibold text-gray-900">
              ${result.labor.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <span className="text-base text-gray-700">Materials:</span>
            <span className="text-lg font-semibold text-gray-900">
              ${result.materials.totalCost.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <span className="text-base text-gray-700">Profit:</span>
            <span className="text-lg font-semibold text-gray-900">
              ${result.profit.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xl font-bold text-gray-900">TOTAL:</span>
            <span className="text-3xl font-bold text-primary-700">
              ${result.total.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
