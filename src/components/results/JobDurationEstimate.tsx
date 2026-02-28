import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { PricingSettings } from '../../types/settings.types';

interface JobDurationEstimateProps {
  laborCost: number;
  pricing: PricingSettings;
}

/**
 * Requirement #8: Display estimated job duration for different crew sizes
 * Formula: Labor Cost ÷ Daily Rate = Days
 */
export function JobDurationEstimate({ laborCost, pricing }: JobDurationEstimateProps) {
  const estimates = pricing.crewRates.map((crew) => ({
    crewSize: crew.crewSize,
    dailyRate: crew.dailyRate,
    days: Math.ceil(laborCost / crew.dailyRate),
  }));

  return (
    <Card className="bg-purple-50 border-purple-200">
      <CardHeader>
        <CardTitle>Estimated Job Duration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {estimates.map((est) => (
            <div key={est.crewSize} className="text-center p-4 bg-white rounded-lg border border-purple-200">
              <div className="text-sm text-gray-600 mb-1">{est.crewSize}-Person Crew</div>
              <div className="text-3xl font-bold text-purple-700">{est.days}</div>
              <div className="text-sm text-gray-500">
                {est.days === 1 ? 'day' : 'days'}
              </div>
              <div className="text-xs text-gray-400 mt-2">${est.dailyRate}/day</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Based on labor cost of ${laborCost.toFixed(2)}
        </p>
      </CardContent>
    </Card>
  );
}
