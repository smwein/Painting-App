import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../config/supabase';

const SUBJECT_OPTIONS = [
  'General Question',
  'Bug Report',
  'Billing Question',
  'Feature Request',
] as const;

export function Support() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState<string>(SUBJECT_OPTIONS[0]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: fnError } = await supabase.functions.invoke('send-support', {
        body: { name, email, subject, message },
      });

      if (fnError) {
        setError(fnError.message || 'Something went wrong. Please try again.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f2ed] flex flex-col">
        <nav className="bg-[#0f1f2e] shadow-md">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center">
            <Link to="/" className="flex items-center">
              <img src="/coatcalc-logo-final.png" alt="CoatCalc" className="h-10 drop-shadow-[0_0_1px_rgba(255,255,255,0.3)]" />
            </Link>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white shadow-lg p-8 w-full max-w-lg text-center">
            <div className="mb-4 text-green-600 font-display text-sm font-700 uppercase tracking-[0.2em]">
              Message Sent
            </div>
            <h1 className="font-display text-3xl font-900 uppercase text-[#0f1f2e] mb-3">
              Thank You
            </h1>
            <p className="font-body text-sm text-gray-600 mb-6">
              We received your message and will get back to you as soon as possible.
            </p>
            <Link
              to="/"
              className="inline-block font-display text-sm font-700 uppercase tracking-wide bg-[#d4a24e] text-[#0f1f2e] px-8 py-3 hover:bg-[#e0b565] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f2ed] flex flex-col">
      <nav className="bg-[#0f1f2e] shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center">
          <Link to="/" className="flex items-center">
            <img src="/coatcalc-logo-final.png" alt="CoatCalc" className="h-10 drop-shadow-[0_0_1px_rgba(255,255,255,0.3)]" />
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white shadow-lg p-8 w-full max-w-lg">
          <div className="text-center mb-6">
            <div className="font-display text-sm font-700 uppercase tracking-[0.2em] text-[#0ea5a0] mb-2">
              Get in Touch
            </div>
            <h1 className="font-display text-3xl font-900 uppercase text-[#0f1f2e]">
              Support
            </h1>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700 font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block font-display text-sm font-700 uppercase tracking-[0.2em] text-[#0ea5a0] mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-body text-sm"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block font-display text-sm font-700 uppercase tracking-[0.2em] text-[#0ea5a0] mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-body text-sm"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block font-display text-sm font-700 uppercase tracking-[0.2em] text-[#0ea5a0] mb-1">
                Subject
              </label>
              <select
                id="subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-body text-sm bg-white"
              >
                {SUBJECT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block font-display text-sm font-700 uppercase tracking-[0.2em] text-[#0ea5a0] mb-1">
                Message
              </label>
              <textarea
                id="message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-body text-sm resize-vertical"
                placeholder="How can we help?"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-display text-sm font-700 uppercase tracking-wide bg-[#d4a24e] text-[#0f1f2e] px-8 py-3 hover:bg-[#e0b565] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
