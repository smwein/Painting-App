import type { BidResult } from '../../types/calculator.types';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

interface BidSummaryProps {
  result: BidResult;
}

export function BidSummary({ result }: BidSummaryProps) {
  const cost = result.labor + result.materials.totalCost;
  const profitMargin = cost > 0 ? ((result.profit / cost) * 100).toFixed(1) : '0';

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200">
      <CardHeader>
        <CardTitle className="text-indigo-900">💰 Internal Bid Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Breakdown */}
        <div className="bg-white rounded-lg p-4 space-y-2">
          <div className="text-sm font-semibold text-gray-600 uppercase mb-3">Your Costs</div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Labor Cost:</span>
            <span className="text-base font-medium text-gray-900">
              ${result.labor.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Materials Cost:</span>
            <span className="text-base font-medium text-gray-900">
              ${result.materials.totalCost.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-base font-semibold text-gray-900">Total Cost:</span>
            <span className="text-lg font-bold text-gray-900">
              ${cost.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Profit */}
        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-semibold text-green-800">Your Profit</div>
              <div className="text-xs text-green-600">{profitMargin}% margin</div>
            </div>
            <span className="text-2xl font-bold text-green-700">
              +${result.profit.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Retail Price */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-medium opacity-90">Customer Pays (Retail)</div>
              <div className="text-xs opacity-75">Price to quote</div>
            </div>
            <span className="text-3xl font-bold">
              ${result.total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white rounded p-2">
            <div className="text-gray-500">Cost</div>
            <div className="font-semibold text-gray-900">${cost.toFixed(0)}</div>
          </div>
          <div className="bg-white rounded p-2">
            <div className="text-gray-500">Profit</div>
            <div className="font-semibold text-green-600">${result.profit.toFixed(0)}</div>
          </div>
          <div className="bg-white rounded p-2">
            <div className="text-gray-500">Retail</div>
            <div className="font-semibold text-indigo-600">${result.total.toFixed(0)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
