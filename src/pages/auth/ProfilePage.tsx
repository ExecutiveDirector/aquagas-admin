import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../utils/AuthContext';
import { useSupabase } from '../utils/SupabaseContext';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import Chart from '../components/Chart';
import type { ChartData, ChartOptions } from 'chart.js';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: 'admin' | 'user' | 'viewer' | 'manager';
  status: 'active' | 'inactive' | 'suspended';
  theme?: 'light' | 'dark';
}

interface Profile {
  role: User['role'];
}

const Profile: React.FC = () => {
  const { user, setUser, logout } = useAuth();
  const supabase = useSupabase();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [theme, setTheme] = useState<'light' | 'dark'>(user?.theme || 'dark');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [roleCounts, setRoleCounts] = useState<Record<User['role'], number>>({
    admin: 0,
    user: 0,
    viewer: 0,
    manager: 0,
  });

  // Sync state with user changes
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email ?? '');
      setAvatarUrl(user.avatar_url || '');
      setTheme(user.theme || 'dark');
    }
  }, [user]);

  // Fetch user role distribution for chart (admin-only)
  {/* useEffect(() => {
    if (user?.role !== 'admin') return;

    const fetchRoles = async () => {
      try {
        // Only select the columns that exist in the database
        const { data, error } = await supabase
          .from('profiles')
          .select('role') as { data: Profile[] | null, error: any };
        
        if (error) {
          console.error('Database error:', error);
          // Don't show error toast for missing columns, just log it
          return;
        }
        
        const counts = (data || []).reduce(
          (acc: Record<User['role'], number>, { role }: Profile) => {
            acc[role] = (acc[role] || 0) + 1;
            return acc;
          },
          { admin: 0, user: 0, viewer: 0, manager: 0 }
        );
        setRoleCounts(counts);
      } catch (err) {
        console.error('Failed to fetch roles:', err);
        // Only show user-friendly errors
        if (err && typeof err === 'object' && 'message' in err) {
          const message = err.message as string;
          if (!message.includes('does not exist')) {
            toast.error('Failed to load role distribution.');
          }
        }
      }
    };
    fetchRoles();

    // Real-time subscription
    const subscription = supabase
      .channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchRoles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [supabase, user]); */}
 
