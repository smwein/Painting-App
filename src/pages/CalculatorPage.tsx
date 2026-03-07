import { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { InteriorSquareFootage } from '../components/calculators/InteriorSquareFootage';
import { InteriorDetailed } from '../components/calculators/InteriorDetailed';
import { ExteriorSquareFootage } from '../components/calculators/ExteriorSquareFootage';
import { ExteriorDetailed } from '../components/calculators/ExteriorDetailed';
import { PerRoomDetailed } from '../components/calculators/PerRoomDetailed';
import { ExportButtons } from '../components/results/ExportButtons';
import { useBidStore } from '../store/bidStore';
import { useSettingsStore } from '../store/settingsStore';
import { downloadBidPDF, downloadCustomerPDF } from '../utils/exportPDF';
import type { Bid } from '../types/bid.types';
import type { CalculatorType } from '../types/calculator.types';

export function CalculatorPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { saveBid } = useBidStore();
  const { settings } = useSettingsStore();
  const [currentBidData, setCurrentBidData] = useState<any>(null);

  // Get loaded bid from navigation state (if navigating from saved bids)
  const loadedBid = location.state?.loadedBid as Bid | undefined;

  const getCalculatorTitle = () => {
    switch (type) {
      case 'interior-sqft':
        return 'Interior Quick Measure';
      case 'interior-detailed':
        return 'Interior Exact Measure';
      case 'exterior-sqft':
        return 'Exterior Quick Measure';
      case 'exterior-detailed':
        return 'Exterior Exact Measure';
      case 'per-room':
        return 'Per Room - Exact Measure';
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

    if (!currentBidData.customer.name || !currentBidData.customer.address) {
      alert('Please fill in required customer information (name and address).');
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

    if (!currentBidData.customer.name || !currentBidData.customer.address) {
      alert('Please fill in required customer information (name and address).');
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

  const handleExportCustomerPDF = useCallback(() => {
    if (!currentBidData || !currentBidData.customer || !currentBidData.result) {
      alert('Please fill in customer information and complete the bid calculation first.');
      return;
    }

    if (!currentBidData.customer.name || !currentBidData.customer.address) {
      alert('Please fill in required customer information (name and address).');
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

    downloadCustomerPDF(bid, settings);
  }, [currentBidData, type, settings]);

  const renderCalculator = () => {
    switch (type) {
      case 'interior-sqft':
        return <InteriorSquareFootage onResultChange={handleResultChange} loadedBid={loadedBid} />;
      case 'interior-detailed':
        return <InteriorDetailed onResultChange={handleResultChange} loadedBid={loadedBid} />;
      case 'exterior-sqft':
        return <ExteriorSquareFootage onResultChange={handleResultChange} loadedBid={loadedBid} />;
      case 'exterior-detailed':
        return <ExteriorDetailed onResultChange={handleResultChange} loadedBid={loadedBid} />;
      case 'per-room':
        return <PerRoomDetailed onResultChange={handleResultChange} />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Calculator type not found.</p>
            <button
              onClick={() => navigate('/app')}
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
          onClick={() => navigate('/app')}
          className="text-2xl hover:text-teal-500 transition-colors"
        >
          ←
        </button>
        <h2 className="font-display text-2xl font-800 uppercase tracking-wide text-navy">
          {getCalculatorTitle()}
        </h2>
      </div>

      {renderCalculator()}

      {hasValidBid && (
        <ExportButtons
          onSave={handleSave}
          onExportPDF={handleExportPDF}
          onExportCustomerPDF={handleExportCustomerPDF}
          disabled={!hasValidBid}
        />
      )}
    </div>
  );
}
