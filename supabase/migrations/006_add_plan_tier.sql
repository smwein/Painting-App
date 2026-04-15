-- Add plan_tier column to organizations
ALTER TABLE organizations ADD COLUMN plan_tier text NOT NULL DEFAULT 'basic' CHECK (plan_tier IN ('basic', 'pro'));

-- Grandfather existing active/trialing customers to Pro
UPDATE organizations SET plan_tier = 'pro' WHERE plan_status IN ('active', 'trialing');
