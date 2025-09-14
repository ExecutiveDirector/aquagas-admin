import { useState } from 'react';
import { useSupabase } from '../../utils/SupabaseContext';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const supabase = useSupabase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccess('Password reset email sent! Check your inbox.');
      toast.success('Password reset email sent!');
      setEmail('');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send reset email.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isEmailValid = /\S+@\S+\.\S+/.test(email);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-kenya-black/20 dark:border-gray-600 w-full max-w-md">
        <h2 className="text-2xl font-bold text-kenya-black dark:text-gray-200 mb-6 text-center">Reset Password</h2>
        {success && (
          <div className="mb-6 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md" role="alert">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label htmlFor="email" className="block text-sm font-medium text-kenya-black dark:text-gray-200 mb-1">
              Email Address
            </label>
            <div className="flex items-center">
              <Mail className="absolute left-3 top-9 text-gray-500 dark:text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-kenya-black/20 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-kenya-green dark:focus:ring-kenya-green/80 bg-white dark:bg-gray-700 text-kenya-black dark:text-gray-200"
                placeholder="admin@example.com"
                required
                aria-required="true"
                aria-label="Email address for password reset"
              />
            </div>
            {!isEmailValid && email && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Please enter a valid email address.</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-kenya-green dark:bg-kenya-green/80 text-white py-2 rounded-md hover:bg-kenya-green/90 dark:hover:bg-kenya-green transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !isEmailValid}
            aria-label="Send password reset email"
          >
            {loading ? 'Sending...' : 'Send Reset Email'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;