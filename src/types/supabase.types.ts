export type PlanStatus = 'trialing' | 'active' | 'past_due' | 'canceled';
export type MembershipRole = 'owner' | 'admin' | 'estimator';
export type BidStatus = 'draft' | 'sent' | 'accepted' | 'declined';
export type InvitationRole = 'admin' | 'estimator';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan_status: PlanStatus;
          trial_ends_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_status?: PlanStatus;
          trial_ends_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_status?: PlanStatus;
          trial_ends_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: MembershipRole;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: MembershipRole;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: MembershipRole;
          invited_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      pricing_settings: {
        Row: {
          id: string;
          organization_id: string;
          settings_json: Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          settings_json: Record<string, unknown>;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          settings_json?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pricing_settings_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: true;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      bids: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string;
          calculator_type: string;
          customer_name: string;
          bid_data: Record<string, unknown>;
          status: BidStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by: string;
          calculator_type: string;
          customer_name?: string;
          bid_data: Record<string, unknown>;
          status?: BidStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          created_by?: string;
          calculator_type?: string;
          customer_name?: string;
          bid_data?: Record<string, unknown>;
          status?: BidStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bids_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: InvitationRole;
          token: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role?: InvitationRole;
          token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: InvitationRole;
          token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {};
    Functions: {
      create_organization_for_user: {
        Args: {
          org_id: string;
          org_name: string;
          org_slug: string;
          default_pricing: Record<string, unknown>;
        };
        Returns: void;
      };
      get_team_members: {
        Args: {
          org_id: string;
        };
        Returns: {
          id: string;
          user_id: string;
          role: Database['public']['Enums']['membership_role'];
          created_at: string;
          email: string;
          display_name: string;
        }[];
      };
    };
    Enums: {
      plan_status: PlanStatus;
      membership_role: MembershipRole;
      bid_status: BidStatus;
      invitation_role: InvitationRole;
    };
    CompositeTypes: {};
  };
}
