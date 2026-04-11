import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { uploadQuoteAsset, deleteQuoteAsset } from '../../services/storageService';
import { useOrganization } from '../../context/OrganizationContext';
import type {
  PresentationSettings as PresentationSettingsType,
  AboutUsSettings,
  ServiceItem,
  TestimonialItem,
  GalleryItem,
  ProcessStep,
} from '../../types/settings.types';

const ALL_PAGES = ['about', 'services', 'testimonials', 'gallery', 'process', 'terms'] as const;

type SectionKey = 'brand' | 'about' | 'services' | 'testimonials' | 'gallery' | 'process' | 'terms';

const SECTION_LABELS: Record<SectionKey, string> = {
  brand: 'Brand',
  about: 'About Us',
  services: 'Services',
  testimonials: 'Testimonials',
  gallery: 'Gallery',
  process: 'Process',
  terms: 'Terms',
};

const textareaClasses =
  'w-full px-3 py-2.5 border border-gray-300 shadow-sm font-body text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultPresentation(): PresentationSettingsType {
  return {
    brandColor: '#2563eb',
    defaultPages: ['estimate'],
    aboutUs: { heading: '', bodyText: '', stats: [] },
    services: { items: [] },
    testimonials: { items: [] },
    gallery: { items: [] },
    process: { steps: [] },
    terms: { content: '' },
  };
}

// ─── Brand Section ────────────────────────────────────────────────────────────

