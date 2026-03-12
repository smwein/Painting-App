import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SubscriptionGate } from './components/auth/SubscriptionGate';
import { OrganizationProvider } from './context/OrganizationContext';
import { useSupabaseAuthStore } from './store/supabaseAuthStore';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const SavedBids = lazy(() => import('./pages/SavedBids').then(m => ({ default: m.SavedBids })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const CalculatorPage = lazy(() => import('./pages/CalculatorPage').then(m => ({ default: m.CalculatorPage })));
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const NewLogin = lazy(() => import('./pages/NewLogin').then(m => ({ default: m.NewLogin })));
const SignUp = lazy(() => import('./pages/SignUp').then(m => ({ default: m.SignUp })));
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const Subscribe = lazy(() => import('./pages/Subscribe').then(m => ({ default: m.Subscribe })));
const AcceptInvite = lazy(() => import('./pages/AcceptInvite').then(m => ({ default: m.AcceptInvite })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Support = lazy(() => import('./pages/Support').then(m => ({ default: m.Support })));

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
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<NewLogin />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/support" element={<Support />} />

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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
