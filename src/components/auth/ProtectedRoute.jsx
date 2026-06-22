import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuthStore();
  const location = useLocation();
  const adminToken = localStorage.getItem('adminToken');

  if (loading) return <div className="loading-page"><div className="spinner" /><p>Loading...</p></div>;

  // For admin routes, check both isAdmin flag and adminToken
  const isAdminUser = isAdmin || !!adminToken;

  if (adminOnly) {
    if (!isAuthenticated && !adminToken) {
      return <Navigate to="/admin/login" replace />;
    }
    if (!isAdminUser) {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