function BrandSection({
  pres,
  updatePresentation,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (updates: Partial<PresentationSettingsType>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Color &amp; Default Pages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={pres.brandColor}
              onChange={(e) => updatePresentation({ brandColor: e.target.value })}
              className="h-10 w-14 cursor-pointer border border-gray-300 rounded"
            />
            <Input
              value={pres.brandColor}
              onChange={(e) => updatePresentation({ brandColor: e.target.value })}
              className="max-w-[140px]"
              placeholder="#0d9488"
            />
          </div>
        </div>

        {/* Default Pages */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Pages Included in Quotes
          </label>
          <div className="flex flex-wrap gap-4">
            {ALL_PAGES.map((page) => {
              const checked = pres.defaultPages.includes(page);
              return (
                <label key={page} className="flex items-center gap-2 text-sm capitalize">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? pres.defaultPages.filter((p) => p !== page)
                        : [...pres.defaultPages, page];
                      updatePresentation({ defaultPages: next });
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  {page}
                </label>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── About Us Section ─────────────────────────────────────────────────────────

function AboutUsSection({
  pres,
  updatePresentation,
  orgId,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (updates: Partial<PresentationSettingsType>) => void;
  orgId: string;
}) {
  const about = pres.aboutUs;
  const [uploading, setUploading] = useState(false);

  function updateAbout(updates: Partial<AboutUsSettings>) {
    updatePresentation({ aboutUs: { ...about, ...updates } });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5 MB');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadQuoteAsset(orgId, 'about', file);
      updateAbout({ imageUrl: url });
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleImageDelete() {
    if (!about.imageUrl) return;
    try {
      await deleteQuoteAsset(about.imageUrl);
    } catch (err) {
      console.error(err);
    }
    updateAbout({ imageUrl: undefined });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>About Us</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          label="Heading"
          value={about.heading}
          onChange={(e) => updateAbout({ heading: e.target.value })}
          placeholder="About Our Company"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Body Text</label>
          <textarea
            className={textareaClasses}
            rows={4}
            value={about.bodyText}
            onChange={(e) => updateAbout({ bodyText: e.target.value })}
            placeholder="Tell your customers about your company..."
          />
        </div>

        {/* Company Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Photo</label>
          {about.imageUrl ? (
            <div className="relative inline-block">
              <img src={about.imageUrl} alt="Company" className="h-32 w-auto rounded border" />
              <button
                onClick={handleImageDelete}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-700"
              >
                X
              </button>
            </div>
          ) : (
            <label className="flex h-32 w-48 cursor-pointer items-center justify-center border-2 border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-teal-400 hover:text-teal-500">
              {uploading ? 'Uploading...' : 'Upload Photo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          )}
        </div>

        {/* Stats */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Stats</label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateAbout({ stats: [...about.stats, { label: '', value: '' }] })}
            >
              + Add Stat
            </Button>
          </div>
          <div className="space-y-2">
            {about.stats.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Label (e.g. Years in Business)"
                  value={stat.label}
                  onChange={(e) => {
                    const next = [...about.stats];
                    next[idx] = { ...stat, label: e.target.value };
                    updateAbout({ stats: next });
                  }}
                />
                <Input
                  placeholder="Value (e.g. 15+)"
                  value={stat.value}
                  onChange={(e) => {
                    const next = [...about.stats];
                    next[idx] = { ...stat, value: e.target.value };
                    updateAbout({ stats: next });
                  }}
                  className="max-w-[140px]"
                />
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => updateAbout({ stats: about.stats.filter((_, i) => i !== idx) })}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Services Section ─────────────────────────────────────────────────────────

function ServicesSection({
  pres,
  updatePresentation,
  orgId,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (updates: Partial<PresentationSettingsType>) => void;
  orgId: string;
}) {
  const items = pres.services.items;
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  function updateItems(next: ServiceItem[]) {
    updatePresentation({ services: { items: next } });
  }

  async function handleImageUpload(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5 MB');
      return;
    }
    setUploadingIdx(idx);
    try {
      const url = await uploadQuoteAsset(orgId, 'services', file);
      const next = [...items];
      next[idx] = { ...next[idx], imageUrl: url };
      updateItems(next);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploadingIdx(null);
    }
  }

  async function handleImageDelete(idx: number) {
    const url = items[idx].imageUrl;
    if (!url) return;
    try {
      await deleteQuoteAsset(url);
    } catch (err) {
      console.error(err);
    }
    const next = [...items];
    next[idx] = { ...next[idx], imageUrl: undefined };
    updateItems(next);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Services</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateItems([...items, { name: '', description: '' }])}
          >
            + Add Service
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && (
          <p className="text-sm text-gray-500">No services added yet. Click &quot;Add Service&quot; to get started.</p>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="border border-gray-200 rounded p-4 space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-gray-500">Service {idx + 1}</span>
              <Button size="sm" variant="danger" onClick={() => updateItems(items.filter((_, i) => i !== idx))}>
                Remove
              </Button>
            </div>
            <Input
              label="Service Name"
              value={item.name}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], name: e.target.value };
                updateItems(next);
              }}
              placeholder="Interior Painting"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className={textareaClasses}
                rows={3}
                value={item.description}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...next[idx], description: e.target.value };
                  updateItems(next);
                }}
                placeholder="Describe this service..."
              />
            </div>
            {/* Service Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image (optional)</label>
              {item.imageUrl ? (
                <div className="relative inline-block">
                  <img src={item.imageUrl} alt={item.name} className="h-24 w-auto rounded border" />
                  <button
                    onClick={() => handleImageDelete(idx)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-700"
                  >
                    X
                  </button>
                </div>
              ) : (
                <label className="flex h-24 w-36 cursor-pointer items-center justify-center border-2 border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-teal-400 hover:text-teal-500">
                  {uploadingIdx === idx ? 'Uploading...' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(idx, e)} disabled={uploadingIdx === idx} />
                </label>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Testimonials Section ─────────────────────────────────────────────────────

function TestimonialsSection({
  pres,
  updatePresentation,
  orgId,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (updates: Partial<PresentationSettingsType>) => void;
  orgId: string;
}) {
  const items = pres.testimonials.items;
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  function updateItems(next: TestimonialItem[]) {
    updatePresentation({ testimonials: { items: next } });
  }

  async function handlePhotoUpload(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5 MB');
      return;
    }
    setUploadingIdx(idx);
    try {
      const url = await uploadQuoteAsset(orgId, 'testimonials', file);
      const next = [...items];
      next[idx] = { ...next[idx], photoUrl: url };
      updateItems(next);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploadingIdx(null);
    }
  }

  async function handlePhotoDelete(idx: number) {
    const url = items[idx].photoUrl;
    if (!url) return;
    try {
      await deleteQuoteAsset(url);
    } catch (err) {
      console.error(err);
    }
    const next = [...items];
    next[idx] = { ...next[idx], photoUrl: undefined };
    updateItems(next);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Testimonials</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateItems([...items, { name: '', quote: '', rating: 5 }])}
          >
            + Add Testimonial
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && (
          <p className="text-sm text-gray-500">No testimonials added yet.</p>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="border border-gray-200 rounded p-4 space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-gray-500">Testimonial {idx + 1}</span>
              <Button size="sm" variant="danger" onClick={() => updateItems(items.filter((_, i) => i !== idx))}>
                Remove
              </Button>
            </div>
            <Input
              label="Reviewer Name"
              value={item.name}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], name: e.target.value };
                updateItems(next);
              }}
              placeholder="Jane Doe"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quote</label>
              <textarea
                className={textareaClasses}
                rows={3}
                value={item.quote}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...next[idx], quote: e.target.value };
                  updateItems(next);
                }}
                placeholder="What did they say about your work?"
              />
            </div>
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      const next = [...items];
                      next[idx] = { ...next[idx], rating: star };
                      updateItems(next);
                    }}
                    className={`text-2xl ${star <= item.rating ? 'text-yellow-400' : 'text-gray-300'} hover:scale-110 transition-transform`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            {/* Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
              {item.photoUrl ? (
                <div className="relative inline-block">
                  <img src={item.photoUrl} alt={item.name} className="h-16 w-16 rounded-full border object-cover" />
                  <button
                    onClick={() => handlePhotoDelete(idx)}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center hover:bg-red-700"
                  >
                    X
                  </button>
                </div>
              ) : (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center border-2 border-dashed border-gray-300 rounded-full text-xs text-gray-500 hover:border-teal-400 hover:text-teal-500">
                  {uploadingIdx === idx ? '...' : 'Photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(idx, e)} disabled={uploadingIdx === idx} />
                </label>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Gallery Section ──────────────────────────────────────────────────────────

function GallerySection({
  pres,
  updatePresentation,
  orgId,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (updates: Partial<PresentationSettingsType>) => void;
  orgId: string;
}) {
  const items = pres.gallery.items;
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  function updateItems(next: GalleryItem[]) {
    updatePresentation({ gallery: { items: next } });
  }

  async function handleUpload(idx: number, field: 'beforeUrl' | 'afterUrl', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5 MB');
      return;
    }
    setUploadingIdx(idx);
    try {
      const url = await uploadQuoteAsset(orgId, 'gallery', file);
      const next = [...items];
      next[idx] = { ...next[idx], [field]: url };
      updateItems(next);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploadingIdx(null);
    }
  }

  async function handleDelete(idx: number, field: 'beforeUrl' | 'afterUrl') {
    const url = items[idx][field];
    if (!url) return;
    try {
      await deleteQuoteAsset(url);
    } catch (err) {
      console.error(err);
    }
    const next = [...items];
    next[idx] = { ...next[idx], [field]: undefined };
    updateItems(next);
  }

  function renderImageSlot(idx: number, field: 'beforeUrl' | 'afterUrl', label: string) {
    const url = items[idx][field];
    if (url) {
      return (
        <div className="relative inline-block">
          <img src={url} alt={label} className="h-24 w-auto rounded border" />
          <button
            onClick={() => handleDelete(idx, field)}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-700"
          >
            X
          </button>
        </div>
      );
    }
    return (
      <label className="flex h-24 w-36 cursor-pointer items-center justify-center border-2 border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-teal-400 hover:text-teal-500">
        {uploadingIdx === idx ? 'Uploading...' : label}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(idx, field, e)} disabled={uploadingIdx === idx} />
      </label>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gallery</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateItems([...items, { projectName: '', description: '' }])}
          >
            + Add Project
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && (
          <p className="text-sm text-gray-500">No gallery projects added yet.</p>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="border border-gray-200 rounded p-4 space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-gray-500">Project {idx + 1}</span>
              <Button size="sm" variant="danger" onClick={() => updateItems(items.filter((_, i) => i !== idx))}>
                Remove
              </Button>
            </div>
            <Input
              label="Project Name"
              value={item.projectName}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], projectName: e.target.value };
                updateItems(next);
              }}
              placeholder="Living Room Makeover"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className={textareaClasses}
                rows={2}
                value={item.description}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...next[idx], description: e.target.value };
                  updateItems(next);
                }}
                placeholder="Describe this project..."
              />
            </div>
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Before</label>
                {renderImageSlot(idx, 'beforeUrl', 'Before')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">After</label>
                {renderImageSlot(idx, 'afterUrl', 'After')}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Process Section ──────────────────────────────────────────────────────────

function ProcessSection({
  pres,
  updatePresentation,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (updates: Partial<PresentationSettingsType>) => void;
}) {
  const steps = pres.process.steps;

  function updateSteps(next: ProcessStep[]) {
    updatePresentation({ process: { steps: next } });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Our Process</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateSteps([...steps, { name: '', description: '' }])}
          >
            + Add Step
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.length === 0 && (
          <p className="text-sm text-gray-500">No process steps added yet.</p>
        )}
        {steps.map((step, idx) => (
          <div key={idx} className="flex gap-4 items-start border border-gray-200 rounded p-4">
            {/* Numbered circle */}
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-teal-500 text-white font-display font-700 text-lg">
              {idx + 1}
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <Input
                  label="Step Name"
                  value={step.name}
                  onChange={(e) => {
                    const next = [...steps];
                    next[idx] = { ...next[idx], name: e.target.value };
                    updateSteps(next);
                  }}
                  placeholder="Consultation"
                />
                <Button
                  size="sm"
                  variant="danger"
                  className="ml-2 mt-6"
                  onClick={() => updateSteps(steps.filter((_, i) => i !== idx))}
                >
                  Remove
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className={textareaClasses}
                  rows={2}
                  value={step.description}
                  onChange={(e) => {
                    const next = [...steps];
                    next[idx] = { ...next[idx], description: e.target.value };
                    updateSteps(next);
                  }}
                  placeholder="Describe this step..."
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Terms Section ────────────────────────────────────────────────────────────

function TermsSection({
  pres,
  updatePresentation,
}: {
  pres: PresentationSettingsType;
  updatePresentation: (updates: Partial<PresentationSettingsType>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Terms &amp; Conditions</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Terms Content</label>
          <textarea
            className={textareaClasses}
            rows={12}
            value={pres.terms.content}
            onChange={(e) => updatePresentation({ terms: { content: e.target.value } })}
            placeholder="Enter your terms and conditions..."
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PresentationSettings() {
  const [activeSection, setActiveSection] = useState<SectionKey>('brand');
  const { org } = useOrganization();
  const orgId = org?.id ?? '';
  const { settings, updatePricing } = useSettingsStore();

  const pres: PresentationSettingsType = settings.pricing.presentation ?? getDefaultPresentation();

  function updatePresentation(updates: Partial<PresentationSettingsType>) {
    updatePricing({ presentation: { ...pres, ...updates } });
  }

  return (
    <div className="space-y-6">
      {/* Pill-style section switcher */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-display font-600 uppercase tracking-wide transition-colors ${
              activeSection === key
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {SECTION_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Section content */}
      {activeSection === 'brand' && <BrandSection pres={pres} updatePresentation={updatePresentation} />}
      {activeSection === 'about' && <AboutUsSection pres={pres} updatePresentation={updatePresentation} orgId={orgId} />}
      {activeSection === 'services' && <ServicesSection pres={pres} updatePresentation={updatePresentation} orgId={orgId} />}
      {activeSection === 'testimonials' && <TestimonialsSection pres={pres} updatePresentation={updatePresentation} orgId={orgId} />}
      {activeSection === 'gallery' && <GallerySection pres={pres} updatePresentation={updatePresentation} orgId={orgId} />}
      {activeSection === 'process' && <ProcessSection pres={pres} updatePresentation={updatePresentation} />}
      {activeSection === 'terms' && <TermsSection pres={pres} updatePresentation={updatePresentation} />}
    </div>
  );
}
