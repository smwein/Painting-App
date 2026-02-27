import { useNavigate } from 'react-router-dom';
import { useBidStore } from '../store/bidStore';
import { Card, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { format } from 'date-fns';

export function SavedBids() {
  const navigate = useNavigate();
  const { getAllBids, deleteBid, loadBid } = useBidStore();
  const bids = getAllBids();

  const handleDelete = (id: string, customerName: string) => {
    if (confirm(`Delete bid for ${customerName}?`)) {
      deleteBid(id);
    }
  };

  const handleView = (id: string) => {
    const bid = loadBid(id);
    if (bid) {
      // Navigate to the appropriate calculator with the bid data
      navigate(`/calculator/${bid.calculatorType}`, {
        state: { loadedBid: bid }
      });
    }
  };

  const getCalculatorLabel = (type: string) => {
    switch (type) {
      case 'interior-sqft':
        return 'Interior SF';
      case 'interior-detailed':
        return 'Interior Detailed';
      case 'exterior-sqft':
        return 'Exterior SF';
      case 'exterior-detailed':
        return 'Exterior Detailed';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Saved Bids</h2>
        <p className="text-gray-600">
          {bids.length === 0
            ? 'No saved bids yet. Create a bid to get started.'
            : `${bids.length} saved ${bids.length === 1 ? 'bid' : 'bids'}`}
        </p>
      </div>

      {bids.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-600 mb-6">
              You haven't saved any bids yet.
            </p>
            <Button onClick={() => navigate('/')} variant="primary">
              Create Your First Bid
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bids.map((bid) => (
            <div
              key={bid.id}
              onClick={() => handleView(bid.id)}
              className="cursor-pointer"
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {bid.customerName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded">
                        {getCalculatorLabel(bid.calculatorType)}
                      </span>
                      <span>
                        {format(new Date(bid.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold text-primary-700">
                      ${bid.total.toFixed(2)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(bid.id, bid.customerName);
                      }}
                      className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
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
