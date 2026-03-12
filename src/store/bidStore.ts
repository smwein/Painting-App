import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bid, BidListItem } from '../types/bid.types';
import { migrateBidToCurrentVersion } from '../utils/bidMigration';
import { useSettingsStore } from './settingsStore';
import * as bidService from '../services/bidService';

interface BidState {
  bids: Bid[];
  currentBid: Bid | null;
  _orgId: string | null;
  _userId: string | null;

  // Init
  setOrg: (orgId: string, userId: string) => void;
  loadFromSupabase: (orgId: string, role?: string, userId?: string) => Promise<void>;

  // CRUD operations
  saveBid: (bid: Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>) => void;
  loadBid: (id: string) => Bid | null;
  updateBid: (id: string, updates: Partial<Omit<Bid, 'id' | 'createdAt'>>) => void;
  deleteBid: (id: string) => void;

  // List operations
  getAllBids: (role?: string) => BidListItem[];
  setCurrentBid: (bid: Bid | null) => void;
  clearCurrentBid: () => void;
}

export const useBidStore = create<BidState>()(
  persist(
    (set, get) => ({
      bids: [],
      currentBid: null,
      _orgId: null,
      _userId: null,

      setOrg: (orgId, userId) => set({ _orgId: orgId, _userId: userId }),

      loadFromSupabase: async (orgId: string, role?: string, userId?: string) => {
        const filterUserId = role === 'estimator' ? userId : undefined;
        const remoteBids = await bidService.fetchBids(orgId, filterUserId);
        if (remoteBids.length > 0) {
          set({ bids: remoteBids });
        }
      },

      saveBid: (bidData) => {
        const { _orgId, _userId } = get();
        const newBid: Bid = {
          ...bidData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          created_by: _userId || undefined,
        };

        set((state) => ({
          bids: [...state.bids, newBid],
          currentBid: newBid,
        }));

        // Sync to Supabase
        if (_orgId && _userId) {
          bidService.saveBid(_orgId, _userId, bidData).then((remoteId) => {
            // Update local bid with the Supabase-generated ID
            set((state) => ({
              bids: state.bids.map((b) =>
                b.id === newBid.id ? { ...b, id: remoteId } : b
              ),
              currentBid: state.currentBid?.id === newBid.id
                ? { ...state.currentBid, id: remoteId }
                : state.currentBid,
            }));
          }).catch(console.error);
        }
      },

      loadBid: (id) => {
        const bid = get().bids.find((b) => b.id === id);
        if (bid) {
          const pricing = useSettingsStore.getState().settings.pricing;
          const migratedBid = migrateBidToCurrentVersion(bid, pricing);
          set({ currentBid: migratedBid });
          return migratedBid;
        }
        return null;
      },

      updateBid: (id, updates) => {
        set((state) => ({
          bids: state.bids.map((bid) =>
            bid.id === id
              ? { ...bid, ...updates, updatedAt: new Date() }
              : bid
          ),
        }));

        const currentBid = get().currentBid;
        if (currentBid && currentBid.id === id) {
          set({
            currentBid: { ...currentBid, ...updates, updatedAt: new Date() },
          });
        }

        // Sync to Supabase
        bidService.updateBid(id, updates as Partial<Bid>).catch(console.error);
      },

      deleteBid: (id) => {
        set((state) => ({
          bids: state.bids.filter((bid) => bid.id !== id),
          currentBid: state.currentBid?.id === id ? null : state.currentBid,
        }));

        // Sync to Supabase
        bidService.deleteBid(id).catch(console.error);
      },

      getAllBids: (role?: string) => {
        const { bids, _userId } = get();

        // Estimators only see their own bids
        const filteredBids = (role === 'estimator' && _userId)
          ? bids.filter((bid) => bid.created_by === _userId)
          : bids;

        return filteredBids
          .map((bid): BidListItem => ({
            id: bid.id,
            customerName: bid.customer.name,
            total: bid.result.total,
            createdAt: bid.createdAt,
            calculatorType: bid.calculatorType,
            notes: bid.customer.notes,
            created_by: bid.created_by,
          }))
          .sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
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
