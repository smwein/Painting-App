import { useState } from 'react';
import { Button } from '../common/Button';

interface QuoteSentModalProps {
  quoteUrl: string;
  onClose: () => void;
}

export function QuoteSentModal({ quoteUrl, onClose }: QuoteSentModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(quoteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = quoteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
        {/* Green checkmark */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1">Estimate Sent!</h2>
        <p className="text-sm text-gray-500 mb-5">Your estimate has been emailed to the customer.</p>

        {/* Quote URL display */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate text-left">
            {quoteUrl}
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-2 text-sm font-medium text-teal-600 hover:text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors whitespace-nowrap"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(quoteUrl, '_blank')}
            className="flex-1"
          >
            Preview
          </Button>
          <Button variant="primary" onClick={onClose} className="flex-1">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
