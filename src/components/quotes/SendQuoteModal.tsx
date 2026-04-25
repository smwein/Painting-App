import { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { sendQuote } from '../../services/quoteService';
import { useSettingsStore } from '../../store/settingsStore';
import { useOrganization } from '../../context/OrganizationContext';

interface SendQuoteModalProps {
  bidId: string;
  customerName: string;
  customerEmail: string;
  organizationId: string;
  bidTotal: number;
  onClose: () => void;
  onSent: (quoteUrl: string) => void;
}

function defaultDiscountExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(23, 59, 0, 0);
  return toLocalInputValue(d);
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SendQuoteModal({
  bidId,
  customerName,
  customerEmail,
  organizationId,
  bidTotal,
  onClose,
  onSent,
}: SendQuoteModalProps) {
  const { settings } = useSettingsStore();
  const { isProTier } = useOrganization();
  const defaultPages = settings.pricing.presentation?.defaultPages ?? ['estimate'];

  const [email, setEmail] = useState(customerEmail);
  const [name, setName] = useState(customerName);
  const [enabledPages, setEnabledPages] = useState<string[]>(defaultPages);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<string>('10');
  const [discountExpiresAt, setDiscountExpiresAt] = useState<string>(defaultDiscountExpiry());

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

  const validateDiscount = (): string | null => {
    if (!discountEnabled) return null;

    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      return 'Discount value must be greater than zero.';
    }
    if (discountType === 'percent' && value > 90) {
      return 'Percentage discount cannot exceed 90%.';
    }
    if (discountType === 'fixed' && value >= bidTotal) {
      return 'Fixed discount must be less than the bid total.';
    }

    const expiry = new Date(discountExpiresAt);
    if (Number.isNaN(expiry.getTime())) {
      return 'Discount expiration is not a valid date.';
    }
    if (expiry.getTime() < Date.now() + 60 * 60 * 1000) {
      return 'Discount expiration must be at least 1 hour from now.';
    }

    return null;
  };

  const handleSend = async () => {
    if (!email.trim() || !name.trim()) {
      setError('Please fill in customer name and email.');
      return;
    }
    const discountError = validateDiscount();
    if (discountError) {
      setError(discountError);
      return;
    }

    setSending(true);
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const discount = discountEnabled
        ? {
            type: discountType,
            value: Number(discountValue),
            expiresAt: new Date(discountExpiresAt).toISOString(),
          }
        : null;

      const result = await sendQuote({
        bidId,
        customerEmail: email.trim(),
        customerName: name.trim(),
        enabledPages,
        expiresAt: expiresAt.toISOString(),
        organizationId,
        discount,
      });

      onSent(result.quoteUrl);
    } catch (err) {
      setError((err as Error).message || 'Failed to send quote');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Send Estimate to Customer</h2>
        <p className="text-sm text-gray-500 mb-5">They'll receive an email with a link to view and accept the estimate.</p>

        <div className="space-y-4">
          <Input
            label="Customer Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
          />

          <Input
            label="Customer Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@email.com"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires In</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>

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

          {isProTier && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={discountEnabled}
                  onChange={(e) => setDiscountEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                />
                Add a limited-time discount?
              </label>

              {discountEnabled && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Discount type</label>
                    <div className="flex gap-3 text-sm">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="discountType"
                          checked={discountType === 'percent'}
                          onChange={() => setDiscountType('percent')}
                        />
                        Percentage
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="discountType"
                          checked={discountType === 'fixed'}
                          onChange={() => setDiscountType('fixed')}
                        />
                        Fixed dollar
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {discountType === 'percent' ? 'Percentage off' : 'Dollars off'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={discountType === 'percent' ? '1' : '0.01'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder={discountType === 'percent' ? '10' : '500'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Expires</label>
                    <input
                      type="datetime-local"
                      value={discountExpiresAt}
                      onChange={(e) => setDiscountExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Painter's local time. Customer sees countdown in their time zone.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={sending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSend} className="flex-1" disabled={sending}>
            {sending ? 'Sending...' : 'Send Estimate'}
          </Button>
        </div>
      </div>
    </div>
  );
}
