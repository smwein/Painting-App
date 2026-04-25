-- 010_quote_discount.sql
-- Pro feature: limited-time discount on a sent quote.
-- All-or-nothing on the discount triple; accepted_total stamped at acceptance.

ALTER TABLE public_quotes
  ADD COLUMN discount_type text NULL CHECK (discount_type IN ('percent', 'fixed')),
  ADD COLUMN discount_value numeric(10,2) NULL CHECK (discount_value > 0),
  ADD COLUMN discount_expires_at timestamptz NULL,
  ADD COLUMN accepted_total numeric(10,2) NULL,
  ADD CONSTRAINT discount_all_or_none CHECK (
    (discount_type IS NULL AND discount_value IS NULL AND discount_expires_at IS NULL)
    OR
    (discount_type IS NOT NULL AND discount_value IS NOT NULL AND discount_expires_at IS NOT NULL)
  );
