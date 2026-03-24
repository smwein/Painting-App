import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { fetchAdminStats, type AdminStats } from '../services/adminService';

const SUPER_ADMIN_ID = '75bbc37d-ca23-4a32-9dbb-265780af7370';

type SortKey = 'name' | 'planStatus' | 'memberCount' | 'bidCount' | 'lastBidDate' | 'createdAt';
type SortDir = 'asc' | 'desc';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCalcType(type: string): string {
  const map: Record<string, string> = {
    'interior-sqft': 'Interior (Sqft)',
    'interior-detailed': 'Interior (Detailed)',
    'exterior-sqft': 'Exterior (Sqft)',
    'exterior-detailed': 'Exterior (Detailed)',
    'per-room': 'Per Room',
  };
  return map[type] || type;
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function PlanBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[#0ea5a0]/20 text-[#0ea5a0]',
    trialing: 'bg-[#d4a24e]/20 text-[#d4a24e]',
    past_due: 'bg-red-500/20 text-red-400',
    canceled: 'bg-gray-500/20 text-gray-400',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-700 uppercase tracking-wide rounded-sm ${colors[status] || colors.canceled}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white p-5 border-l-4 border-[#0ea5a0]">
      <p className="font-display text-xs font-700 uppercase tracking-[0.15em] text-gray-400 mb-1">{label}</p>
      <p className="font-display text-3xl font-900 text-[#0f1f2e]">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function PercentBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-gray-600 w-36 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 h-5 relative">
        <div className="absolute inset-y-0 left-0 bg-[#0ea5a0]/70" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-600 text-[#0f1f2e] w-10 text-right">{count}</span>
    </div>
  );
}

export function Admin() {
  const user = useSupabaseAuthStore((s) => s.user);
  const loading = useSupabaseAuthStore((s) => s.loading);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('bidCount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const loadStats = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const data = await fetchAdminStats();
      setStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (user?.uid === SUPER_ADMIN_ID) {
      loadStats();
    }
  }, [user, loadStats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed]">
        <div className="animate-spin h-8 w-8 border-4 border-[#0ea5a0] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.uid !== SUPER_ADMIN_ID) {
    return <Navigate to="/" replace />;
  }

  const sortedCompanies = stats ? [...stats.companies].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  }) : [];

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const maxByType = stats ? Math.max(...Object.values(stats.bidsByType), 1) : 1;
  const maxByStatus = stats ? Math.max(...Object.values(stats.bidsByStatus), 1) : 1;

  return (
    <div className="min-h-screen bg-[#f5f2ed] font-body text-[#1a2332]">
      {/* Header */}
      <div className="bg-[#0f1f2e] px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-900 uppercase tracking-tight text-white">Admin Dashboard</h1>
            {lastRefresh && (
              <p className="text-xs text-white/40 mt-1">
                Last refreshed: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={loadStats}
            disabled={fetching}
            className="font-display text-sm font-700 uppercase tracking-wide bg-[#0ea5a0] text-white px-5 py-2.5 hover:bg-[#0ea5a0]/80 transition-colors disabled:opacity-50"
          >
            {fetching ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm">{error}</div>
        )}

        {fetching && !stats ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-[#0ea5a0] border-t-transparent rounded-full" />
          </div>
        ) : stats && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Organizations" value={stats.summary.totalOrgs} />
              <StatCard label="Total Users" value={stats.summary.totalUsers} />
              <StatCard label="Total Bids" value={stats.summary.totalBids} />
              <StatCard label="Active Subs" value={stats.summary.activeSubscriptions} />
            </div>

            {/* Activity Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Bids (7 days)" value={stats.activity.bidsLast7Days} />
              <StatCard label="Bids (30 days)" value={stats.activity.bidsLast30Days} />
              <StatCard label="New Orgs (7d)" value={stats.activity.newOrgsLast7Days} />
              <StatCard label="New Orgs (30d)" value={stats.activity.newOrgsLast30Days} />
            </div>

            {/* Expiring Trials */}
            {stats.expiringTrials.length > 0 && (
              <div className="bg-[#d4a24e]/10 border-l-4 border-[#d4a24e] p-4">
                <p className="font-display text-sm font-800 uppercase tracking-wide text-[#d4a24e] mb-2">
                  Trials Expiring Soon
                </p>
                {stats.expiringTrials.map((t) => (
                  <p key={t.id} className="text-sm text-gray-600">
                    <span className="font-600">{t.name}</span> — expires {formatDate(t.trialEndsAt)}
                  </p>
                ))}
              </div>
            )}

            {/* Company Leaderboard */}
            <div>
              <h2 className="font-display text-xl font-800 uppercase tracking-wide text-[#0f1f2e] mb-4">
                Company Leaderboard
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0f1f2e] text-white text-left">
                      <th className="px-3 py-2 font-display font-700 uppercase text-xs tracking-wide">#</th>
                      <th className="px-3 py-2 font-display font-700 uppercase text-xs tracking-wide cursor-pointer hover:text-[#0ea5a0]" onClick={() => toggleSort('name')}>
                        Company{sortArrow('name')}
                      </th>
                      <th className="px-3 py-2 font-display font-700 uppercase text-xs tracking-wide cursor-pointer hover:text-[#0ea5a0]" onClick={() => toggleSort('planStatus')}>
                        Plan{sortArrow('planStatus')}
                      </th>
                      <th className="px-3 py-2 font-display font-700 uppercase text-xs tracking-wide cursor-pointer hover:text-[#0ea5a0] text-right" onClick={() => toggleSort('memberCount')}>
                        Members{sortArrow('memberCount')}
                      </th>
                      <th className="px-3 py-2 font-display font-700 uppercase text-xs tracking-wide cursor-pointer hover:text-[#0ea5a0] text-right" onClick={() => toggleSort('bidCount')}>
                        Bids{sortArrow('bidCount')}
                      </th>
                      <th className="px-3 py-2 font-display font-700 uppercase text-xs tracking-wide cursor-pointer hover:text-[#0ea5a0]" onClick={() => toggleSort('lastBidDate')}>
                        Last Bid{sortArrow('lastBidDate')}
                      </th>
                      <th className="px-3 py-2 font-display font-700 uppercase text-xs tracking-wide cursor-pointer hover:text-[#0ea5a0]" onClick={() => toggleSort('createdAt')}>
                        Created{sortArrow('createdAt')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCompanies.map((c, i) => (
                      <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2.5 font-display font-700 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2.5 font-600">{c.name}</td>
                        <td className="px-3 py-2.5"><PlanBadge status={c.planStatus} /></td>
                        <td className="px-3 py-2.5 text-right">{c.memberCount}</td>
                        <td className="px-3 py-2.5 text-right font-600">{c.bidCount}</td>
                        <td className="px-3 py-2.5 text-gray-500">{formatDate(c.lastBidDate)}</td>
                        <td className="px-3 py-2.5 text-gray-500">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bid Breakdown */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="font-display text-xl font-800 uppercase tracking-wide text-[#0f1f2e] mb-4">
                  Bids by Calculator Type
                </h2>
                <div className="bg-white p-4">
                  {Object.entries(stats.bidsByType).map(([type, count]) => (
                    <PercentBar key={type} label={formatCalcType(type)} count={count} max={maxByType} />
                  ))}
                  {Object.keys(stats.bidsByType).length === 0 && (
                    <p className="text-sm text-gray-400">No bids yet</p>
                  )}
                </div>
              </div>
              <div>
                <h2 className="font-display text-xl font-800 uppercase tracking-wide text-[#0f1f2e] mb-4">
                  Bids by Status
                </h2>
                <div className="bg-white p-4">
                  {Object.entries(stats.bidsByStatus).map(([status, count]) => (
                    <PercentBar key={status} label={formatStatus(status)} count={count} max={maxByStatus} />
                  ))}
                  {Object.keys(stats.bidsByStatus).length === 0 && (
                    <p className="text-sm text-gray-400">No bids yet</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
