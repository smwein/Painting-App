import { useState } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { createCheckoutSession, createPortalSession } from '../../services/billingService';
import { CancellationModal } from './CancellationModal';

export function BillingSettings() {
  const { org, role } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!org) return null;

  const isOwner = role === 'owner';
  const isTrialing = org.planStatus === 'trialing';
  const trialExpired = isTrialing && new Date(org.trialEndsAt) < new Date();
  const isActive = org.planStatus === 'active';
  const isPastDue = org.planStatus === 'past_due';
  const scheduledToEnd = org.cancelAtPeriodEnd;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const url = await createCheckoutSession('pro');
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
          <span className="text-sm font-medium text-gray-700">Plan</span>
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="text-sm font-semibold px-2 py-0.5 rounded bg-navy/10 text-navy">
                {org.planTier === 'pro' ? 'Pro' : 'Basic'} &mdash; ${org.planTier === 'pro' ? '49' : '29'}/mo
              </span>
            )}
            <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
              scheduledToEnd ? 'bg-orange-100 text-orange-800' :
              isActive ? 'bg-green-100 text-green-800' :
              isTrialing && !trialExpired ? 'bg-blue-100 text-blue-800' :
              isPastDue ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {scheduledToEnd ? 'Ending soon' :
               isActive ? 'Active' :
               isTrialing && !trialExpired ? 'Free Trial' :
               isPastDue ? 'Past Due' :
               'Inactive'}
            </span>
          </div>
        </div>

        {isTrialing && !trialExpired && !scheduledToEnd && (
          <p className="text-sm text-gray-600 mb-3">
            Trial ends {new Date(org.trialEndsAt).toLocaleDateString()}
          </p>
        )}

        {scheduledToEnd && (
          <p className="text-sm text-orange-700 mb-3">
            Your subscription is scheduled to end. You'll keep full access until the end of your current billing period.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {isActive ? (
            <>
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="flex-1 min-w-[140px] bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Manage Billing'}
              </button>
              {org.planTier === 'basic' && !scheduledToEnd && (
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="flex-1 min-w-[140px] bg-gold text-navy py-2 px-4 rounded-lg text-sm font-display font-700 uppercase tracking-wide hover:bg-gold-light transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Upgrade to Pro'}
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => setCancelOpen(true)}
                  className="w-full sm:w-auto text-sm text-gray-500 hover:text-gray-700 underline py-2 px-2"
                >
                  {scheduledToEnd ? 'Manage cancellation' : 'Cancel subscription'}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => {
                setLoading(true);
                window.location.href = '/subscribe';
              }}
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Choose a Plan'}
            </button>
          )}
        </div>
      </div>

      <CancellationModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onChanged={() => window.location.reload()}
      />
    </div>
  );
}
