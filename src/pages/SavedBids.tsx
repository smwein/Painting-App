import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBidStore } from '../store/bidStore';
import { useAuthStore } from '../store/authStore';
import { Card, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { format } from 'date-fns';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filteredBids = allBids.filter((bid) => {
    const matchesSearch = !searchQuery || bid.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || bid.calculatorType === typeFilter;
    return matchesSearch && matchesType;
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

  const getCalculatorLabel = (type: string) => {
    const option = CALCULATOR_OPTIONS.find((o) => o.value === type);
    return option?.label || type;
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
    </div>
  );
}
