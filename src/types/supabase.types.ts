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
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
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
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>;
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
        Update: Partial<Database['public']['Tables']['pricing_settings']['Insert']>;
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
        Update: Partial<Database['public']['Tables']['bids']['Insert']>;
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
        Update: Partial<Database['public']['Tables']['invitations']['Insert']>;
      };
    };
  };
}
