import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBidStore } from '../store/bidStore';
import { useAuthStore } from '../store/authStore';
import { Card, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SendQuoteModal } from '../components/quotes/SendQuoteModal';
import { QuoteSentModal } from '../components/quotes/QuoteSentModal';
import { fetchQuotesForOrg, sendQuote } from '../services/quoteService';
import type { PublicQuote } from '../types/quote.types';
import { format, formatDistanceToNow } from 'date-fns';
import { useOrganization } from '../context/OrganizationContext';
import { UpgradeNudge } from '../components/common/UpgradeNudge';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'expired', label: 'Expired' },
];

const CALCULATOR_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'interior-sqft', label: 'Interior SF' },
  { value: 'interior-detailed', label: 'Interior Detailed' },
  { value: 'exterior-sqft', label: 'Exterior SF' },
  { value: 'exterior-detailed', label: 'Exterior Detailed' },
  { value: 'per-room', label: 'Per Room' },
];

export function SavedBids() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getAllBids, deleteBid, loadBid } = useBidStore();
  const allBids = getAllBids(user?.role);

  const { isProTier } = useOrganization();
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [quoteMap, setQuoteMap] = useState<Map<string, PublicQuote>>(new Map());
  const [sendModalBid, setSendModalBid] = useState<{ id: string; name: string; email: string } | null>(null);
  const [sentQuoteUrl, setSentQuoteUrl] = useState<string | null>(null);
  const [resendingBidId, setResendingBidId] = useState<string | null>(null);
  const [resendFeedback, setResendFeedback] = useState<{ bidId: string; type: 'success' | 'error' } | null>(null);
  const [copiedBidId, setCopiedBidId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.organizationId) return;
    fetchQuotesForOrg(user.organizationId).then((quotes) => {
      const map = new Map<string, PublicQuote>();
      quotes.forEach((q) => map.set(q.bidId, q));
      setQuoteMap(map);
    }).catch(console.error);
  }, [user?.organizationId]);

  const filteredBids = allBids.filter((bid) => {
    const matchesSearch = !searchQuery || bid.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || bid.calculatorType === typeFilter;
    if (!statusFilter) return matchesSearch && matchesType;
    const quote = quoteMap.get(bid.id);
    if (statusFilter === 'draft') return matchesSearch && matchesType && !quote;
    if (!quote) return false;
    return matchesSearch && matchesType && getEffectiveStatus(quote) === statusFilter;
  });

  const handleDelete = (e: React.MouseEvent, id: string, customerName: string) => {
    e.stopPropagation();
    if (confirm(`Delete bid for ${customerName}?`)) {
      deleteBid(id);
    }
  };

  const handleView = (id: string) => {
    const bid = loadBid(id);
    if (bid) {
      navigate(`/app/calculator/${bid.calculatorType}`, {
        state: { loadedBid: bid },
      });
    }
  };

  const handleClone = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const bid = loadBid(id);
    if (bid) {
      const clonedBid = {
        ...bid,
        id: crypto.randomUUID(),
        customer: { ...bid.customer, name: '', address: '', phone: '', email: '' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      navigate(`/app/calculator/${bid.calculatorType}`, {
        state: { loadedBid: clonedBid },
      });
    }
  };

  const getEffectiveStatus = (quote: PublicQuote): string => {
    if (quote.status === 'accepted') return 'accepted';
    if (new Date(quote.expiresAt) < new Date()) return 'expired';
    return quote.status;
  };

  const getActivityText = (quote: PublicQuote): string => {
    const status = getEffectiveStatus(quote);
    if (status === 'accepted' && quote.acceptedAt) {
      return `Accepted ${formatDistanceToNow(new Date(quote.acceptedAt), { addSuffix: true })}`;
    }
    if (status === 'expired') {
      return `Expired ${format(new Date(quote.expiresAt), 'MMM d')}`;
    }
    if (status === 'viewed' && quote.viewedAt) {
      const viewText = `Viewed ${formatDistanceToNow(new Date(quote.viewedAt), { addSuffix: true })}`;
      return quote.viewCount > 1 ? `${viewText} (${quote.viewCount} views)` : viewText;
    }
    if (status === 'sent') {
      return `Sent ${formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}`;
    }
    return '';
  };

  const getCalculatorLabel = (type: string) => {
    const option = CALCULATOR_OPTIONS.find((o) => o.value === type);
    return option?.label || type;
  };

  const handleResend = async (e: React.MouseEvent, bid: typeof allBids[0]) => {
    e.stopPropagation();
    const quote = quoteMap.get(bid.id);
    if (!quote || !user?.organizationId) return;

    setResendingBidId(bid.id);
    setResendFeedback(null);
    try {
      await sendQuote({
        bidId: bid.id,
        customerEmail: quote.customerEmail,
        customerName: quote.customerName,
        enabledPages: quote.enabledPages,
        expiresAt: quote.expiresAt,
        organizationId: user.organizationId,
      });
      setResendFeedback({ bidId: bid.id, type: 'success' });
      fetchQuotesForOrg(user.organizationId).then((quotes) => {
        const map = new Map<string, PublicQuote>();
        quotes.forEach((q) => map.set(q.bidId, q));
        setQuoteMap(map);
      }).catch(console.error);
    } catch {
      setResendFeedback({ bidId: bid.id, type: 'error' });
    } finally {
      setResendingBidId(null);
      setTimeout(() => setResendFeedback(null), 2000);
    }
  };

  const handleCopyLink = async (e: React.MouseEvent, bidId: string) => {
    e.stopPropagation();
    const quote = quoteMap.get(bidId);
    if (!quote) return;

    const url = `${window.location.origin}/quote/${quote.publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopiedBidId(bidId);
    setTimeout(() => setCopiedBidId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-800 uppercase tracking-wide text-navy mb-2">Saved Bids</h2>
        <p className="text-gray-600">
          {allBids.length === 0
            ? 'No saved bids yet. Create a bid to get started.'
            : `${filteredBids.length === allBids.length ? allBids.length : `Showing ${filteredBids.length} of ${allBids.length}`} saved ${allBids.length === 1 ? 'bid' : 'bids'}`}
        </p>
      </div>

      {allBids.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-body"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-body"
          >
            {CALCULATOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-body"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {allBids.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 mb-6">You haven't saved any bids yet.</p>
            <Button onClick={() => navigate('/app')} variant="primary">
              Create Your First Bid
            </Button>
          </CardContent>
        </Card>
      ) : filteredBids.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-gray-500">No bids match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBids.map((bid) => (
            <div key={bid.id} onClick={() => handleView(bid.id)} className="cursor-pointer">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {bid.customerName}
                      </h3>
                      {bid.notes && (
                        <p className="text-sm text-gray-400 mt-0.5 truncate">
                          {bid.notes.length > 80 ? bid.notes.slice(0, 80) + '...' : bid.notes}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-teal-50 text-teal-700">
                          {getCalculatorLabel(bid.calculatorType)}
                        </span>
                        {(() => {
                          const quote = quoteMap.get(bid.id);
                          if (!quote) return null;
                          const status = getEffectiveStatus(quote);
                          const colors: Record<string, string> = {
                            sent: 'bg-blue-100 text-blue-700',
                            viewed: 'bg-yellow-100 text-yellow-700',
                            accepted: 'bg-green-100 text-green-700',
                            declined: 'bg-red-100 text-red-700',
                            expired: 'bg-gray-100 text-gray-500',
                          };
                          const activity = getActivityText(quote);
                          return (
                            <>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? ''}`}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                              {activity && (
                                <span className="text-xs text-gray-400">{activity}</span>
                              )}
                            </>
                          );
                        })()}
                        <span>
                          {format(new Date(bid.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-display font-800 text-navy">
                        ${bid.total.toFixed(2)}
                      </div>
                      <div className="mt-2 flex items-center gap-3 justify-end">
                        {!quoteMap.has(bid.id) ? (
                          isProTier ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSendModalBid({ id: bid.id, name: bid.customerName, email: '' });
                              }}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Send
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowUpgradeNudge(true);
                              }}
                              className="text-sm text-gray-400 hover:text-gray-500 font-medium"
                            >
                              Send &#x1f512;
                            </button>
                          )
                        ) : (
                          <>
                            <button
                              onClick={(e) => handleResend(e, bid)}
                              disabled={resendingBidId === bid.id}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                            >
                              {resendingBidId === bid.id
                                ? 'Sending...'
                                : resendFeedback?.bidId === bid.id
                                  ? resendFeedback.type === 'success'
                                    ? 'Resent!'
                                    : 'Failed'
                                  : 'Resend'}
                            </button>
                            <button
                              onClick={(e) => handleCopyLink(e, bid.id)}
                              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                            >
                              {copiedBidId === bid.id ? 'Copied!' : 'Copy Link'}
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => handleClone(e, bid.id)}
                          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                        >
                          Clone
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, bid.id, bid.customerName)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {sendModalBid && user?.organizationId && (
        <SendQuoteModal
          bidId={sendModalBid.id}
          customerName={sendModalBid.name}
          customerEmail={sendModalBid.email}
          organizationId={user.organizationId}
          onClose={() => setSendModalBid(null)}
          onSent={(url) => {
            setSendModalBid(null);
            setSentQuoteUrl(url);
            // Refresh quote statuses
            fetchQuotesForOrg(user.organizationId!).then((quotes) => {
              const map = new Map<string, PublicQuote>();
              quotes.forEach((q) => map.set(q.bidId, q));
              setQuoteMap(map);
            }).catch(console.error);
          }}
        />
      )}

      {sentQuoteUrl && (
        <QuoteSentModal
          quoteUrl={sentQuoteUrl}
          onClose={() => setSentQuoteUrl(null)}
        />
      )}

      {showUpgradeNudge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <UpgradeNudge feature="Emailing quotes to customers" />
            <button
              onClick={() => setShowUpgradeNudge(false)}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
