import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

type Status = 'loading' | 'signup' | 'accepting' | 'error' | 'check-email';

interface InviteInfo {
  email: string;
  orgName: string;
  role: string;
}

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useSupabaseAuthStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Look up invite info by token
  useEffect(() => {
    if (!token) return;

    supabase.rpc('lookup_invite', { invite_token: token }).then(({ data, error: rpcError }) => {
      if (rpcError || !data || data.length === 0) {
        setError('Invitation not found or already used.');
        setStatus('error');
        return;
      }
      const inv = data[0];
      if (inv.expired) {
        setError('This invitation has expired.');
        setStatus('error');
        return;
      }
      setInvite({ email: inv.email, orgName: inv.org_name, role: inv.role });
    });
  }, [token]);

  // Once user is authenticated, accept the invite
  useEffect(() => {
    if (authLoading || !user || !token || !invite) return;

    async function acceptInvite() {
      setStatus('accepting');

      const { data: inv, error: invError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token!)
        .is('accepted_at', null)
        .single();

      if (invError || !inv) {
        setError('Invitation not found or already used.');
        setStatus('error');
        return;
      }

      const { error: memberError } = await supabase
        .from('memberships')
        .insert({
          organization_id: inv.organization_id,
          user_id: user!.uid,
          role: inv.role,
        });

      if (memberError) {
        if (memberError.code === '23505') {
          // Already a member — just redirect
          navigate('/app', { replace: true });
          return;
        }
        setError(memberError.message);
        setStatus('error');
        return;
      }

      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', inv.id);

      navigate('/app', { replace: true });
    }

    acceptInvite();
  }, [user, authLoading, token, invite, navigate]);

  // Show signup form once invite is loaded and user is not logged in
  useEffect(() => {
    if (!invite) return;
    if (authLoading) return;
    if (!user) {
      setStatus('signup');
    }
  }, [invite, user, authLoading]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite || !password) return;

    setSubmitting(true);
    setError(null);

    const { error: signupError } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/invite/${token}`,
      },
    });

    if (signupError) {
      setError(signupError.message);
      setSubmitting(false);
      return;
    }

    setStatus('check-email');
    setSubmitting(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite || !password) return;

    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    // Auth state change will trigger the accept flow
  };

  if (status === 'check-email') {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
        <div className="bg-white shadow-lg p-8 w-full max-w-sm text-center">
          <img src="/coatcalc-logo-final.png" alt="CoatCalc" className="h-12 mx-auto mb-4" />
          <h1 className="font-display text-xl font-800 uppercase tracking-wide text-navy mb-2">Check Your Email</h1>
          <p className="text-sm text-gray-600 mb-2">
            We sent a confirmation link to <strong>{invite?.email}</strong>.
          </p>
          <p className="text-sm text-gray-500">
            Click the link in the email to confirm your account and join <strong>{invite?.orgName}</strong>.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'signup' && invite) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
        <div className="bg-white shadow-lg p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <img src="/coatcalc-logo-final.png" alt="CoatCalc" className="h-12 mx-auto mb-3" />
            <h1 className="font-display text-xl font-800 uppercase tracking-wide text-navy">
              Join {invite.orgName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              You've been invited as {invite.role === 'admin' ? 'an Admin' : 'an Estimator'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={invite.email}
                disabled
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-sm text-gray-500"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="At least 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full font-display font-700 uppercase tracking-wide bg-gold text-navy py-2.5 px-4 text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating Account...' : 'Create Account & Join'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-2">Already have an account?</p>
            <button
              onClick={(e) => handleSignIn(e as unknown as React.FormEvent)}
              disabled={submitting || !password}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Sign in instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
        <div className="bg-white shadow-lg p-8 w-full max-w-sm text-center">
          <img src="/coatcalc-logo-final.png" alt="CoatCalc" className="h-12 mx-auto mb-4" />
          <h1 className="font-display text-xl font-800 uppercase tracking-wide text-navy mb-2">Invitation Error</h1>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">🎨</div>
        <p className="text-gray-500 text-sm">
          {status === 'accepting' ? 'Joining team...' : 'Loading invitation...'}
        </p>
      </div>
    </div>
  );
}
