import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../config/supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { useSettingsStore } from '../store/settingsStore';
import { useBidStore } from '../store/bidStore';
import type { MembershipRole, PlanStatus } from '../types/supabase.types';

interface Organization {
  id: string;
  name: string;
  slug: string;
  planStatus: PlanStatus;
  trialEndsAt: string;
}

interface OrganizationContextValue {
  org: Organization | null;
  role: MembershipRole | null;
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue>({
  org: null,
  role: null,
  loading: true,
});

export function useOrganization() {
  return useContext(OrganizationContext);
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useSupabaseAuthStore();
  const [org, setOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<MembershipRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrg(null);
      setRole(null);
      setLoading(false);
      return;
    }

    async function fetchOrg() {
      const { data: membership } = await supabase
        .from('memberships')
        .select('role, organization_id, organizations(*)')
        .eq('user_id', user!.uid)
        .limit(1)
        .maybeSingle();

      if (membership?.organizations) {
        const o = membership.organizations as unknown as {
          id: string; name: string; slug: string;
          plan_status: PlanStatus; trial_ends_at: string;
        };
        setOrg({
          id: o.id,
          name: o.name,
          slug: o.slug,
          planStatus: o.plan_status,
          trialEndsAt: o.trial_ends_at,
        });
        setRole(membership.role as MembershipRole);

        // Load org data into stores
        useSettingsStore.getState().loadFromSupabase(o.id).catch(console.error);
        useBidStore.getState().setOrg(o.id, user!.uid);
        useBidStore.getState().loadFromSupabase(o.id).catch(console.error);
      }
      setLoading(false);
    }

    fetchOrg();
  }, [user]);

  return (
    <OrganizationContext.Provider value={{ org, role, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
}
