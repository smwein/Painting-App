# Public Quote Phase 2 — Presentation Builder + Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estimators can configure branded presentation pages (About Us, Services, Testimonials, Gallery, Process, Terms) in Settings, select which pages to include per quote, and customers see a tabbed multi-page presentation on the public quote page.

**Architecture:** Extend the existing `PresentationSettings` type with content for 6 page types. Store images in a new `quote-assets` Supabase Storage bucket. Add a "Presentation" tab to the Settings page with editors for each page. Update the SendQuoteModal to allow per-quote page selection. Add tab navigation and page templates to the PublicQuote page.

**Tech Stack:** React + TypeScript, Supabase Storage, Zustand (existing settingsStore pattern), Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-10-public-quote-presentation-design.md`

---

## File Structure

**Create:**
- `src/components/settings/PresentationSettings.tsx` — Main Presentation tab with sub-sections for each page editor
- `src/components/quote-pages/AboutUsPage.tsx` — Public page template for About Us
- `src/components/quote-pages/ServicesPage.tsx` — Public page template for Services
- `src/components/quote-pages/TestimonialsPage.tsx` — Public page template for Testimonials
- `src/components/quote-pages/GalleryPage.tsx` — Public page template for Gallery
- `src/components/quote-pages/ProcessPage.tsx` — Public page template for Our Process
- `src/components/quote-pages/TermsPage.tsx` — Public page template for Terms
- `src/services/storageService.ts` — Supabase Storage upload/delete helpers
- `supabase/migrations/007_quote_assets_bucket.sql` — Storage bucket + policies

**Modify:**
- `src/types/settings.types.ts` — Extend PresentationSettings with page content interfaces
- `src/core/constants/defaultPricing.ts` — Add default presentation page content
- `src/pages/Settings.tsx` — Add "Presentation" tab
- `src/components/quotes/SendQuoteModal.tsx` — Add page selection checkboxes
- `src/pages/PublicQuote.tsx` — Add tab navigation + render page templates
- `src/store/settingsStore.ts` — Ensure new presentation fields get defaults on hydration

---

### Task 1: Extend PresentationSettings Type

**Files:**
- Modify: `src/types/settings.types.ts:1-4`

- [ ] **Step 1: Add page content interfaces to settings.types.ts**

Replace the current `PresentationSettings` interface with the full version:

```typescript
export interface AboutUsSettings {
  heading: string;
  bodyText: string;
  imageUrl?: string;
  stats: Array<{ label: string; value: string }>;
}

export interface ServiceItem {
  name: string;
  description: string;
  imageUrl?: string;
}

export interface TestimonialItem {
  name: string;
  quote: string;
  rating: number;
  photoUrl?: string;
}

export interface GalleryItem {
  projectName: string;
  beforeUrl?: string;
  afterUrl?: string;
  description: string;
}

export interface ProcessStep {
  name: string;
  description: string;
}

export interface PresentationSettings {
  brandColor: string;
  defaultPages: string[];

