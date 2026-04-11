import { supabase } from '../config/supabase';

/**
 * Upload an image to the quote-assets bucket.
 * Returns the public URL of the uploaded image.
 */
export async function uploadQuoteAsset(
  organizationId: string,
  pageType: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${organizationId}/${pageType}/${filename}`;

  const { error } = await supabase.storage
    .from('quote-assets')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('quote-assets').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete an image from the quote-assets bucket by its full public URL.
 */
export async function deleteQuoteAsset(publicUrl: string): Promise<void> {
  // Extract path from URL: ...quote-assets/org-id/page-type/filename.jpg
  const marker = '/quote-assets/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);

  const { error } = await supabase.storage.from('quote-assets').remove([path]);
  if (error) throw error;
}
