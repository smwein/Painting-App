import { useState } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { createCheckoutSession, createPortalSession } from '../../services/billingService';

export function BillingSettings() {
  const { org } = useOrganization();
  const [loading, setLoading] = useState(false);

  if (!org) return null;

  const isTrialing = org.planStatus === 'trialing';
  const trialExpired = isTrialing && new Date(org.trialEndsAt) < new Date();
  const isActive = org.planStatus === 'active';
  const isPastDue = org.planStatus === 'past_due';

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const url = await createPortalSession();
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Billing</h3>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Plan Status</span>
          <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
            isActive ? 'bg-green-100 text-green-800' :
            isTrialing && !trialExpired ? 'bg-blue-100 text-blue-800' :
            isPastDue ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {isActive ? 'Active' :
             isTrialing && !trialExpired ? 'Free Trial' :
             isPastDue ? 'Past Due' :
             'Inactive'}
          </span>
        </div>

        {isTrialing && !trialExpired && (
          <p className="text-sm text-gray-600 mb-3">
            Trial ends {new Date(org.trialEndsAt).toLocaleDateString()}
          </p>
        )}

        {isActive ? (
          <button
            onClick={handleManageBilling}
            disabled={loading}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Manage Billing'}
          </button>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Subscribe — $29/mo'}
          </button>
        )}
      </div>
    </div>
  );
}
