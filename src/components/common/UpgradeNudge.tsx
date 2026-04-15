import { useState } from 'react';
import { createCheckoutSession } from '../../services/billingService';

interface UpgradeNudgeProps {
  feature: string;
}

export function UpgradeNudge({ feature }: UpgradeNudgeProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const url = await createCheckoutSession('pro');
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="bg-navy/5 border border-navy/10 rounded-lg p-6 text-center">
      <div className="text-2xl mb-2">&#x2728;</div>
      <h3 className="font-display text-lg font-700 text-navy mb-1">Pro Feature</h3>
      <p className="text-sm text-gray-600 mb-4">
        {feature} is available on the Pro plan.
      </p>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="font-display font-700 uppercase tracking-wide bg-gold text-navy py-2 px-6 text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Upgrade to Pro \u2014 $49/mo'}
      </button>
    </div>
  );
}
