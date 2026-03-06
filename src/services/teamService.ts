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
  const { data, error } = await supabase
    .from('memberships')
    .select('id, user_id, role, created_at')
    .eq('organization_id', orgId);

  if (error) throw error;

  return (data ?? []).map((m) => ({
    id: m.id,
    userId: m.user_id,
    email: '',
    displayName: '',
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

export async function sendInvite(orgId: string, email: string, role: InvitationRole): Promise<void> {
  const { error } = await supabase
    .from('invitations')
    .insert({ organization_id: orgId, email, role });

  if (error) throw error;
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
