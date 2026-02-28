import { useState } from 'react';
import { CompanyInfoSettings } from '../components/settings/CompanyInfoSettings';
import { SimplePricingSettings } from '../components/settings/SimplePricingSettings';
import { DetailedPricingSettings } from '../components/settings/DetailedPricingSettings';
import { CustomLineItemsManager } from '../components/settings/CustomLineItemsManager';
import { CustomSectionsManager } from '../components/settings/CustomSectionsManager';
import { JobEstimationSettings } from '../components/settings/JobEstimationSettings';

type SettingsTab =
  | 'company'
  | 'simple-pricing'
  | 'detailed-pricing'
  | 'line-items'
  | 'sections'
  | 'crew-rates';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-2" aria-label="Tabs">
          <TabButton
            active={activeTab === 'company'}
            onClick={() => setActiveTab('company')}
          >
            Company Info
          </TabButton>
          <TabButton
            active={activeTab === 'simple-pricing'}
            onClick={() => setActiveTab('simple-pricing')}
          >
            Simple Pricing
          </TabButton>
          <TabButton
            active={activeTab === 'detailed-pricing'}
            onClick={() => setActiveTab('detailed-pricing')}
          >
            Detailed Pricing
          </TabButton>
          <TabButton
            active={activeTab === 'line-items'}
            onClick={() => setActiveTab('line-items')}
          >
            Custom Line Items
          </TabButton>
          <TabButton
            active={activeTab === 'sections'}
            onClick={() => setActiveTab('sections')}
          >
            Custom Sections
          </TabButton>
          <TabButton
            active={activeTab === 'crew-rates'}
            onClick={() => setActiveTab('crew-rates')}
          >
            Job Estimation
          </TabButton>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'company' && <CompanyInfoSettings />}
        {activeTab === 'simple-pricing' && <SimplePricingSettings />}
        {activeTab === 'detailed-pricing' && <DetailedPricingSettings />}
        {activeTab === 'line-items' && <CustomLineItemsManager />}
        {activeTab === 'sections' && <CustomSectionsManager />}
        {activeTab === 'crew-rates' && <JobEstimationSettings />}
      </div>
    </div>
  );
}

// Tab button component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm
        ${
          active
            ? 'border-indigo-500 text-indigo-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
      `}
    >
      {children}
    </button>
  );
}
