import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../services/authService';

export default function PrivateRoute() {
  const isAuthenticated = authService.isAuthenticated();

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
} 