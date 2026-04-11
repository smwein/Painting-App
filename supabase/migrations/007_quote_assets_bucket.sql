-- Create quote-assets bucket for presentation page images
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-assets', 'quote-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access (images must be viewable on unauthenticated quote page)
CREATE POLICY "Public read access for quote-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quote-assets');

-- Authenticated users can upload to their own org's folder
CREATE POLICY "Authenticated users can upload to quote-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quote-assets'
  AND (storage.foldername(name))[1]::uuid IN (SELECT user_org_ids())
);

-- Authenticated users can delete from their own org's folder
CREATE POLICY "Authenticated users can delete from quote-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quote-assets'
  AND (storage.foldername(name))[1]::uuid IN (SELECT user_org_ids())
);
