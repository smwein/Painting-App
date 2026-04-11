import { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { sendQuote } from '../../services/quoteService';
import { useSettingsStore } from '../../store/settingsStore';

interface SendQuoteModalProps {
  bidId: string;
  customerName: string;
  customerEmail: string;
  organizationId: string;
  onClose: () => void;
  onSent: (quoteUrl: string) => void;
}

export function SendQuoteModal({
  bidId,
  customerName,
  customerEmail,
  organizationId,
  onClose,
  onSent,
}: SendQuoteModalProps) {
  const { settings } = useSettingsStore();
  const defaultPages = settings.pricing.presentation?.defaultPages ?? ['estimate'];

  const [email, setEmail] = useState(customerEmail);
  const [name, setName] = useState(customerName);
  const [enabledPages, setEnabledPages] = useState<string[]>(defaultPages);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSend = async () => {
    if (!email.trim() || !name.trim()) {
      setError('Please fill in customer name and email.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const result = await sendQuote({
        bidId,
        customerEmail: email.trim(),
        customerName: name.trim(),
        enabledPages,
        expiresAt: expiresAt.toISOString(),
        organizationId,
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
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
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
