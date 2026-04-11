-- Add locked column to bids
ALTER TABLE bids ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;

-- Create public_quotes table
CREATE TABLE public_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bid_id uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  public_token text UNIQUE NOT NULL,
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'accepted', 'declined', 'expired')),
  enabled_pages text[] NOT NULL DEFAULT ARRAY['estimate'],
  accepted_at timestamptz,
  signature_text text,
  viewed_at timestamptz,
  view_count int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  sent_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast token lookups (public page)
CREATE UNIQUE INDEX idx_public_quotes_token ON public_quotes(public_token);

-- Index for org-level queries (saved bids page)
CREATE INDEX idx_public_quotes_org ON public_quotes(organization_id);
CREATE INDEX idx_public_quotes_bid ON public_quotes(bid_id);

-- RLS policies
ALTER TABLE public_quotes ENABLE ROW LEVEL SECURITY;

-- Public: anyone can SELECT by token (for the public quote page)
CREATE POLICY "public_read_by_token"
  ON public_quotes FOR SELECT
  USING (true);

-- Authenticated org members can SELECT all their org's quotes
CREATE POLICY "org_members_select"
  ON public_quotes FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT user_org_ids()));

-- Authenticated org members can INSERT
CREATE POLICY "org_members_insert"
  ON public_quotes FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT user_org_ids()));

-- Authenticated org members can UPDATE their org's quotes
CREATE POLICY "org_members_update"
  ON public_quotes FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT user_org_ids()));