// Profile.tsx - Key section fix for role fetching
useEffect(() => {
  if (user?.role !== 'admin') return;

  const fetchRoles = async () => {
    try {
      // Only select the role column that exists
      const { data, error } = await supabase
        .from('profiles')
        .select('role');
      
      if (error) {
        console.error('Database error:', error);
        // Don't show error toast for schema issues
        return;
      }
      
      const counts = (data || []).reduce(
        (acc: Record<User['role'], number>, { role }: { role: User['role'] }) => {
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        },
        { admin: 0, user: 0, viewer: 0, manager: 0 }
      );
      setRoleCounts(counts);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };
  
  fetchRoles();

  // Real-time subscription
  const subscription = supabase
    .channel('profiles')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      fetchRoles();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}, [supabase, user]);
  // Chart configuration
  const chartData = useMemo<ChartData<"pie">>(() => ({
    labels: ['Admin', 'User', 'Viewer', 'Manager'],
    datasets: [
      {
        label: 'User Role Distribution',
        data: [roleCounts.admin, roleCounts.user, roleCounts.viewer, roleCounts.manager],
        backgroundColor: ['#86efac', '#60a5fa', '#facc15', '#f472b6'],
        borderColor: ['#16a34a', '#3b82f6', '#eab308', '#ec4899'],
        borderWidth: 1,
      },
    ],
  }), [roleCounts]);

  const chartOptions = useMemo<ChartOptions<"pie">>(() => ({
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      title: {
        display: true,
        text: 'User Role Distribution',
        color: document.documentElement.classList.contains('dark') ? '#fff' : '#1f2937',
        font: { size: 16, weight: 'bold' as const },
      },
    },
  }), []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        // Limit to 5MB
        toast.error('Avatar file size must be less than 5MB.');
        return;
      }
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toast.error('Failed to upload avatar.');
      return null;
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!name.trim()) {
        throw new Error('Name is required.');
      }

      let updatedAvatarUrl = avatarUrl;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile);
        if (!uploadedUrl) throw new Error('Failed to upload avatar.');
        updatedAvatarUrl = uploadedUrl;
      }

      const updates = { 
        name: name.trim(), 
        avatar_url: updatedAvatarUrl, 
        theme 
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);

      if (profileError) throw profileError;

      if (email !== user?.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
      }

      // Include the status property to match AuthContext User interface
      setUser({
        id: user!.id,
        name: name.trim(),
        email,
        avatar_url: updatedAvatarUrl,
        role: user!.role,
        status: user!.status || 'active', // Provide default status
        theme,
      });

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update profile. Please try again.';
      setError(errorMessage);
      console.error('Profile update error:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      toast.error('New passwords do not match.');
      return;
    }

    if (!currentPassword) {
      setError('Current password is required.');
      setLoading(false);
      toast.error('Current password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      setLoading(false);
      toast.error('New password must be at least 8 characters.');
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) throw new Error('Invalid current password.');

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
      toast.success('Password updated successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update password.';
      setError(errorMessage);
      console.error('Password update error:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.rpc('delete_user', { user_id: user?.id });
      if (error) throw error;

      await logout();
      setSuccess('Account deleted successfully.');
      toast.success('Account deleted successfully.');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete account. Please try again.';
      setError(errorMessage);
      console.error('Account deletion error:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setDeleteConfirm(false);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      localStorage.setItem('theme', newTheme);
      if (user) {
        supabase
          .from('profiles')
          .update({ theme: newTheme })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) {
              console.error('Failed to save theme:', error);
              toast.error('Failed to save theme preference.');
            } else {
              setUser({ 
                ...user, 
                status: user.status || 'active', // Ensure status is included
                theme: newTheme 
              });
            }
          });
      }
      return newTheme;
    });
  };

  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = newPassword.length >= 8 && newPassword === confirmPassword;

  if (!user) {
    return <div className="text-center p-6 text-gray-700 dark:text-gray-300">Please log in to view your profile.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-8 text-center">Profile Settings</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md" role="alert">
          ✅ {success}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md" role="alert">
          ❌ {error}
        </div>
      )}

      {/* User Role Distribution Chart (Admin Only) */}
      {user.role === 'admin' && (
        <section className="mb-10">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">User Role Distribution</h3>
          <Chart
            data={chartData}
            options={chartOptions}
            ariaLabel="User role distribution pie chart"
            height={250}
            className="max-w-md mx-auto"
          />
        </section>
      )}

      {/* Personal Information Section */}
      <section className="mb-10">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Personal Information</h3>
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <img
                src={avatarUrl || '/default-avatar.png'}
                alt="User avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Avatar</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 dark:file:bg-green-900/20 file:text-green-700 dark:file:text-green-300 hover:file:bg-green-100 dark:hover:file:bg-green-800"
                aria-label="Upload user avatar"
              />
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:bg-gray-700 dark:text-gray-200"
              required
              aria-required="true"
              aria-label="Full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:bg-gray-700 dark:text-gray-200"
              required
              aria-required="true"
              aria-label="Email address"
            />
            {!isEmailValid && email && <p className="text-sm text-red-600 dark:text-red-400 mt-1">Please enter a valid email.</p>}
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
            <input
              id="role"
              type="text"
              value={user.role}
              disabled
              className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 shadow-sm cursor-not-allowed dark:text-gray-400"
              aria-label="User role (read-only)"
            />
          </div>

          <div>
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
            <button
              type="button"
              onClick={toggleTheme}
              className="mt-1 w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-between"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !isEmailValid || !name.trim()}
            className="w-full px-4 py-2 bg-green-600 dark:bg-green-700 text-white dark:text-gray-200 rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label="Save profile changes"
          >
            {loading ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      </section>

      {/* Security Section */}
      <section className="mb-10 border-t pt-6">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Security</h3>
        <form onSubmit={handleChangePassword} className="space-y-6">
          <div className="relative">
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
            <input
              id="current-password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:bg-gray-700 dark:text-gray-200"
              placeholder="••••••••"
              aria-label="Current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-9 text-gray-500 dark:text-gray-400"
              aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
            >
              {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
            <input
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:bg-gray-700 dark:text-gray-200"
              placeholder="••••••••"
              aria-label="New password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-9 text-gray-500 dark:text-gray-400"
              aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
            >
              {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:bg-gray-700 dark:text-gray-200"
              placeholder="••••••••"
              aria-label="Confirm new password"
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

          {!isPasswordValid && newPassword && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">Password must be at least 8 characters and match confirmation.</p>
          )}

          <button
            type="submit"
            disabled={loading || !isPasswordValid || !currentPassword}
            className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-200 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label="Change password"
          >
            {loading ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </section>

      {/* Account Actions Section */}
      <section className="border-t pt-6">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Account Actions</h3>
        <div className="flex justify-between items-center">
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition"
            aria-label="Log out"
          >
            Logout
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white dark:text-gray-200 rounded-md hover:bg-red-700 dark:hover:bg-red-600 transition"
            aria-label="Delete account"
          >
            Delete Account
          </button>
        </div>

        {deleteConfirm && (
          <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-md">
            <p className="mb-4">Are you sure you want to delete your account? This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                aria-label="Cancel account deletion"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white dark:text-gray-200 rounded-md hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Confirm account deletion"
              >
                {loading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;