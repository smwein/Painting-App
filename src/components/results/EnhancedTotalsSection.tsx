import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { BidResult } from '../../types/calculator.types';
import type { PricingSettings } from '../../types/settings.types';

interface EnhancedTotalsSectionProps {
  result: BidResult;
  pricing: PricingSettings;
}

/**
 * Requirement #9: Enhanced totals section with crew size toggle
 * Shows comprehensive summary: labor, materials, profit, total, and estimated days
 */
export function EnhancedTotalsSection({ result, pricing }: EnhancedTotalsSectionProps) {
  const [selectedCrewSize, setSelectedCrewSize] = useState<2 | 3 | 4>(2);

  const selectedCrew = pricing.crewRates.find((c) => c.crewSize === selectedCrewSize);
  const estimatedDays = selectedCrew ? Math.ceil(result.labor / selectedCrew.dailyRate) : 0;

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <CardTitle className="text-xl">Project Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-gray-700">
            <span>Total Labor Cost:</span>
            <span className="font-medium">${result.labor.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Total Materials Cost:</span>
            <span className="font-medium">${result.materials.totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Total Profit:</span>
            <span className="font-medium">${result.profit.toFixed(2)}</span>
          </div>
          <div className="border-t-2 border-indigo-300 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-xl font-bold text-indigo-900">Grand Total:</span>
              <span className="text-xl font-bold text-indigo-900">${result.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Crew Size Selector */}
        <div className="mt-6 pt-4 border-t border-indigo-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Estimated Job Duration (select crew size):
          </label>
          <div className="flex gap-2 mb-4">
            {pricing.crewRates.map((crew) => (
              <button
                key={crew.crewSize}
                onClick={() => setSelectedCrewSize(crew.crewSize)}
                className={`
                  flex-1 px-4 py-2 rounded-lg font-medium transition-all
                  ${
                    selectedCrewSize === crew.crewSize
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-indigo-400'
                  }
                `}
              >
                {crew.crewSize}-Person
              </button>
            ))}
          </div>
          <div className="text-center p-6 bg-white rounded-lg border-2 border-indigo-300">
            <div className="text-5xl font-bold text-indigo-600">{estimatedDays}</div>
            <div className="text-lg text-gray-600 mt-2">
              {estimatedDays === 1 ? 'day' : 'days'}
            </div>
            {selectedCrew && (
              <div className="text-sm text-gray-500 mt-2">
                ({selectedCrewSize}-person crew @ ${selectedCrew.dailyRate}/day)
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
