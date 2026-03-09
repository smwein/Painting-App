import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { createDefaultPricingSettings } from '../core/constants/defaultPricing';
import type { InvitationRole } from '../types/supabase.types';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).substring(2, 6);
}

type Step = 'company' | 'team';

interface TeamInvite {
  email: string;
  role: InvitationRole;
}

export function Onboarding() {
  const { user } = useSupabaseAuthStore();
  const [step, setStep] = useState<Step>('company');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState<string | undefined>(undefined);

  const [form, setForm] = useState({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    licenseNumber: '',
  });

  // Team invite state
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InvitationRole>('estimator');

  // If user already has an org, skip onboarding
  useEffect(() => {
    if (user?.organizationId) {
      navigate('/app', { replace: true });
    }
  }, [user, navigate]);

  // Pre-fill email from auth user
  useEffect(() => {
    if (user?.email) {
      setForm((prev) => ({ ...prev, email: prev.email || user.email }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file size must be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.companyName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const newOrgId = crypto.randomUUID();
      const defaultPricing = createDefaultPricingSettings();

      const pricingWithCompanyInfo = {
        ...defaultPricing,
        name: form.companyName.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        licenseNumber: form.licenseNumber.trim(),
        logo,
      };

      const { error: rpcError } = await supabase.rpc('create_organization_for_user', {
        org_id: newOrgId,
        org_name: form.companyName.trim(),
        org_slug: generateSlug(form.companyName),
        default_pricing: pricingWithCompanyInfo as unknown as Record<string, unknown>,
      });

      if (rpcError) throw rpcError;

      // Notify admin of new signup (fire-and-forget)
      supabase.functions.invoke('signup-notify', {
        body: { userEmail: user.email, companyName: form.companyName.trim() },
      }).catch(() => {});

      setOrgId(newOrgId);
      setStep('team');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (invites.some((i) => i.email === trimmed)) {
      setError('That email has already been added');
      return;
    }
    setError(null);
    setInvites((prev) => [...prev, { email: trimmed, role: inviteRole }]);
    setInviteEmail('');
  };

  const handleRemoveInvite = (email: string) => {
    setInvites((prev) => prev.filter((i) => i.email !== email));
  };

  const handleFinish = async () => {
    if (!orgId) return;

    setSubmitting(true);
    setError(null);

    try {
      // Send all invites with email notifications
      const { sendInvite } = await import('../services/teamService');
      for (const invite of invites) {
        try {
          await sendInvite(orgId, invite.email, invite.role, form.companyName.trim());
        } catch (err) {
          console.error('[onboarding] invite error:', (err as Error).message);
        }
      }

      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-8">
      <div className="bg-white shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/coatcalc-logo-final.png" alt="CoatCalc" className="h-14 mx-auto mb-2" />
          {step === 'company' ? (
            <>
              <h1 className="font-display text-2xl font-800 uppercase tracking-wide text-navy">Set Up Your Company</h1>
              <p className="text-sm text-gray-500 mt-1">This info will appear on your bid estimates</p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-800 uppercase tracking-wide text-navy">Invite Your Team</h1>
              <p className="text-sm text-gray-500 mt-1">Add estimators or admins to your account</p>
            </>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`h-2 w-12 ${step === 'company' ? 'bg-teal-500' : 'bg-teal-500'}`} />
          <div className={`h-2 w-12 ${step === 'team' ? 'bg-teal-500' : 'bg-gray-200'}`} />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 'company' && (
          <form onSubmit={handleCompanySubmit} className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                value={form.companyName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Your Painting Company"
              />
            </div>

            {/* Logo upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Logo
              </label>
              {logo ? (
                <div className="space-y-2">
                  <div className="p-3 bg-gray-50 flex items-center justify-center">
                    <img src={logo} alt="Logo" className="max-h-20 max-w-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogo(undefined)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-3 py-2 border border-dashed border-gray-300 text-sm text-gray-500 hover:border-teal-500 hover:text-teal-600 transition-colors"
                  >
                    + Upload Logo
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">Optional — appears on PDF bid exports. Max 2MB.</p>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                id="address"
                name="address"
                type="text"
                value={form.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="123 Main Street, City, State 12345"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="contact@yourcompany.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  value={form.website}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="www.yourcompany.com"
                />
              </div>
              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  License #
                </label>
                <input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  value={form.licenseNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Optional"
                />
              </div>
            </div>

            <p className="text-xs text-gray-400">You can update all of this later in Settings. Only company name is required.</p>

            <button
              type="submit"
              disabled={submitting || !form.companyName.trim()}
              className="w-full font-display font-700 uppercase tracking-wide bg-gold text-navy py-2.5 px-4 text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Next'}
            </button>
          </form>
        )}

        {step === 'team' && (
          <div className="space-y-4">
            {/* Add invite form */}
            <form onSubmit={handleAddInvite} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@email.com"
                  className="flex-1 px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as InvitationRole)}
                  className="px-3 py-2 border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="estimator">Estimator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={!inviteEmail.trim()}
                className="w-full bg-white border border-teal-500 text-teal-600 font-display font-700 uppercase tracking-wide py-2 px-4 text-sm hover:bg-teal-50 transition-colors disabled:opacity-50"
              >
                + Add Team Member
              </button>
            </form>

            {/* Invite list */}
            {invites.length > 0 && (
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div key={inv.email} className="flex items-center justify-between bg-gray-50 border border-gray-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                      <p className="text-xs text-gray-500 capitalize">{inv.role}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveInvite(inv.email)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {invites.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">No team members added yet</p>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={handleFinish}
                disabled={submitting}
                className="w-full font-display font-700 uppercase tracking-wide bg-gold text-navy py-2.5 px-4 text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {submitting
                  ? 'Setting up...'
                  : invites.length > 0
                    ? `Send Invites & Get Started`
                    : 'Skip & Get Started'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
