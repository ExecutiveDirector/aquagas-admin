import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSupabase } from './SupabaseContext';
import toast from 'react-hot-toast';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar_url: string | null;
  role: 'admin' | 'user' | 'viewer' | 'manager';
  status: 'active' | 'inactive' | 'suspended';
  theme?: 'light' | 'dark';
  phone?: string;
  address?: string;
  last_login?: string;
  created_at?: string;
  preferences?: {
    notifications: boolean;
    language: string;
    timezone: string;
  };
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  loading: boolean;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: string | string[]) => boolean;
  refreshUser: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

type Role = 'admin' | 'manager' | 'user' | 'viewer';

const DEFAULT_PERMISSIONS: Record<Role, string[]> = {
  admin: ['*'],
  manager: ['*'],
  user: ['*'],
  viewer: ['*'],
};

export function AuthProvider({ children }: AuthProviderProps) {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const protectedRoutes = ['/', '/vendors', '/orders', '/riders', '/notifications', '/profile', '/support', '/users'];
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];

  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isProtectedRoute = protectedRoutes.includes(location.pathname);

  const rememberMe = sessionStorage.getItem('rememberMe') === 'true';

  // Allow all permissions - no restrictions in admin dashboard
  const hasPermission = useCallback((_permission: string): boolean => {
    return true;
  }, []);

  const hasRole = useCallback((roles: string | string[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }, [user]);

  const fetchUserData = useCallback(
    async (supabaseUser: any): Promise<User | null> => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            email,
            avatar_url,
            role,
            status,
            theme,
            phone,
            address,
            last_login,
            created_at,
            preferences,
            permissions
          `)
          .eq('id', supabaseUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('AuthContext - Profile fetch error:', profileError.message);
          toast.error('Failed to load user profile. Please try again.');
          return null;
        }

        if (!profile) {
          const defaultProfile = {
            id: supabaseUser.id,
            name: supabaseUser.user_metadata?.name || (supabaseUser.email?.split('@')[0] ?? 'User'),
            email: supabaseUser.email,
            role: 'user' as const,
            status: 'active' as const,
            theme: 'dark' as const,
            preferences: {
              notifications: true,
              language: 'en',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            permissions: DEFAULT_PERMISSIONS['user'],
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          };

          const { error: insertError } = await supabase.from('profiles').insert(defaultProfile);
          if (insertError) {
            console.error('AuthContext - Error creating default profile:', insertError.message);
            toast.error('Failed to create user profile. Please contact support.');
            return null;
          }

          const userData: User = {
            id: supabaseUser.id,
            name: defaultProfile.name,
            email: defaultProfile.email,
            avatar_url: null,
            role: defaultProfile.role,
            status: defaultProfile.status,
            theme: defaultProfile.theme,
            phone: undefined,
            address: undefined,
            last_login: defaultProfile.last_login,
            created_at: defaultProfile.created_at,
            preferences: defaultProfile.preferences,
            permissions: defaultProfile.permissions,
          };
          return userData;
        }

        if (profile.status === 'suspended') {
          toast.error('Your account has been suspended. Please contact support.');
          await supabase.auth.signOut();
          return null;
        }

        const userData: User = {
          id: supabaseUser.id,
          name: profile.name || supabaseUser.user_metadata?.name || (supabaseUser.email?.split('@')[0] ?? 'User'),
          email: profile.email ?? undefined,
          avatar_url: profile.avatar_url || null,
          role: (profile.role as Role) || 'user',
          status: (profile.status as 'active' | 'inactive' | 'suspended') || 'active',
          theme: (profile.theme as 'light' | 'dark') || 'dark',
          phone: profile.phone,
          address: profile.address,
          last_login: profile.last_login,
          created_at: profile.created_at,
          preferences: profile.preferences || {
            notifications: true,
            language: 'en',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          permissions: profile.permissions || DEFAULT_PERMISSIONS[(profile.role as Role) ?? 'user'] || [],
        };

        const theme = userData.theme || localStorage.getItem('theme') || 'dark';
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);

        // Update last_login silently (don't wait for it)
        supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', supabaseUser.id);

        return userData;
      } catch (error) {
        console.error('AuthContext - Error fetching user data:', error);
        toast.error('Error loading user data. Please try again.');
        return null;
      }
    },
    [supabase]
  );

  // Initial session check and auth state listener
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('🔄 Initializing authentication...');
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          console.log('✅ Session found, fetching user data...');
          const userData = await fetchUserData(session.user);
          if (mounted) {
            setUser(userData);
            console.log('✅ User data loaded:', userData?.email);
          }
        } else {
          console.log('❌ No session found');
          if (mounted) setUser(null);
        }
        
      } catch (error) {
        console.error('Init auth error:', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('✅ Authentication initialization complete');
        }
      }
    };

    initAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔄 Auth state changed:', event);

      switch (event) {
        case 'SIGNED_IN':
          if (session?.user) {
            setLoading(true);
            const userData = await fetchUserData(session.user);
            setUser(userData);
            setLoading(false);
            console.log('✅ User signed in:', userData?.email);
          }
          break;
          
        case 'SIGNED_OUT':
          setUser(null);
          console.log('❌ User signed out');
          break;
          
        case 'TOKEN_REFRESHED':
          // Don't show loading for token refresh, just update user data silently
          if (session?.user && user) {
            fetchUserData(session.user).then(userData => {
              if (mounted && userData) setUser(userData);
            });
          }
          break;
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase, fetchUserData]);

  // Handle navigation after auth state is determined
  useEffect(() => {
    if (loading) return; // Wait until loading is complete

    console.log('🧭 Navigation check:', { 
      user: user?.email || 'none', 
      pathname: location.pathname,
      isProtected: isProtectedRoute,
      isPublic: isPublicRoute 
    });

    // If no user and trying to access protected route, redirect to login
    if (!user && isProtectedRoute && location.pathname !== '/login') {
      console.log('🔄 Redirecting to login...');
      navigate('/login', { replace: true, state: { message: 'Please sign in to continue.' } });
    }
    // If user is logged in and on public route, redirect to dashboard
    else if (user && isPublicRoute && location.pathname !== '/') {
      console.log('🔄 Redirecting to dashboard...');
      navigate('/', { replace: true });
    }
  }, [loading, user, location.pathname, navigate, isProtectedRoute, isPublicRoute]);

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;

      setUser(prev => (prev ? { ...prev, ...updates } : null));

      if (updates.theme) {
        document.documentElement.classList.toggle('dark', updates.theme === 'dark');
        localStorage.setItem('theme', updates.theme);
      }

      toast.success('Profile updated successfully');
      return true;
    } catch (error: any) {
      console.error('AuthContext - Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
      return false;
    }
  }, [user, supabase]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!user || !user.email) return false;

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        toast.error('Current password is incorrect');
        return false;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Password updated successfully');
      return true;
    } catch (error: any) {
      console.error('AuthContext - Password update error:', error);
      toast.error(error.message || 'Failed to update password');
      return false;
    }
  }, [user, supabase]);

  const updatePreferences = useCallback(async (preferences: Partial<User['preferences']>): Promise<boolean> => {
    if (!user) return false;

    try {
      const current: User['preferences'] = user.preferences ?? {
        notifications: true,
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const updated: User['preferences'] = {
        notifications: preferences?.notifications ?? current.notifications,
        language: preferences?.language ?? current.language,
        timezone: preferences?.timezone ?? current.timezone,
      };

      const { error } = await supabase.from('profiles').update({ preferences: updated }).eq('id', user.id);
      if (error) throw error;

      setUser(prev => (prev ? { ...prev, preferences: updated } : null));
      toast.success('Preferences updated successfully');
      return true;
    } catch (error: any) {
      console.error('AuthContext - Preferences update error:', error);
      toast.error(error.message || 'Failed to update preferences');
      return false;
    }
  }, [user, supabase]);

  const refreshUser = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const userData = await fetchUserData(sessionData.session.user);
        if (userData) setUser(userData);
      }
    } catch (error) {
      console.error('AuthContext - Refresh user error:', error);
    }
  }, [supabase, fetchUserData]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      if (!rememberMe) {
        localStorage.removeItem('theme');
      }
      document.documentElement.classList.remove('dark');
      navigate('/login', { replace: true });
      toast.success('Logged out successfully.');
    } catch (error) {
      console.error('AuthContext - Logout failed:', error);
      toast.error('Failed to log out.');
    } finally {
      setLoading(false);
    }
  }, [supabase, navigate, rememberMe]);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      // Remove permission check - allow everyone to delete accounts
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;

      await logout();
      toast.success('Account deleted successfully');
      return true;
    } catch (error: any) {
      console.error('AuthContext - Delete account error:', error);
      toast.error(error.message || 'Failed to delete account');
      return false;
    }
  }, [user, supabase, logout]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      logout,
      loading, // Only use loading state, not initialized
      updateProfile,
      updatePassword,
      updatePreferences,
      hasPermission,
      hasRole,
      refreshUser,
      deleteAccount,
    }),
    [user, logout, loading, updateProfile, updatePassword, updatePreferences, hasPermission, hasRole, refreshUser, deleteAccount]
  );

  // Show loading only while actually loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-green-500 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-label="Loading authentication"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}