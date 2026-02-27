import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bid, BidListItem } from '../types/bid.types';

interface BidState {
  bids: Bid[];
  currentBid: Bid | null;

  // CRUD operations
  saveBid: (bid: Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>) => void;
  loadBid: (id: string) => Bid | null;
  updateBid: (id: string, updates: Partial<Omit<Bid, 'id' | 'createdAt'>>) => void;
  deleteBid: (id: string) => void;

  // List operations
  getAllBids: () => BidListItem[];
  setCurrentBid: (bid: Bid | null) => void;
  clearCurrentBid: () => void;
}

export const useBidStore = create<BidState>()(
  persist(
    (set, get) => ({
      bids: [],
      currentBid: null,

      saveBid: (bidData) => {
        const newBid: Bid = {
          ...bidData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          bids: [...state.bids, newBid],
          currentBid: newBid,
        }));
      },

      loadBid: (id) => {
        const bid = get().bids.find((b) => b.id === id);
        if (bid) {
          set({ currentBid: bid });
          return bid;
        }
        return null;
      },

      updateBid: (id, updates) => {
        set((state) => ({
          bids: state.bids.map((bid) =>
            bid.id === id
              ? {
                  ...bid,
                  ...updates,
                  updatedAt: new Date(),
                }
              : bid
          ),
        }));

        // Update currentBid if it's the one being updated
        const currentBid = get().currentBid;
        if (currentBid && currentBid.id === id) {
          set({
            currentBid: {
              ...currentBid,
              ...updates,
              updatedAt: new Date(),
            },
          });
        }
      },

      deleteBid: (id) => {
        set((state) => ({
          bids: state.bids.filter((bid) => bid.id !== id),
          currentBid: state.currentBid?.id === id ? null : state.currentBid,
        }));
      },

      getAllBids: () => {
        const bids = get().bids;

        // Convert to BidListItem format and sort by date (newest first)
        return bids
          .map((bid): BidListItem => ({
            id: bid.id,
            customerName: bid.customer.name,
            total: bid.result.total,
            createdAt: bid.createdAt,
            calculatorType: bid.calculatorType,
          }))
          .sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA; // Newest first
          });
      },

      setCurrentBid: (bid) => {
        set({ currentBid: bid });
      },

      clearCurrentBid: () => {
        set({ currentBid: null });
      },
    }),
    {
      name: 'painting-bids-storage',
    }
  )
);
