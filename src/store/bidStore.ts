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
  saveBid: (bid: Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Bid>;
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

      saveBid: async (bidData) => {
        const { _orgId, _userId } = get();
        const localId = crypto.randomUUID();
        const newBid: Bid = {
          ...bidData,
          id: localId,
          createdAt: new Date(),
          updatedAt: new Date(),
          created_by: _userId || undefined,
        };

        set((state) => ({
          bids: [...state.bids, newBid],
          currentBid: newBid,
        }));

        // Sync to Supabase, then update the local bid with the Supabase-generated id.
        // Awaiting here means callers (e.g. CalculatorPage's Send-to-Customer flow) get
        // back the bid carrying the real Supabase id and can immediately reference it.
        if (_orgId && _userId) {
          const remoteId = await bidService.saveBid(_orgId, _userId, bidData);
          set((state) => ({
            bids: state.bids.map((b) => (b.id === localId ? { ...b, id: remoteId } : b)),
            currentBid:
              state.currentBid?.id === localId
                ? { ...state.currentBid, id: remoteId }
                : state.currentBid,
          }));
          return { ...newBid, id: remoteId };
        }

        return newBid;
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
