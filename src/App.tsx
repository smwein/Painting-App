import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { Home } from './pages/Home';
import { SavedBids } from './pages/SavedBids';
import { Settings } from './pages/Settings';
import { CalculatorPage } from './pages/CalculatorPage';
import { Login } from './pages/Login';
import { useAuthStore } from './store/authStore';

// Layout wrapper: renders Layout with the current child route via Outlet
function LayoutRoute() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected: must be logged in */}
        <Route element={<ProtectedRoute />}>
          {/* Layout wraps all protected pages */}
          <Route element={<LayoutRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/calculator/:type" element={<CalculatorPage />} />
            <Route path="/saved-bids" element={<SavedBids />} />

            {/* Admin only */}
            <Route element={<AdminRoute />}>
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
