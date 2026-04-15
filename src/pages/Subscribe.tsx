import { useState } from 'react';
import { useOrganization } from '../context/OrganizationContext';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { createCheckoutSession } from '../services/billingService';
import type { PlanTier } from '../types/supabase.types';

const PLANS = [
  {
    tier: 'basic' as PlanTier,
    name: 'Basic',
    price: 29,
    features: [
      '5 Calculator Types',
      'Custom Pricing & Settings',
      'PDF Export',
      'Team Accounts',
      'Unlimited Bids',
    ],
  },
  {
    tier: 'pro' as PlanTier,
    name: 'Pro',
    price: 49,
    features: [
      'Everything in Basic',
      'Email Quotes to Customers',
      'Public Quote Pages',
      'Presentation Builder',
      'Quote Tracking & Activity',
      'Customer Payments (coming soon)',
    ],
    recommended: true,
  },
];

export function Subscribe() {
  const { org } = useOrganization();
  const { signOut } = useSupabaseAuthStore();
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);

  const handleSubscribe = async (tier: PlanTier) => {
    setLoadingTier(tier);
    try {
      const url = await createCheckoutSession(tier);
      window.location.href = url;
    } catch {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      <img src="/coatcalc-logo-final.png" alt="CoatCalc" className="h-14 mx-auto mb-2" />
      <h1 className="font-display text-2xl font-800 uppercase tracking-wide text-navy mb-2">
        Choose Your Plan
      </h1>
      <p className="text-sm text-gray-600 mb-8 text-center max-w-md">
        {org?.planStatus === 'canceled'
          ? 'Your subscription has ended. Pick a plan to get back to work.'
          : 'Your free trial has ended. Pick a plan to keep using CoatCalc.'}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`flex-1 bg-white shadow-lg p-6 relative ${
              plan.recommended ? 'ring-2 ring-gold' : ''
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy text-xs font-display font-700 uppercase tracking-wide px-3 py-1">
                Recommended
              </div>
            )}
            <h2 className="font-display text-xl font-800 uppercase tracking-wide text-navy mb-1">
              {plan.name}
            </h2>
            <p className="text-3xl font-display font-900 text-navy mb-4">
              ${plan.price}<span className="text-sm font-normal text-gray-400">/month</span>
            </p>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-teal-500 mt-0.5">&#x2713;</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan.tier)}
              disabled={loadingTier !== null}
              className={`w-full font-display font-700 uppercase tracking-wide py-3 px-4 transition-colors disabled:opacity-50 ${
                plan.recommended
                  ? 'bg-gold text-navy hover:bg-gold-light'
                  : 'bg-navy text-white hover:bg-navy/90'
              }`}
            >
              {loadingTier === plan.tier ? 'Loading...' : `Get ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={signOut}
        className="mt-6 text-sm text-gray-500 hover:text-gray-700"
      >
        Sign out
      </button>
    </div>
  );
}
