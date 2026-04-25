// src/components/settings/CancellationModal.tsx
import { useEffect, useState } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { submitCancellation } from '../../services/cancellationService';
import type { CancellationReason } from '../../types/supabase.types';

type Step = 'reason' | 'offer' | 'confirm' | 'resume';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a terminal server-confirmed action so the parent can refresh org state. */
  onChanged: () => void;
}

const REASON_OPTIONS: { value: CancellationReason; label: string }[] = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'switching_tools', label: "Switching to another tool" },
  { value: 'seasonal', label: 'Seasonal / slow time of year' },
  { value: 'other', label: 'Other' },
];

export function CancellationModal({ open, onClose, onChanged }: Props) {
  const { org } = useOrganization();
  const [step, setStep] = useState<Step>(() => {
    if (org?.cancelAtPeriodEnd) return 'resume';
    return 'reason';
  });
  const [reason, setReason] = useState<CancellationReason | null>(null);
  // Tracks the Pro "Switch to Basic" decline so we can advance to the 50% off offer.
  const [proDowngradeDeclined, setProDowngradeDeclined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(org?.cancelAtPeriodEnd ? 'resume' : 'reason');
    setReason(null);
    setProDowngradeDeclined(false);
    setError(null);
  }, [open, org?.cancelAtPeriodEnd]);

  if (!open || !org) return null;

  const offerEligible =
    org.retentionOfferUsedAt === null &&
    org.planStatus !== 'trialing' &&
    org.planStatus !== 'past_due';

  const tier = org.planTier;

  async function call(action: 'downgrade' | 'accept_offer' | 'cancel' | 'resume', r?: CancellationReason) {
    setLoading(true);
    setError(null);
    try {
      await submitCancellation(action, r);
      onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? 'Something went wrong. Try again or contact support.');
    } finally {
      setLoading(false);
    }
  }

  function advanceFromReason() {
    if (!reason) return;
    if (!offerEligible) {
      setStep('confirm');
      return;
    }
    setStep('offer');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Resume path */}
        {step === 'resume' && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Subscription ending soon</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your subscription is scheduled to end. You'll keep access until the end of your current billing period.
              Want to resume it?
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                Close
              </button>
              <button
                onClick={() => call('resume')}
                disabled={loading}
                className="flex-1 bg-navy text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-navy/90 disabled:opacity-50"
              >
                {loading ? 'Working…' : 'Resume subscription'}
              </button>
            </div>
          </>
        )}

        {/* Step 1: reason */}
        {step === 'reason' && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sorry to see you go</h2>
            <p className="text-sm text-gray-600 mb-4">Mind telling us why?</p>
            <div className="space-y-2 mb-4">
              {REASON_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={opt.value}
                    checked={reason === opt.value}
                    onChange={() => setReason(opt.value)}
                  />
                  <span className="text-sm text-gray-800">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Never mind
              </button>
              <button
                onClick={advanceFromReason}
                disabled={!reason}
                className="flex-1 bg-navy text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-navy/90 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 2: offer (only if offerEligible) */}
        {step === 'offer' && tier === 'pro' && !proDowngradeDeclined && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Want to keep the essentials?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Switch to Basic for $29/mo instead. Keeps the calculator and bids — you can upgrade back anytime.
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setProDowngradeDeclined(true)}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                No thanks
              </button>
              <button
                onClick={() => call('downgrade', reason!)}
                disabled={loading}
                className="flex-1 bg-gold text-navy py-2 px-4 rounded-lg text-sm font-display font-700 uppercase tracking-wide hover:bg-gold-light disabled:opacity-50"
              >
                {loading ? 'Working…' : 'Switch to Basic'}
              </button>
            </div>
          </>
        )}

        {step === 'offer' && (tier === 'basic' || proDowngradeDeclined) && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Stay for 50% off</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your next 2 months at half price. No strings — just a little something to say "give us another shot."
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setStep('confirm')}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                No thanks
              </button>
              <button
                onClick={() => call('accept_offer', reason!)}
                disabled={loading}
                className="flex-1 bg-gold text-navy py-2 px-4 rounded-lg text-sm font-display font-700 uppercase tracking-wide hover:bg-gold-light disabled:opacity-50"
              >
                {loading ? 'Working…' : 'Accept offer'}
              </button>
            </div>
          </>
        )}

        {/* Step 3: confirm */}
        {step === 'confirm' && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Confirm cancellation</h2>
            <p className="text-sm text-gray-600 mb-4">
              {org.planStatus === 'trialing'
                ? 'Your trial will end immediately and your subscription will be canceled.'
                : "Your subscription will end at the end of your current billing period. You'll keep full access until then."}
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                Keep subscription
              </button>
              <button
                onClick={() => call('cancel', reason!)}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Working…' : 'Cancel subscription'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
