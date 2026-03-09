import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SubscriptionGate } from './components/auth/SubscriptionGate';
import { OrganizationProvider } from './context/OrganizationContext';
import { Home } from './pages/Home';
import { SavedBids } from './pages/SavedBids';
import { Settings } from './pages/Settings';
import { CalculatorPage } from './pages/CalculatorPage';
import { Landing } from './pages/Landing';
import { NewLogin } from './pages/NewLogin';
import { SignUp } from './pages/SignUp';
import { Onboarding } from './pages/Onboarding';
import { Subscribe } from './pages/Subscribe';
import { AcceptInvite } from './pages/AcceptInvite';
import { Terms } from './pages/Terms';
import { useSupabaseAuthStore } from './store/supabaseAuthStore';

function AppShell() {
  return (
    <OrganizationProvider>
      <SubscriptionGate>
        <Layout>
          <Outlet />
        </Layout>
      </SubscriptionGate>
    </OrganizationProvider>
  );
}

function App() {
  const initialize = useSupabaseAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<NewLogin />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
        <Route path="/terms" element={<Terms />} />

        {/* Auth required but no org needed */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/subscribe" element={
            <OrganizationProvider>
              <Subscribe />
            </OrganizationProvider>
          } />

          {/* Full app — auth + org + active subscription */}
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="calculator/:type" element={<CalculatorPage />} />
            <Route path="saved-bids" element={<SavedBids />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
