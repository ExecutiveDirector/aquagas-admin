import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../services/authService';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, Shield, CheckCircle, AlertCircle } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isEmailValid || loading) return;

    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      // Backend always returns the same message for security (no email enumeration)
      setSubmitted(true);
      toast.success('Reset instructions sent!');
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string; message?: string }>;
      const message =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to send reset email. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4 shadow-lg shadow-blue-500/25">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Reset Password
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {submitted
              ? 'Check your inbox for the reset link'
              : "Enter your email and we'll send you reset instructions"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8">

          {submitted ? (
            /* ── Success state ── */
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  If an account exists for{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">{email}</span>,
                  you will receive a password reset link shortly.
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">
                  Didn't receive it? Check your spam folder or try again.
                </p>
              </div>
              <button
                onClick={() => { setSubmitted(false); setEmail(''); setTouched(false); }}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                Try a different email
              </button>
            </div>
          ) : (
            /* ── Form state ── */
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched(true)}
                    disabled={loading}
                    placeholder="admin@example.com"
                    aria-required="true"
                    aria-invalid={touched && !isEmailValid}
                    aria-describedby={touched && !isEmailValid ? 'email-error' : undefined}
                    className={`block w-full pl-10 pr-10 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                      touched && !isEmailValid && email
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : touched && isEmailValid
                        ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {touched && (
                    <div className="absolute right-3 top-3">
                      {!isEmailValid && email ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : isEmailValid ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : null}
                    </div>
                  )}
                </div>
                {touched && !isEmailValid && email && (
                  <p id="email-error" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Please enter a valid email address
                  </p>
                )}
                {touched && !email && (
                  <p id="email-error" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Email is required
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || (touched && !isEmailValid)}
                className={`w-full flex items-center justify-center py-3 px-4 rounded-xl text-white font-medium transition-all duration-200 ${
                  loading || (touched && !isEmailValid)
                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                }`}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </div>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Back to login */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;
