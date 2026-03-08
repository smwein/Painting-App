import { supabase } from '../config/supabase';
import type { MembershipRole, InvitationRole } from '../types/supabase.types';

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: MembershipRole;
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: InvitationRole;
  expiresAt: string;
}

export async function fetchTeamMembers(orgId: string): Promise<TeamMember[]> {
  // Try RPC first (returns email/name from auth.users via security definer)
  const { data, error } = await supabase.rpc('get_team_members', { org_id: orgId });

  if (error) {
    // Fallback to plain memberships query if RPC doesn't exist yet
    // Fallback if RPC not deployed yet
    const { data: fallback, error: fbError } = await supabase
      .from('memberships')
      .select('id, user_id, role, created_at')
      .eq('organization_id', orgId);
    if (fbError) throw fbError;
    return (fallback ?? []).map((m) => ({
      id: m.id,
      userId: m.user_id,
      email: m.user_id,
      displayName: '',
      role: m.role,
      joinedAt: m.created_at,
    }));
  }

  return (data ?? []).map((m) => ({
    id: m.id,
    userId: m.user_id,
    email: m.email ?? '',
    displayName: m.display_name ?? '',
    role: m.role,
    joinedAt: m.created_at,
  }));
}

export async function fetchPendingInvites(orgId: string): Promise<PendingInvite[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', orgId)
    .is('accepted_at', null);

  if (error) throw error;

  return (data ?? []).map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    expiresAt: inv.expires_at,
  }));
}

export async function sendInvite(orgId: string, email: string, role: InvitationRole, orgName: string): Promise<void> {
  const { data, error } = await supabase
    .from('invitations')
    .insert({ organization_id: orgId, email, role })
    .select('token')
    .single();

  if (error) throw error;

  // Send invite email (fire-and-forget, don't block on email failure)
  supabase.functions.invoke('send-invite', {
    body: { email, token: data.token, orgName, role },
  }).catch(console.error);
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('invitations').delete().eq('id', inviteId);
  if (error) throw error;
}

export async function updateMemberRole(membershipId: string, role: MembershipRole): Promise<void> {
  const { error } = await supabase
    .from('memberships')
    .update({ role })
    .eq('id', membershipId);
  if (error) throw error;
}

export async function removeMember(membershipId: string): Promise<void> {
  const { error } = await supabase.from('memberships').delete().eq('id', membershipId);
  if (error) throw error;
}
