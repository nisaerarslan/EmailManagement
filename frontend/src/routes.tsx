import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Inbox from './pages/Inbox';
import AddAccount from './pages/AddAccount';
import GmailCallback from './pages/GmailCallback';
import OutlookCallback from './pages/OutlookCallback';
import DashboardLayout from './components/layout/DashboardLayout';
import SentItems from './pages/SentItems';
import Profile from './pages/Profile';
import DeletedItems from './pages/DeletedItems';
import PasswordManager from './pages/PasswordManager';
import Settings from './pages/Settings';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SystemMailSetup from './pages/SystemMailSetup';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/landing" replace />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/sifremi-unuttum" element={<ForgotPassword />} />
      <Route path="/sifre-sifirla/:token" element={<ResetPassword />} />
      <Route path="/systemmail" element={<SystemMailSetup />} />
      <Route path="/systemmail/setup" element={<SystemMailSetup />} />
      <Route path="/systemmail/success" element={<SystemMailSetup />} />
      <Route path="/systemmail/error" element={<SystemMailSetup />} />
      <Route path="/dashboard" element={<DashboardLayout><Home /></DashboardLayout>} />
      <Route path="/dashboard/inbox" element={<DashboardLayout><Inbox /></DashboardLayout>} />
      <Route path="/dashboard/sent" element={<DashboardLayout><SentItems /></DashboardLayout>} />
      <Route path="/dashboard/deleted" element={<DashboardLayout><DeletedItems /></DashboardLayout>} />
      <Route path="/dashboard/add-account" element={<DashboardLayout><AddAccount /></DashboardLayout>} />
      <Route path="/dashboard/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
      <Route path="/dashboard/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
      <Route path="/dashboard/password-manager" element={<DashboardLayout><PasswordManager /></DashboardLayout>} />
      <Route path="/gmail/callback" element={<GmailCallback />} />
      <Route path="/outlook/callback" element={<OutlookCallback />} />
    </Routes>
  );
} 