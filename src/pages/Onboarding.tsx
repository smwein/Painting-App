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
      // 1. Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: companyName.trim(), slug: generateSlug(companyName) })
        .select('*')
        .single();

      if (orgError || !org) throw orgError || new Error('Failed to create organization');

      // 2. Create owner membership
      const { error: memberError } = await supabase
        .from('memberships')
        .insert({ organization_id: org.id, user_id: user.uid, role: 'owner' });

      if (memberError) throw memberError;

      // 3. Seed default pricing settings
      const defaultPricing = createDefaultPricingSettings();
      const { error: pricingError } = await supabase
        .from('pricing_settings')
        .insert({
          organization_id: org.id,
          settings_json: defaultPricing as unknown as Record<string, unknown>,
        });

      if (pricingError) throw pricingError;

      // 4. Navigate to app
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏗️</div>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Your Company</h1>
          <p className="text-sm text-gray-500 mt-1">Just one more step to get started</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Your Painting Company"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !companyName.trim()}
            className="w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}
