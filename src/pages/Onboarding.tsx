import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { createDefaultPricingSettings } from '../core/constants/defaultPricing';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).substring(2, 6);
}

export function Onboarding() {
  const { user } = useSupabaseAuthStore();
  const [companyName, setCompanyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      // Create org + membership + pricing in a single server-side transaction
      const orgId = crypto.randomUUID();
      const defaultPricing = createDefaultPricingSettings();

      const { error: rpcError } = await supabase.rpc('create_organization_for_user', {
        org_id: orgId,
        org_name: companyName.trim(),
        org_slug: generateSlug(companyName),
        default_pricing: defaultPricing as unknown as Record<string, unknown>,
      });

      if (rpcError) throw rpcError;

      // 4. Navigate to app
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
      <div className="bg-white shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/coatcalc-logo.svg" alt="CoatCalc" className="h-12 mx-auto mb-2" />
          <h1 className="font-display text-2xl font-800 uppercase tracking-wide text-navy">Set Up Your Company</h1>
          <p className="text-sm text-gray-500 mt-1">Just one more step to get started</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              id="company-name"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Your Painting Company"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !companyName.trim()}
            className="w-full font-display font-700 uppercase tracking-wide bg-gold text-navy py-2.5 px-4 text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}
