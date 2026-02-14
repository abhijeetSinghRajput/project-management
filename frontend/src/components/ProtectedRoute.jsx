import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, token, isBootstrapped } = useAuthStore();

  if (!isBootstrapped) {
    return null;
  }

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}