import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { Home } from './pages/Home';
import { SavedBids } from './pages/SavedBids';
import { Settings } from './pages/Settings';
import { CalculatorPage } from './pages/CalculatorPage';
import { Login } from './pages/Login';
import { useAuthStore } from './store/authStore';

function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* All other routes are protected (require login) */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/calculator/:type" element={<CalculatorPage />} />
                  <Route path="/saved-bids" element={<SavedBids />} />
                  <Route
                    path="/settings"
                    element={
                      <AdminRoute>
                        <Settings />
                      </AdminRoute>
                    }
                  />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
