import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// Load environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined in environment variables');
}

// Cache for Supabase clients
const clientCache = new Map<Storage, SupabaseClient>();

// Function to get or create Supabase client
function getSupabaseClient(storage: Storage = localStorage): SupabaseClient {
  if (clientCache.has(storage)) {
    return clientCache.get(storage)!;
  }

  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storage,
      },
      realtime: {
        params: {
          eventsPerSecond: 10, // Limit to 10 events per second for performance
        },
      },
    });

    clientCache.set(storage, client);
    console.log('Supabase initialized with URL:', supabaseUrl, 'Storage:', storage === localStorage ? 'localStorage' : 'sessionStorage');
    return client;
  } catch (error) {
    console.error('SupabaseContext - Failed to initialize Supabase client:', error);
    toast.error('Failed to connect to the database.');
    throw error;
  }
}

// Create context with default client
const SupabaseContext = createContext<SupabaseClient>(getSupabaseClient());

interface SupabaseProviderProps {
  children: ReactNode;
  storage?: Storage;
}

export function SupabaseProvider({ children, storage }: SupabaseProviderProps) {
  const client = getSupabaseClient(storage);
  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}