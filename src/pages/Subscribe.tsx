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
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="text-5xl mb-3">🎨</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscribe to Continue</h1>
        <p className="text-sm text-gray-600 mb-6">
          {org?.planStatus === 'canceled'
            ? 'Your subscription has ended. Resubscribe to access your bids and calculators.'
            : 'Your free trial has ended. Subscribe to keep using the Bid Calculator.'}
        </p>

        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
          <p className="text-2xl font-bold text-primary-700">$29<span className="text-sm font-normal">/month</span></p>
          <ul className="mt-3 text-sm text-primary-800 space-y-1 text-left">
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
          className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
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
