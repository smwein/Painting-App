import type { BidResult } from '../../types/calculator.types';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

interface BidSummaryProps {
  result: BidResult;
}

export function BidSummary({ result }: BidSummaryProps) {
  const total = result.total;
  const laborPct = total > 0 ? ((result.labor / total) * 100).toFixed(0) : '0';
  const materialPct = total > 0 ? ((result.materials.totalCost / total) * 100).toFixed(0) : '0';
  const profitPct = total > 0 ? ((result.profit / total) * 100).toFixed(0) : '0';

  return (
    <Card className="bg-primary-50 border-primary-200">
      <CardHeader>
        <CardTitle>Bid Total</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Labor Cost</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">({laborPct}%)</span>
            <span className="text-lg font-semibold text-gray-800">
              ${result.labor.toFixed(2)}
            </span>
          </div>
        </div>
        {result.materials.totalCost > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Material Cost</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">({materialPct}%)</span>
              <span className="text-lg font-semibold text-gray-800">
                ${result.materials.totalCost.toFixed(2)}
              </span>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Gross Profit</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-600 font-medium">({profitPct}%)</span>
            <span className="text-lg font-semibold text-green-700">
              ${result.profit.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="border-t border-primary-200 pt-3 flex justify-between items-center">
          <span className="text-base font-semibold text-gray-700">Retail Total</span>
          <span className="text-3xl font-bold text-primary-700">
            ${result.total.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
