import { useState } from 'react';
import type { BidResult } from '../../types/calculator.types';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';

interface CostBreakdownProps {
  result: BidResult;
  breakdown: any;
}

export function CostBreakdown({ result, breakdown }: CostBreakdownProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    materials: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Labor Details */}
        {breakdown && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Labor</h4>
            <div className="space-y-1 text-sm">
              {breakdown.baseLabor !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Labor:</span>
                  <span className="font-medium">${breakdown.baseLabor.toFixed(2)}</span>
                </div>
              )}
              {breakdown.modifiersApplied && breakdown.modifiersApplied.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 rounded">
                  <div className="font-medium text-gray-700 mb-1">Modifiers Applied:</div>
                  {breakdown.modifiersApplied.map((modifier: string, index: number) => (
                    <div key={index} className="text-xs text-gray-600">
                      • {modifier}
                    </div>
                  ))}
                </div>
              )}
              {breakdown.modifiedLabor !== undefined && (
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Total Labor:</span>
                  <span className="font-semibold">${breakdown.modifiedLabor.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Materials Details */}
        {result.materials.items.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('materials')}
              className="flex items-center justify-between w-full text-left font-semibold text-gray-900 hover:text-primary-600 transition-colors"
            >
              <span>Materials</span>
              <span className="text-xl">
                {expandedSections.materials ? '−' : '+'}
              </span>
            </button>

            {expandedSections.materials && (
              <div className="mt-2 space-y-2">
                {result.materials.items.map((item, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-700">{item.name}</span>
                      <span className="text-gray-900">${item.cost.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {item.quantity} gal × ${item.pricePerGallon}/gal
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Total Materials:</span>
                  <span className="font-semibold">${result.materials.totalCost.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profit Calculation */}
        {result.profit > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">Profit</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal (Labor + Materials):</span>
                <span className="font-medium">
                  ${(result.labor + result.materials.totalCost).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Profit Margin:</span>
                <span className="font-semibold text-primary-600">
                  ${result.profit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
