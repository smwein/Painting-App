import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function AdminRoute() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
