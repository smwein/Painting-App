import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/saved-bids', label: 'Bids', icon: '📋' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-700 text-white shadow-md sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold">Bid Calculator</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin pb-20">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {children}
        </div>
      </main>

      {/* Bottom navigation (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex flex-col items-center justify-center flex-1 h-full',
                  'transition-colors',
                  {
                    'text-primary-600 bg-primary-50': isActive,
                    'text-gray-600 hover:text-primary-600 hover:bg-gray-50': !isActive,
                  }
                )}
              >
                <span className="text-2xl mb-1">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
