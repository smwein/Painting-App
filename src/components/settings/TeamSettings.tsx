import { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import {
  fetchTeamMembers,
  fetchPendingInvites,
  sendInvite,
  cancelInvite,
  removeMember,
  type TeamMember,
  type PendingInvite,
} from '../../services/teamService';
import type { InvitationRole } from '../../types/supabase.types';

export function TeamSettings() {
  const { org, role } = useOrganization();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InvitationRole>('estimator');
  const [sending, setSending] = useState(false);

  const canManage = role === 'owner' || role === 'admin';

  useEffect(() => {
    if (!org) return;
    fetchTeamMembers(org.id).then(setMembers);
    fetchPendingInvites(org.id).then(setInvites);
  }, [org]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || !email.trim()) return;
    setSending(true);
    try {
      await sendInvite(org.id, email.trim(), inviteRole, org.name);
      setEmail('');
      const updated = await fetchPendingInvites(org.id);
      setInvites(updated);
    } catch (err) {
      console.error('[TeamSettings] invite error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    await cancelInvite(id);
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm('Remove this team member?')) return;
    await removeMember(id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  if (!canManage) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>

      {/* Current members */}
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{m.displayName || m.email || 'Unknown'}</p>
              <p className="text-xs text-gray-500 capitalize">{m.role}</p>
            </div>
            {role === 'owner' && m.role !== 'owner' && (
              <button
                onClick={() => handleRemoveMember(m.id)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Invitations</h4>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div>
                  <p className="text-sm text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-500 capitalize">{inv.role} — expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => handleCancelInvite(inv.id)}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      <form onSubmit={handleInvite} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Invite Team Member</h4>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@company.com"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as InvitationRole)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="estimator">Estimator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={sending}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send Invite'}
        </button>
      </form>
    </div>
  );
}
