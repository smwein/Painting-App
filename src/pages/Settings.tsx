import { useState } from 'react';
import { CompanyInfoSettings } from '../components/settings/CompanyInfoSettings';
import { SimplePricingSettings } from '../components/settings/SimplePricingSettings';
import { InteriorDetailedPricing } from '../components/settings/InteriorDetailedPricing';
import { ExteriorDetailedPricing } from '../components/settings/ExteriorDetailedPricing';
import { CustomLineItemsManager } from '../components/settings/CustomLineItemsManager';
import { CustomSectionsManager } from '../components/settings/CustomSectionsManager';
import { JobEstimationSettings } from '../components/settings/JobEstimationSettings';
import { UsersSettings } from '../components/settings/UsersSettings';

type SettingsTab =
  | 'company'
  | 'simple-pricing'
  | 'interior-detailed-pricing'
  | 'exterior-detailed-pricing'
  | 'line-items'
  | 'sections'
  | 'crew-rates'
  | 'users';

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
            active={activeTab === 'interior-detailed-pricing'}
            onClick={() => setActiveTab('interior-detailed-pricing')}
          >
            Interior Detailed
          </TabButton>
          <TabButton
            active={activeTab === 'exterior-detailed-pricing'}
            onClick={() => setActiveTab('exterior-detailed-pricing')}
          >
            Exterior Detailed
          </TabButton>
          <TabButton
            active={activeTab === 'line-items'}
            onClick={() => setActiveTab('line-items')}
          >
            Add New Line Item
          </TabButton>
          <TabButton
            active={activeTab === 'sections'}
            onClick={() => setActiveTab('sections')}
          >
            Add New Section
          </TabButton>
          <TabButton
            active={activeTab === 'crew-rates'}
            onClick={() => setActiveTab('crew-rates')}
          >
            Job Estimation
          </TabButton>
          <TabButton
            active={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
          >
            Users
          </TabButton>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'company' && <CompanyInfoSettings />}
        {activeTab === 'simple-pricing' && <SimplePricingSettings />}
        {activeTab === 'interior-detailed-pricing' && <InteriorDetailedPricing />}
        {activeTab === 'exterior-detailed-pricing' && <ExteriorDetailedPricing />}
        {activeTab === 'line-items' && <CustomLineItemsManager />}
        {activeTab === 'sections' && <CustomSectionsManager />}
        {activeTab === 'crew-rates' && <JobEstimationSettings />}
        {activeTab === 'users' && <UsersSettings />}
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
