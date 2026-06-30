// src/pages/auth/ResetPassword.tsx
// password_reset_token (see POST /v1/auth/forgot-password /
// POST /v1/auth/reset-password in authController.js). That mismatch meant
// the reset link emailed to an admin could never actually succeed, even
// once the route itself was registered.
//
// This version reads ?token= from the URL (the value the backend embeds in
// the reset link) and posts it straight to /v1/auth/reset-password.
import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { resetPassword } from '../../services/authService';
import { AxiosError } from 'axios';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('This reset link is missing its token. Please request a new one.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string; message?: string }>;
      const message =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to reset password. The link may have expired — request a new one.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Invalid reset link</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            This link is missing its token. Please request a new password reset.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">Reset Password</h2>

        {success ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-gray-700 dark:text-gray-300">
              Password updated successfully! Redirecting to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} aria-label="Reset password form">
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md text-sm" role="alert">
                {error}
              </div>
            )}
            <div className="mb-4 relative">
              <label htmlFor="password" className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">
                New Password
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
                placeholder="********"
                required
                aria-required="true"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-500 dark:text-gray-400"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="mb-6 relative">
              <label htmlFor="confirm-password" className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
                placeholder="********"
                required
                aria-required="true"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-9 text-gray-500 dark:text-gray-400"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition disabled:opacity-50"
              disabled={loading}
              aria-disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
