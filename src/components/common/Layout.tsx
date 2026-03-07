import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { useOrganization } from '../../context/OrganizationContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const { org } = useOrganization();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isPastDue = org?.planStatus === 'past_due';

  const navItems = [
    {
      path: '/app',
      label: 'Home',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
        </svg>
      ),
    },
    {
      path: '/app/saved-bids',
      label: 'Bids',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    ...(isAdmin
      ? [
          {
            path: '/app/settings',
            label: 'Settings',
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col h-screen bg-cream">
      {/* Header */}
      <header className="bg-navy text-white shadow-md sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link to="/app" className="flex items-center">
            <img src="/coatcalc-logo-cropped.png" alt="CoatCalc" className="h-8 drop-shadow-[0_0_1px_rgba(255,255,255,0.3)]" />
          </Link>

          {user && (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-7 h-7 rounded-full border-2 border-white/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm font-display font-700 text-teal-400">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                onClick={signOut}
                className="font-display text-xs font-600 uppercase tracking-wide text-white/50 hover:text-gold transition-colors"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Past-due warning banner */}
      {isPastDue && (
        <div className="bg-gold/10 border-b border-gold/30 px-4 py-2 text-center">
          <p className="text-sm text-navy">
            Your payment is past due. Please{' '}
            <Link to="/app/settings" className="font-semibold underline hover:text-teal-600">
              update your billing info
            </Link>{' '}
            to avoid losing access.
          </p>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin pb-20">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {children}
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-navy border-t border-white/10 shadow-lg z-20">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex flex-col items-center justify-center flex-1 h-full relative',
                  'transition-colors font-display text-xs font-600 uppercase tracking-wide',
                  {
                    'text-teal-400': isActive,
                    'text-white/40 hover:text-white/70': !isActive,
                  }
                )}
              >
                <span className="mb-1">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 w-12 h-0.5 bg-teal-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
