import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InteriorSquareFootage } from '../components/calculators/InteriorSquareFootage';
import { InteriorDetailed } from '../components/calculators/InteriorDetailed';
import { ExteriorSquareFootage } from '../components/calculators/ExteriorSquareFootage';
import { ExteriorDetailed } from '../components/calculators/ExteriorDetailed';
import { ExportButtons } from '../components/results/ExportButtons';
import { useBidStore } from '../store/bidStore';
import { useSettingsStore } from '../store/settingsStore';
import { downloadBidPDF } from '../utils/exportPDF';
import type { Bid } from '../types/bid.types';
import type { CalculatorType } from '../types/calculator.types';

export function CalculatorPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { saveBid } = useBidStore();
  const { settings } = useSettingsStore();
  const [currentBidData, setCurrentBidData] = useState<any>(null);

  const getCalculatorTitle = () => {
    switch (type) {
      case 'interior-sqft':
        return 'Interior - Square Footage';
      case 'interior-detailed':
        return 'Interior - Detailed';
      case 'exterior-sqft':
        return 'Exterior - Square Footage';
      case 'exterior-detailed':
        return 'Exterior - Detailed';
      default:
        return 'Calculator';
    }
  };

  const handleResultChange = useCallback((bidData: any) => {
    setCurrentBidData(bidData);
  }, []);

  const handleSave = () => {
    if (!currentBidData || !currentBidData.customer || !currentBidData.result) {
      alert('Please fill in customer information and complete the bid calculation first.');
      return;
    }

    if (!currentBidData.customer.name || !currentBidData.customer.address || !currentBidData.customer.phone) {
      alert('Please fill in required customer information (name, address, phone).');
      return;
    }

    const bidToSave = {
      calculatorType: type as CalculatorType,
      customer: currentBidData.customer,
      inputs: currentBidData.inputs,
      result: currentBidData.result,
    };

    saveBid(bidToSave);
    alert('Bid saved successfully!');
  };

  const handleExportPDF = () => {
    if (!currentBidData || !currentBidData.customer || !currentBidData.result) {
      alert('Please fill in customer information and complete the bid calculation first.');
      return;
    }

    if (!currentBidData.customer.name || !currentBidData.customer.address || !currentBidData.customer.phone) {
      alert('Please fill in required customer information (name, address, phone).');
      return;
    }

    const bid: Bid = {
      id: crypto.randomUUID(),
      calculatorType: type as CalculatorType,
      customer: currentBidData.customer,
      inputs: currentBidData.inputs,
      result: currentBidData.result,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    downloadBidPDF(bid, settings);
  };

  const renderCalculator = () => {
    switch (type) {
      case 'interior-sqft':
        return <InteriorSquareFootage onResultChange={handleResultChange} />;
      case 'interior-detailed':
        return <InteriorDetailed onResultChange={handleResultChange} />;
      case 'exterior-sqft':
        return <ExteriorSquareFootage onResultChange={handleResultChange} />;
      case 'exterior-detailed':
        return <ExteriorDetailed onResultChange={handleResultChange} />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Calculator type not found.</p>
            <button
              onClick={() => navigate('/')}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Return to Home
            </button>
          </div>
        );
    }
  };

  const hasValidBid = currentBidData && currentBidData.result && currentBidData.result.total > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-2xl hover:text-primary-600 transition-colors"
        >
          ←
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {getCalculatorTitle()}
        </h2>
      </div>

      {renderCalculator()}

      {hasValidBid && (
        <div className="sticky bottom-20 z-10">
          <ExportButtons
            onSave={handleSave}
            onExportPDF={handleExportPDF}
            disabled={!hasValidBid}
          />
        </div>
      )}
    </div>
  );
}
