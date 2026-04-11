import { useState } from 'react';
import { CompanyInfoSettings } from '../components/settings/CompanyInfoSettings';
import { SimpleInteriorSettings } from '../components/settings/SimpleInteriorSettings';
import { SimpleExteriorSettings } from '../components/settings/SimpleExteriorSettings';
import { InteriorDetailedPricing } from '../components/settings/InteriorDetailedPricing';
import { ExteriorDetailedPricing } from '../components/settings/ExteriorDetailedPricing';
import { CustomLineItemsManager } from '../components/settings/CustomLineItemsManager';
import { CustomSectionsManager } from '../components/settings/CustomSectionsManager';
import { JobEstimationSettings } from '../components/settings/JobEstimationSettings';
import { PerRoomSettings } from '../components/settings/PerRoomSettings';
import { TeamSettings } from '../components/settings/TeamSettings';
import { BillingSettings } from '../components/settings/BillingSettings';
import { PresentationSettings } from '../components/settings/PresentationSettings';
import { useOrganization } from '../context/OrganizationContext';

type SettingsTab =
  | 'company'
  | 'simple-interior'
  | 'simple-exterior'
  | 'interior-detailed-pricing'
  | 'exterior-detailed-pricing'
  | 'line-items'
  | 'sections'
  | 'per-room'
  | 'crew-rates'
  | 'team'
  | 'billing'
  | 'presentation';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const { role } = useOrganization();
  const isOwner = role === 'owner';

  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl font-800 uppercase tracking-wide text-navy">Settings</h2>

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
            active={activeTab === 'presentation'}
            onClick={() => setActiveTab('presentation')}
          >
            Presentation
          </TabButton>
          <TabButton
            active={activeTab === 'simple-interior'}
            onClick={() => setActiveTab('simple-interior')}
          >
            Simple Interior
          </TabButton>
          <TabButton
            active={activeTab === 'simple-exterior'}
            onClick={() => setActiveTab('simple-exterior')}
          >
            Simple Exterior
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
            active={activeTab === 'per-room'}
            onClick={() => setActiveTab('per-room')}
          >
            Per Room
          </TabButton>
          <TabButton
            active={activeTab === 'crew-rates'}
            onClick={() => setActiveTab('crew-rates')}
          >
            Job Estimation
          </TabButton>
          <TabButton
            active={activeTab === 'team'}
            onClick={() => setActiveTab('team')}
          >
            Team
          </TabButton>
          {isOwner && (
            <TabButton
              active={activeTab === 'billing'}
              onClick={() => setActiveTab('billing')}
            >
              Billing
            </TabButton>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'company' && <CompanyInfoSettings />}
        {activeTab === 'presentation' && <PresentationSettings />}
        {activeTab === 'simple-interior' && <SimpleInteriorSettings />}
        {activeTab === 'simple-exterior' && <SimpleExteriorSettings />}
        {activeTab === 'interior-detailed-pricing' && <InteriorDetailedPricing />}
        {activeTab === 'exterior-detailed-pricing' && <ExteriorDetailedPricing />}
        {activeTab === 'line-items' && <CustomLineItemsManager />}
        {activeTab === 'sections' && <CustomSectionsManager />}
        {activeTab === 'per-room' && <PerRoomSettings />}
        {activeTab === 'crew-rates' && <JobEstimationSettings />}
        {activeTab === 'team' && <TeamSettings />}
        {activeTab === 'billing' && <BillingSettings />}
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
        whitespace-nowrap py-2 px-4 border-b-2 font-display font-600 text-sm uppercase tracking-wide
        ${
          active
            ? 'border-teal-500 text-teal-600'
            : 'border-transparent text-gray-500 hover:text-navy hover:border-gray-300'
        }
      `}
    >
      {children}
    </button>
  );
}
