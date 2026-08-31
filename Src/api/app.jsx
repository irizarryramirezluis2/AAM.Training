import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

import { Toaster } from "@/components/ui/toaster";
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from '@/components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageNotFound from '@/lib/PageNotFound';

// Security & Management Additions
import InactivityAutoLogout from '@/Components/InactivityAutoLogout';
import ThemeAndAuditDashboard from '@/Components/ThemeAndAuditDashboard';
import AdminL4EnterpriseDashboard from '@/Components/AdminL4EnterpriseDashboard';

// Pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, logout } = useAuth();

  // Resolve current active user context
  const currentUser = user || {
    id: 'admin_root',
    role: 'Admin L4',
    email: 'admin@system.local'
  };

  // Show loading spinner while checking app public settings or auth status
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication exceptions
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <InactivityAutoLogout onLogout={logout} timeoutMinutes={15}>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Member & Admin Routes */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/" element={<Home />} />
          
          {/* Theme Customization & General Audit Logs */}
          <Route 
            path="/dashboard/theme-audit" 
            element={<ThemeAndAuditDashboard currentUser={currentUser} />} 
          />
          
          {/* Restricted Admin L4 Security & Incident Command Dashboard */}
          <Route 
            path="/admin/l4-security" 
            element={<AdminL4EnterpriseDashboard currentUser={currentUser} />} 
          />
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </InactivityAutoLogout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}