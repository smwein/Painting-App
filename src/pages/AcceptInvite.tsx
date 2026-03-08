import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useSupabaseAuthStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'accepting' | 'error' | 'login-required'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus('login-required');
      return;
    }

    async function acceptInvite() {
      setStatus('accepting');

      // 1. Look up invitation by token
      const { data: invite, error: invError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token!)
        .is('accepted_at', null)
        .single();

      if (invError || !invite) {
        setError('Invitation not found or already used.');
        setStatus('error');
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        setError('This invitation has expired.');
        setStatus('error');
        return;
      }

      // 2. Create membership
      const { error: memberError } = await supabase
        .from('memberships')
        .insert({
          organization_id: invite.organization_id,
          user_id: user!.uid,
          role: invite.role,
        });

      if (memberError) {
        setError(memberError.message);
        setStatus('error');
        return;
      }

      // 3. Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      navigate('/app', { replace: true });
    }

    acceptInvite();
  }, [user, authLoading, token, navigate]);

  if (status === 'login-required') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-3">📨</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h1>
          <p className="text-sm text-gray-600 mb-4">Sign in or create an account to join the team.</p>
          <a href={`/login?redirect=/invite/${token}`} className="block w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors text-center">
            Sign In
          </a>
          <a href={`/signup?redirect=/invite/${token}`} className="block mt-2 text-sm text-primary-600 hover:underline">
            Create Account
          </a>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-3">❌</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Error</h1>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">🎨</div>
        <p className="text-gray-500 text-sm">Joining team...</p>
      </div>
    </div>
  );
}
