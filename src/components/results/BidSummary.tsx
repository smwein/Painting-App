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
    <Card className="bg-navy text-white">
      <CardHeader>
        <CardTitle className="text-white">Bid Total</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-white/60">Labor Cost</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">({laborPct}%)</span>
            <span className="text-lg font-semibold text-white">
              ${result.labor.toFixed(2)}
            </span>
          </div>
        </div>
        {result.materials.totalCost > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/60">Material Cost</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">({materialPct}%)</span>
              <span className="text-lg font-semibold text-white">
                ${result.materials.totalCost.toFixed(2)}
              </span>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-white/60">Gross Profit</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-teal-400 font-medium">({profitPct}%)</span>
            <span className="text-lg font-semibold text-teal-400">
              ${result.profit.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="border-t border-white/20 pt-3 flex justify-between items-center">
          <span className="text-base font-semibold text-white/80">Retail Total</span>
          <span className="text-3xl font-display font-900 text-gold">
            ${result.total.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
