import { useState } from 'react';
import { useOrganization } from '../context/OrganizationContext';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { createCheckoutSession } from '../services/billingService';

export function Subscribe() {
  const { org } = useOrganization();
  const { signOut } = useSupabaseAuthStore();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
      alert(`Checkout failed: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
      <div className="bg-white shadow-lg p-8 w-full max-w-md text-center">
        <img src="/coatcalc-logo-final.png" alt="CoatCalc" className="h-14 mx-auto mb-2" />
        <h1 className="font-display text-2xl font-800 uppercase tracking-wide text-navy mb-2">Subscribe to Continue</h1>
        <p className="text-sm text-gray-600 mb-6">
          {org?.planStatus === 'canceled'
            ? 'Your subscription has ended. Resubscribe to access your bids and calculators.'
            : 'Your free trial has ended. Subscribe to keep using the Bid Calculator.'}
        </p>

        <div className="bg-navy p-4 mb-6">
          <p className="text-2xl font-display font-900 text-gold">$29<span className="text-sm font-normal text-white/40">/month</span></p>
          <ul className="mt-3 text-sm text-white/70 space-y-1 text-left">
            <li>- 5 calculator types</li>
            <li>- Custom pricing & settings</li>
            <li>- PDF export</li>
            <li>- Team accounts</li>
            <li>- Unlimited bids</li>
          </ul>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full font-display font-700 uppercase tracking-wide bg-gold text-navy py-3 px-4 hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Subscribe Now'}
        </button>

        <button
          onClick={signOut}
          className="mt-3 text-sm text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
