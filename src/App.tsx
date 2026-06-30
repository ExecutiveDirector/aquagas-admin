import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getToken, getAccount, isAuthenticated } from './services/authService';
import { Toaster } from 'react-hot-toast';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AdminDashboard from './layouts/DashboardLayout';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getToken();
        const account = getAccount();
        const isAuth = isAuthenticated();
        console.log('Auth check:', { token: !!token, account: !!account, isAuth });
        if (isAuth && token && account) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          localStorage.removeItem('account');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('userInfo');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route wrapper (redirect to dashboard if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuth = isAuthenticated();
  if (isAuth) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={<PublicRoute><Login /></PublicRoute>}
        />
        <Route
          path="/forgot-password"
          element={<PublicRoute><ForgotPassword /></PublicRoute>}
        />
        <Route
          path="/reset-password"
          element={<PublicRoute><ResetPassword /></PublicRoute>}
        />

        {/* Protected routes - AdminDashboard handles internal routing */}
        <Route
          path="/*"
          element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
        />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
}
