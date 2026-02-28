import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { BidResult } from '../../types/calculator.types';

interface PreMarkupBreakdownProps {
  result: BidResult;
}

/**
 * Requirement #6: Display cost breakdown before markup is applied
 * Shows labor, materials, and total project cost (before profit)
 */
export function PreMarkupBreakdown({ result }: PreMarkupBreakdownProps) {
  const totalCost = result.labor + result.materials.totalCost;

  return (
    <Card className="bg-slate-50 border-slate-300">
      <CardHeader>
        <CardTitle>Cost Breakdown (Before Markup)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-700">Total Labor Cost:</span>
            <span className="font-medium">${result.labor.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Total Materials Cost:</span>
            <span className="font-medium">${result.materials.totalCost.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-300 pt-2 mt-2">
            <div className="flex justify-between font-bold text-slate-900">
              <span>Total Project Cost:</span>
              <span>${totalCost.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            This is the base cost before profit markup is applied.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