  aboutUs: AboutUsSettings;
  services: { items: ServiceItem[] };
  testimonials: { items: TestimonialItem[] };
  gallery: { items: GalleryItem[] };
  process: { steps: ProcessStep[] };
  terms: { content: string };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/smwein/Dev Project/Painting App" && npx tsc --noEmit 2>&1 | head -20`

Expected: Errors about missing properties in `defaultPricing.ts` (the `presentation` default only has `brandColor` and `defaultPages` right now). This is expected — we fix it in Task 2.

- [ ] **Step 3: Commit**

```bash
git add src/types/settings.types.ts
git commit -m "feat: extend PresentationSettings type with page content interfaces"
```

---

### Task 2: Add Default Presentation Content

**Files:**
- Modify: `src/core/constants/defaultPricing.ts:449-452`

- [ ] **Step 1: Update the default presentation object**

Replace the `presentation` field in `createDefaultPricingSettings()`:

```typescript
    presentation: {
      brandColor: '#2563eb',
      defaultPages: ['estimate'],

      aboutUs: {
        heading: 'About Our Company',
        bodyText: '',
        stats: [],
      },
      services: { items: [] },
      testimonials: { items: [] },
      gallery: { items: [] },
      process: { steps: [] },
      terms: { content: '' },
    },
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `cd "/Users/smwein/Dev Project/Painting App" && npx tsc --noEmit 2>&1 | head -20`

Expected: No errors (or only pre-existing ones).

- [ ] **Step 3: Commit**

```bash
git add src/core/constants/defaultPricing.ts
git commit -m "feat: add default presentation page content to pricing defaults"
```

---

### Task 3: Auto-Migrate Existing Orgs (Settings Store)

**Files:**
- Modify: `src/store/settingsStore.ts:89-93`

- [ ] **Step 1: Update ensureNewPricingFields to handle partial presentation**

The existing migration only checks if `presentation === undefined`. Now we also need to backfill the new sub-fields for orgs that already have `brandColor`/`defaultPages` but no page content. Replace the presentation migration block:

```typescript
  if (p.presentation === undefined) {
    updates.presentation = defaults.presentation;
    changed = true;
  } else if (p.presentation.aboutUs === undefined) {
    // Existing org has brandColor/defaultPages from Phase 1 but no page content
    updates.presentation = {
      ...p.presentation,
      aboutUs: defaults.presentation!.aboutUs,
      services: defaults.presentation!.services,
      testimonials: defaults.presentation!.testimonials,
      gallery: defaults.presentation!.gallery,
      process: defaults.presentation!.process,
      terms: defaults.presentation!.terms,
    };
    changed = true;
  }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/smwein/Dev Project/Painting App" && npx tsc --noEmit 2>&1 | head -20`

Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/store/settingsStore.ts
git commit -m "feat: auto-migrate existing orgs to include presentation page content"
```

---

### Task 4: Supabase Storage Bucket + Service

**Files:**
- Create: `supabase/migrations/007_quote_assets_bucket.sql`
- Create: `src/services/storageService.ts`

- [ ] **Step 1: Write the storage migration**

```sql
-- Create quote-assets bucket for presentation page images
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-assets', 'quote-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access (images must be viewable on unauthenticated quote page)
CREATE POLICY "Public read access for quote-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quote-assets');

-- Authenticated users can upload to their org's folder
CREATE POLICY "Authenticated users can upload to quote-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quote-assets'
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- Authenticated users can delete their org's files
CREATE POLICY "Authenticated users can delete from quote-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quote-assets');
```

- [ ] **Step 2: Write the storage service**

```typescript
// src/services/storageService.ts
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
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_quote_assets_bucket.sql src/services/storageService.ts
git commit -m "feat: add quote-assets storage bucket and upload service"
```

---

### Task 5: Presentation Settings Tab — About Us Editor

**Files:**
- Create: `src/components/settings/PresentationSettings.tsx`
- Modify: `src/pages/Settings.tsx`

This is the largest task. We build the Presentation tab with the About Us section first, then add the remaining 5 page editors in subsequent tasks. Each page editor follows the same pattern: read from `settings.pricing.presentation`, update via `updatePricing({ presentation: { ...current, [page]: newData } })`.

- [ ] **Step 1: Create the PresentationSettings component with About Us editor**

```typescript
// src/components/settings/PresentationSettings.tsx
import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { uploadQuoteAsset, deleteQuoteAsset } from '../../services/storageService';
import { useOrganization } from '../../context/OrganizationContext';
import type { PresentationSettings as PresentationSettingsType } from '../../types/settings.types';

type PageSection = 'brand' | 'about' | 'services' | 'testimonials' | 'gallery' | 'process' | 'terms';

export function PresentationSettings() {
  const { settings, updatePricing } = useSettingsStore();
  const { organizationId } = useOrganization();
  const pres = settings.pricing.presentation!;
  const [activeSection, setActiveSection] = useState<PageSection>('brand');

  const updatePresentation = (updates: Partial<PresentationSettingsType>) => {
    updatePricing({ presentation: { ...pres, ...updates } });
  };

  const sections: Array<{ id: PageSection; label: string }> = [
    { id: 'brand', label: 'Brand' },
    { id: 'about', label: 'About Us' },
    { id: 'services', label: 'Services' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'process', label: 'Process' },
    { id: 'terms', label: 'Terms' },
  ];

  return (
    <div className="space-y-6">
      {/* Section switcher */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 text-xs font-display font-600 uppercase tracking-wide rounded-full transition-colors ${
              activeSection === s.id
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'brand' && (
        <BrandSection pres={pres} updatePresentation={updatePresentation} />
      )}
      {activeSection === 'about' && (
        <AboutUsSection pres={pres} updatePresentation={updatePresentation} orgId={organizationId} />
      )}
      {activeSection === 'services' && (
        <ServicesSection pres={pres} updatePresentation={updatePresentation} orgId={organizationId} />
      )}
      {activeSection === 'testimonials' && (
        <TestimonialsSection pres={pres} updatePresentation={updatePresentation} orgId={organizationId} />
      )}
      {activeSection === 'gallery' && (
        <GallerySection pres={pres} updatePresentation={updatePresentation} orgId={organizationId} />
      )}
      {activeSection === 'process' && (
        <ProcessSection pres={pres} updatePresentation={updatePresentation} />
      )}
      {activeSection === 'terms' && (
        <TermsSection pres={pres} updatePresentation={updatePresentation} />
      )}
    </div>
  );
}

/* ── Brand Section ── */
function BrandSection({
  pres,
  updatePresentation,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (u: Partial<PresentationSettingsType>) => void;
}) {
  const ALL_PAGES = ['about', 'services', 'testimonials', 'gallery', 'process', 'terms'] as const;

  const toggleDefaultPage = (page: string) => {
    const current = pres.defaultPages;
    const next = current.includes(page)
      ? current.filter((p) => p !== page)
      : [...current, page];
    updatePresentation({ defaultPages: next });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand & Defaults</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={pres.brandColor}
              onChange={(e) => updatePresentation({ brandColor: e.target.value })}
              className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <Input
              value={pres.brandColor}
              onChange={(e) => updatePresentation({ brandColor: e.target.value })}
              className="max-w-[140px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Pages Included When Sending</label>
          <p className="text-xs text-gray-500 mb-2">These pages will be pre-selected when you send a quote. "Estimate" is always included.</p>
          <div className="space-y-2">
            {ALL_PAGES.map((page) => (
              <label key={page} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={pres.defaultPages.includes(page)}
                  onChange={() => toggleDefaultPage(page)}
                  className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                />
                {page.charAt(0).toUpperCase() + page.slice(1).replace(/([A-Z])/g, ' $1')}
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── About Us Section ── */
function AboutUsSection({
  pres,
  updatePresentation,
  orgId,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (u: Partial<PresentationSettingsType>) => void;
  orgId: string;
}) {
  const about = pres.aboutUs;
  const [uploading, setUploading] = useState(false);

  const updateAbout = (updates: Partial<typeof about>) => {
    updatePresentation({ aboutUs: { ...about, ...updates } });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadQuoteAsset(orgId, 'about-us', file);
      if (about.imageUrl) {
        await deleteQuoteAsset(about.imageUrl).catch(() => {});
      }
      updateAbout({ imageUrl: url });
    } catch {
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const addStat = () => {
    updateAbout({ stats: [...about.stats, { label: '', value: '' }] });
  };

  const updateStat = (index: number, field: 'label' | 'value', val: string) => {
    const updated = about.stats.map((s, i) => (i === index ? { ...s, [field]: val } : s));
    updateAbout({ stats: updated });
  };

  const removeStat = (index: number) => {
    updateAbout({ stats: about.stats.filter((_, i) => i !== index) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>About Us Page</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          label="Heading"
          value={about.heading}
          onChange={(e) => updateAbout({ heading: e.target.value })}
          placeholder="About Premier Painting"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Story</label>
          <textarea
            value={about.bodyText}
            onChange={(e) => updateAbout({ bodyText: e.target.value })}
            placeholder="Tell your company's story..."
            rows={4}
            className="w-full px-3 py-2.5 border border-gray-300 shadow-sm font-body text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Photo</label>
          {about.imageUrl ? (
            <div className="relative inline-block">
              <img src={about.imageUrl} alt="Company" className="w-48 h-32 object-cover rounded" />
              <button
                onClick={() => {
                  deleteQuoteAsset(about.imageUrl!).catch(() => {});
                  updateAbout({ imageUrl: undefined });
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
              >
                X
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center w-48 h-32 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-teal-400 transition-colors">
              <span className="text-sm text-gray-500">{uploading ? 'Uploading...' : 'Upload Photo'}</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
            </label>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Stats</label>
            <Button variant="outline" size="sm" onClick={addStat}>+ Add Stat</Button>
          </div>
          <p className="text-xs text-gray-500 mb-2">e.g. "15 Years Experience", "500+ Projects"</p>
          {about.stats.map((stat, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input
                value={stat.value}
                onChange={(e) => updateStat(i, 'value', e.target.value)}
                placeholder="500+"
                className="max-w-[100px]"
              />
              <Input
                value={stat.label}
                onChange={(e) => updateStat(i, 'label', e.target.value)}
                placeholder="Projects Completed"
              />
              <button onClick={() => removeStat(i)} className="text-red-400 hover:text-red-600 px-2 text-lg">X</button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Services Section ── */
function ServicesSection({
  pres,
  updatePresentation,
  orgId,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (u: Partial<PresentationSettingsType>) => void;
  orgId: string;
}) {
  const items = pres.services.items;
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const updateItems = (newItems: typeof items) => {
    updatePresentation({ services: { items: newItems } });
  };

  const addItem = () => {
    updateItems([...items, { name: '', description: '' }]);
  };

  const updateItem = (index: number, updates: Partial<typeof items[0]>) => {
    updateItems(items.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const removeItem = (index: number) => {
    if (items[index].imageUrl) {
      deleteQuoteAsset(items[index].imageUrl!).catch(() => {});
    }
    updateItems(items.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    setUploadingIdx(index);
    try {
      const url = await uploadQuoteAsset(orgId, 'services', file);
      if (items[index].imageUrl) {
        await deleteQuoteAsset(items[index].imageUrl!).catch(() => {});
      }
      updateItem(index, { imageUrl: url });
    } catch {
      alert('Failed to upload image');
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Services Page</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="border border-gray-200 rounded p-4 space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-gray-400 uppercase">Service {i + 1}</span>
              <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
            </div>
            <Input
              label="Service Name"
              value={item.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              placeholder="Interior Painting"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="Describe this service..."
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 shadow-sm font-body text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              {item.imageUrl ? (
                <div className="relative inline-block">
                  <img src={item.imageUrl} alt={item.name} className="w-32 h-24 object-cover rounded" />
                  <button
                    onClick={() => {
                      deleteQuoteAsset(item.imageUrl!).catch(() => {});
                      updateItem(i, { imageUrl: undefined });
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    X
                  </button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-1 text-sm text-teal-600 cursor-pointer hover:text-teal-700">
                  {uploadingIdx === i ? 'Uploading...' : '+ Add Image'}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(i, e)} className="hidden" disabled={uploadingIdx === i} />
                </label>
              )}
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem}>+ Add Service</Button>
      </CardContent>
    </Card>
  );
}

/* ── Testimonials Section ── */
function TestimonialsSection({
  pres,
  updatePresentation,
  orgId,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (u: Partial<PresentationSettingsType>) => void;
  orgId: string;
}) {
  const items = pres.testimonials.items;
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const updateItems = (newItems: typeof items) => {
    updatePresentation({ testimonials: { items: newItems } });
  };

  const addItem = () => {
    updateItems([...items, { name: '', quote: '', rating: 5 }]);
  };

  const updateItem = (index: number, updates: Partial<typeof items[0]>) => {
    updateItems(items.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const removeItem = (index: number) => {
    if (items[index].photoUrl) {
      deleteQuoteAsset(items[index].photoUrl!).catch(() => {});
    }
    updateItems(items.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    setUploadingIdx(index);
    try {
      const url = await uploadQuoteAsset(orgId, 'testimonials', file);
      if (items[index].photoUrl) {
        await deleteQuoteAsset(items[index].photoUrl!).catch(() => {});
      }
      updateItem(index, { photoUrl: url });
    } catch {
      alert('Failed to upload photo');
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Testimonials Page</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="border border-gray-200 rounded p-4 space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-gray-400 uppercase">Testimonial {i + 1}</span>
              <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
            </div>
            <Input
              label="Reviewer Name"
              value={item.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              placeholder="Jane Doe"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quote</label>
              <textarea
                value={item.quote}
                onChange={(e) => updateItem(i, { quote: e.target.value })}
                placeholder="What the customer said..."
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 shadow-sm font-body text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => updateItem(i, { rating: star })}
                    className={`text-2xl ${star <= item.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              {item.photoUrl ? (
                <div className="relative inline-block">
                  <img src={item.photoUrl} alt={item.name} className="w-12 h-12 object-cover rounded-full" />
                  <button
                    onClick={() => {
                      deleteQuoteAsset(item.photoUrl!).catch(() => {});
                      updateItem(i, { photoUrl: undefined });
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    X
                  </button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-1 text-sm text-teal-600 cursor-pointer hover:text-teal-700">
                  {uploadingIdx === i ? 'Uploading...' : '+ Add Photo'}
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(i, e)} className="hidden" disabled={uploadingIdx === i} />
                </label>
              )}
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem}>+ Add Testimonial</Button>
      </CardContent>
    </Card>
  );
}

/* ── Gallery Section ── */
function GallerySection({
  pres,
  updatePresentation,
  orgId,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (u: Partial<PresentationSettingsType>) => void;
  orgId: string;
}) {
  const items = pres.gallery.items;
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const updateItems = (newItems: typeof items) => {
    updatePresentation({ gallery: { items: newItems } });
  };

  const addItem = () => {
    updateItems([...items, { projectName: '', description: '' }]);
  };

  const updateItem = (index: number, updates: Partial<typeof items[0]>) => {
    updateItems(items.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const removeItem = (index: number) => {
    const item = items[index];
    if (item.beforeUrl) deleteQuoteAsset(item.beforeUrl).catch(() => {});
    if (item.afterUrl) deleteQuoteAsset(item.afterUrl).catch(() => {});
    updateItems(items.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (index: number, field: 'beforeUrl' | 'afterUrl', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    const key = `${index}-${field}`;
    setUploadingKey(key);
    try {
      const url = await uploadQuoteAsset(orgId, 'gallery', file);
      const oldUrl = items[index][field];
      if (oldUrl) await deleteQuoteAsset(oldUrl).catch(() => {});
      updateItem(index, { [field]: url });
    } catch {
      alert('Failed to upload image');
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Gallery Page</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="border border-gray-200 rounded p-4 space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-gray-400 uppercase">Project {i + 1}</span>
              <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
            </div>
            <Input
              label="Project Name"
              value={item.projectName}
              onChange={(e) => updateItem(i, { projectName: e.target.value })}
              placeholder="Victorian Home Repaint"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="Describe the project..."
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 shadow-sm font-body text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div className="flex gap-4">
              {(['beforeUrl', 'afterUrl'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{field === 'beforeUrl' ? 'Before' : 'After'}</label>
                  {item[field] ? (
                    <div className="relative inline-block">
                      <img src={item[field]} alt={field} className="w-32 h-24 object-cover rounded" />
                      <button
                        onClick={() => {
                          deleteQuoteAsset(item[field]!).catch(() => {});
                          updateItem(i, { [field]: undefined });
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-32 h-24 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-teal-400 transition-colors">
                      <span className="text-xs text-gray-500">
                        {uploadingKey === `${i}-${field}` ? '...' : '+ Upload'}
                      </span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(i, field, e)} className="hidden" disabled={uploadingKey === `${i}-${field}`} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem}>+ Add Project</Button>
      </CardContent>
    </Card>
  );
}

/* ── Process Section ── */
function ProcessSection({
  pres,
  updatePresentation,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (u: Partial<PresentationSettingsType>) => void;
}) {
  const steps = pres.process.steps;

  const updateSteps = (newSteps: typeof steps) => {
    updatePresentation({ process: { steps: newSteps } });
  };

  const addStep = () => {
    updateSteps([...steps, { name: '', description: '' }]);
  };

  const updateStep = (index: number, updates: Partial<typeof steps[0]>) => {
    updateSteps(steps.map((step, i) => (i === index ? { ...step, ...updates } : step)));
  };

  const removeStep = (index: number) => {
    updateSteps(steps.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Our Process Page</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold mt-1">
              {i + 1}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                value={step.name}
                onChange={(e) => updateStep(i, { name: e.target.value })}
                placeholder="Step name (e.g. 'Free Consultation')"
              />
              <textarea
                value={step.description}
                onChange={(e) => updateStep(i, { description: e.target.value })}
                placeholder="Describe this step..."
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 shadow-sm font-body text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <button onClick={() => removeStep(i)} className="text-red-400 hover:text-red-600 mt-2 text-sm">X</button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addStep}>+ Add Step</Button>
      </CardContent>
    </Card>
  );
}

/* ── Terms Section ── */
function TermsSection({
  pres,
  updatePresentation,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (u: Partial<PresentationSettingsType>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Terms & Conditions Page</CardTitle>
      </CardHeader>
      <CardContent>
        <textarea
          value={pres.terms.content}
          onChange={(e) => updatePresentation({ terms: { content: e.target.value } })}
          placeholder="Enter your terms and conditions, payment terms, warranty information, cancellation policy..."
          rows={12}
          className="w-full px-3 py-2.5 border border-gray-300 shadow-sm font-body text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
        <p className="text-xs text-gray-500 mt-1">Plain text. Paragraph breaks will be preserved.</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Add "Presentation" tab to Settings page**

In `src/pages/Settings.tsx`, add `'presentation'` to the `SettingsTab` type, import the component, add the tab button and content:

Add to imports:
```typescript
import { PresentationSettings } from '../components/settings/PresentationSettings';
```

Add `'presentation'` to the `SettingsTab` union type:
```typescript
type SettingsTab =
  | 'company'
  | 'presentation'
  | 'simple-interior'
  // ... rest unchanged
```

Add the tab button after the Company Info button:
```typescript
          <TabButton
            active={activeTab === 'presentation'}
            onClick={() => setActiveTab('presentation')}
          >
            Presentation
          </TabButton>
```

Add the content render:
```typescript
        {activeTab === 'presentation' && <PresentationSettings />}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "/Users/smwein/Dev Project/Painting App" && npx tsc --noEmit 2>&1 | head -30`

Expected: Clean compile.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/PresentationSettings.tsx src/pages/Settings.tsx
git commit -m "feat: add Presentation tab to Settings with all page editors"
```

---

### Task 6: Update SendQuoteModal with Page Selection

**Files:**
- Modify: `src/components/quotes/SendQuoteModal.tsx`

- [ ] **Step 1: Add page selection checkboxes to the modal**

Replace the current `const [enabledPages] = useState<string[]>(defaultPages);` with editable state and add the UI. The updated component:

Replace the `enabledPages` line:
```typescript
  const [enabledPages, setEnabledPages] = useState<string[]>(defaultPages);
```

Add a constant for all available pages (above the component or inside it):
```typescript
  const ALL_PAGES: Array<{ id: string; label: string }> = [
    { id: 'about', label: 'About Us' },
    { id: 'services', label: 'Services' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'process', label: 'Our Process' },
    { id: 'terms', label: 'Terms & Conditions' },
  ];

  const togglePage = (pageId: string) => {
    setEnabledPages((prev) =>
      prev.includes(pageId) ? prev.filter((p) => p !== pageId) : [...prev, pageId]
    );
  };
```

Add the page selection UI between the Expires In select and the error message. Insert this block after the `</div>` that closes the Expires In section:

```tsx
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Include Pages</label>
            <p className="text-xs text-gray-500 mb-2">Estimate page is always included.</p>
            <div className="space-y-1.5">
              {ALL_PAGES.map((page) => (
                <label key={page.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={enabledPages.includes(page.id)}
                    onChange={() => togglePage(page.id)}
                    className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  {page.label}
                </label>
              ))}
            </div>
          </div>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/smwein/Dev Project/Painting App" && npx tsc --noEmit 2>&1 | head -20`

Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/components/quotes/SendQuoteModal.tsx
git commit -m "feat: add page selection checkboxes to send quote modal"
```

---

### Task 7: Public Quote Page Templates

**Files:**
- Create: `src/components/quote-pages/AboutUsPage.tsx`
- Create: `src/components/quote-pages/ServicesPage.tsx`
- Create: `src/components/quote-pages/TestimonialsPage.tsx`
- Create: `src/components/quote-pages/GalleryPage.tsx`
- Create: `src/components/quote-pages/ProcessPage.tsx`
- Create: `src/components/quote-pages/TermsPage.tsx`

All templates use inline styles (matching the PublicQuote.tsx pattern — no Tailwind, since the public page loads outside the app shell).

- [ ] **Step 1: Create AboutUsPage template**

```typescript
// src/components/quote-pages/AboutUsPage.tsx
import type { AboutUsSettings } from '../../types/settings.types';

interface AboutUsPageProps {
  aboutUs: AboutUsSettings;
  brandColor: string;
}

export function AboutUsPage({ aboutUs, brandColor }: AboutUsPageProps) {
  return (
    <div>
      <div style={{ background: 'white', borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>{aboutUs.heading}</h2>
        {aboutUs.imageUrl && (
          <img src={aboutUs.imageUrl} alt="Company" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }} />
        )}
        {aboutUs.bodyText && (
          <div style={{ fontSize: 14, lineHeight: 1.7, color: '#475569', whiteSpace: 'pre-wrap' }}>
            {aboutUs.bodyText}
          </div>
        )}
      </div>

      {aboutUs.stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(aboutUs.stats.length, 3)}, 1fr)`, gap: 12, marginBottom: 16 }}>
          {aboutUs.stats.map((stat, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 10, padding: 16, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: brandColor }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ServicesPage template**

```typescript
// src/components/quote-pages/ServicesPage.tsx
import type { ServiceItem } from '../../types/settings.types';

interface ServicesPageProps {
  items: ServiceItem[];
  brandColor: string;
}

export function ServicesPage({ items, brandColor }: ServicesPageProps) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: items.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: 'white', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
          )}
          <div style={{ padding: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{item.name}</h3>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#64748b' }}>{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create TestimonialsPage template**

```typescript
// src/components/quote-pages/TestimonialsPage.tsx
import type { TestimonialItem } from '../../types/settings.types';

interface TestimonialsPageProps {
  items: TestimonialItem[];
  brandColor: string;
}

export function TestimonialsPage({ items, brandColor }: TestimonialsPageProps) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {item.photoUrl && (
              <img src={item.photoUrl} alt={item.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, color: brandColor, marginBottom: 4 }}>
                {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#475569', fontStyle: 'italic', margin: '0 0 8px' }}>
                "{item.quote}"
              </p>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.name}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create GalleryPage template**

```typescript
// src/components/quote-pages/GalleryPage.tsx
import type { GalleryItem } from '../../types/settings.types';

interface GalleryPageProps {
  items: GalleryItem[];
}

export function GalleryPage({ items }: GalleryPageProps) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: 'white', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {(item.beforeUrl || item.afterUrl) && (
            <div style={{ display: 'grid', gridTemplateColumns: item.beforeUrl && item.afterUrl ? '1fr 1fr' : '1fr' }}>
              {item.beforeUrl && (
                <div style={{ position: 'relative' }}>
                  <img src={item.beforeUrl} alt="Before" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>Before</div>
                </div>
              )}
              {item.afterUrl && (
                <div style={{ position: 'relative' }}>
                  <img src={item.afterUrl} alt="After" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>After</div>
                </div>
              )}
            </div>
          )}
          <div style={{ padding: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{item.projectName}</h3>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#64748b' }}>{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create ProcessPage template**

```typescript
// src/components/quote-pages/ProcessPage.tsx
import type { ProcessStep } from '../../types/settings.types';

interface ProcessPageProps {
  steps: ProcessStep[];
  brandColor: string;
}

export function ProcessPage({ steps, brandColor }: ProcessPageProps) {
  if (steps.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: brandColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 2, flex: 1, background: '#e2e8f0', minHeight: 24 }} />
            )}
          </div>
          {/* Content */}
          <div style={{ background: 'white', borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flex: 1, marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{step.name}</h3>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#64748b', margin: 0 }}>{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create TermsPage template**

```typescript
// src/components/quote-pages/TermsPage.tsx
interface TermsPageProps {
  content: string;
}

export function TermsPage({ content }: TermsPageProps) {
  if (!content) return null;
  return (
    <div style={{ background: 'white', borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Terms & Conditions</h2>
      <div style={{ fontSize: 13, lineHeight: 1.8, color: '#475569', whiteSpace: 'pre-wrap' }}>
        {content}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/quote-pages/
git commit -m "feat: add 6 public quote page templates (about, services, testimonials, gallery, process, terms)"
```

---

### Task 8: Add Tab Navigation + Page Rendering to PublicQuote

**Files:**
- Modify: `src/pages/PublicQuote.tsx`

This is the core integration — the public quote page needs to: (1) load the org's presentation settings, (2) show tab navigation for enabled pages, and (3) render the correct page template for each tab.

- [ ] **Step 1: Update QuoteData interface and data loading**

Add presentation settings to the `QuoteData` interface. At the top of PublicQuote.tsx:

```typescript
import type { PresentationSettings } from '../types/settings.types';
import { AboutUsPage } from '../components/quote-pages/AboutUsPage';
import { ServicesPage } from '../components/quote-pages/ServicesPage';
import { TestimonialsPage } from '../components/quote-pages/TestimonialsPage';
import { GalleryPage } from '../components/quote-pages/GalleryPage';
import { ProcessPage } from '../components/quote-pages/ProcessPage';
import { TermsPage } from '../components/quote-pages/TermsPage';
```

Add to the `QuoteData` interface:
```typescript
  presentation?: PresentationSettings;
```

In the `loadQuote` function, where settings are fetched (after `const settings = settingsRow?.settings_json...`), add `presentation` to the `setData` call:
```typescript
      setData({
        quote,
        bid,
        companyName: settings?.name ?? 'Painting Company',
        companyPhone: settings?.phone ?? '',
        companyEmail: settings?.email ?? '',
        companyLogo: settings?.logo,
        brandColor: settings?.pricing?.presentation?.brandColor ?? '#2563eb',
        presentation: settings?.pricing?.presentation,
      });
```

- [ ] **Step 2: Add tab state and tab navigation**

Inside the `PublicQuote` component, after the existing state declarations, add:

```typescript
  const [activeTab, setActiveTab] = useState<string>('estimate');
```

Define the tabs list using `quote.enabledPages`:
```typescript
  // After the destructuring: const { quote, bid, ... } = data;
  const TAB_LABELS: Record<string, string> = {
    estimate: 'Estimate',
    about: 'About Us',
    services: 'Services',
    testimonials: 'Testimonials',
    gallery: 'Gallery',
    process: 'Our Process',
    terms: 'Terms',
  };

  const tabs = ['estimate', ...quote.enabledPages.filter((p) => p !== 'estimate')];
```

Replace the static "Estimate" text in the header (the `<div>` with `fontSize: 13, fontWeight: 500, color: brandColor`) with tab navigation:

```tsx
        {tabs.length > 1 ? (
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? brandColor : '#64748b',
                  borderBottom: activeTab === tab ? `2px solid ${brandColor}` : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  borderBottomStyle: 'solid',
                  borderBottomWidth: 2,
                  borderBottomColor: activeTab === tab ? brandColor : 'transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {TAB_LABELS[tab] || tab}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 500, color: brandColor, borderBottom: `2px solid ${brandColor}`, paddingBottom: 2 }}>
            Estimate
          </div>
        )}
```

- [ ] **Step 3: Conditionally render page content based on active tab**

Wrap the existing estimate content (`<main>` children) in a conditional block and add the other tab renders. Replace the `<main>` content:

```tsx
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        {activeTab === 'estimate' && (
          <>
            {/* Existing estimate content — customer info card, scope of work, total banner, signature */}
            {/* ... keep all existing JSX as-is ... */}
          </>
        )}

        {activeTab === 'about' && data.presentation?.aboutUs && (
          <AboutUsPage aboutUs={data.presentation.aboutUs} brandColor={brandColor} />
        )}

        {activeTab === 'services' && data.presentation?.services && (
          <ServicesPage items={data.presentation.services.items} brandColor={brandColor} />
        )}

        {activeTab === 'testimonials' && data.presentation?.testimonials && (
          <TestimonialsPage items={data.presentation.testimonials.items} brandColor={brandColor} />
        )}

        {activeTab === 'gallery' && data.presentation?.gallery && (
          <GalleryPage items={data.presentation.gallery.items} />
        )}

        {activeTab === 'process' && data.presentation?.process && (
          <ProcessPage steps={data.presentation.process.steps} brandColor={brandColor} />
        )}

        {activeTab === 'terms' && data.presentation?.terms && (
          <TermsPage content={data.presentation.terms.content} />
        )}

        <div style={{ textAlign: 'center', padding: '32px 0 16px', fontSize: 12, color: '#94a3b8' }}>
          Powered by CoatCalc
        </div>
      </main>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd "/Users/smwein/Dev Project/Painting App" && npx tsc --noEmit 2>&1 | head -30`

Expected: Clean compile.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PublicQuote.tsx
git commit -m "feat: add tab navigation and page template rendering to public quote page"
```

---

### Task 9: Verify End-to-End in Browser

**Files:** None (testing only)

- [ ] **Step 1: Start the dev server**

Run: `cd "/Users/smwein/Dev Project/Painting App" && npm run dev`

- [ ] **Step 2: Test the Presentation settings tab**

1. Navigate to Settings > Presentation
2. Set a brand color
3. Check some default pages
4. Fill in About Us content with a heading, body text, and at least one stat
5. Add a service with name and description
6. Add a testimonial with name, quote, and star rating
7. Add a gallery project with a name and description
8. Add 2-3 process steps
9. Type some terms & conditions text
10. Verify all changes persist (refresh the page, navigate away and back)

- [ ] **Step 3: Test the Send Quote modal page selection**

1. Go to Calculator, create/open a bid
2. Click "Send to Customer"
3. Verify the page selection checkboxes appear
4. Verify they reflect the org's default pages
5. Toggle some pages on/off

- [ ] **Step 4: Test the public quote page with tabs**

1. Send a quote (or use an existing sent quote)
2. Open the public quote URL
3. Verify tab navigation appears if multiple pages were enabled
4. Click through each tab and verify content renders correctly
5. Verify the Estimate tab still works (accept flow, signature, etc.)
6. Check mobile viewport (narrow browser window) — tabs should scroll horizontally

- [ ] **Step 5: Test image uploads (if Supabase Storage bucket is deployed)**

1. Upload an image in the About Us section
2. Upload before/after images in the Gallery section
3. Delete an image (click the X)
4. Verify uploaded images appear on the public quote page

- [ ] **Step 6: Commit any fixes**

If any issues were found and fixed, commit them:
```bash
git add -A
git commit -m "fix: address issues found during Phase 2 end-to-end testing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Extend PresentationSettings type | settings.types.ts |
| 2 | Add default presentation content | defaultPricing.ts |
| 3 | Auto-migrate existing orgs | settingsStore.ts |
| 4 | Storage bucket + upload service | migration, storageService.ts |
| 5 | Presentation Settings tab (all 7 editors) | PresentationSettings.tsx, Settings.tsx |
| 6 | Page selection in SendQuoteModal | SendQuoteModal.tsx |
| 7 | 6 public page templates | quote-pages/*.tsx |
| 8 | Tab nav + page rendering on PublicQuote | PublicQuote.tsx |
| 9 | End-to-end browser testing | — |
