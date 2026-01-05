import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  // Add other user properties as needed
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Maps Supabase User to our simplified User interface
 */
function mapSupabaseUser(supabaseUser: SupabaseUser | null): User | null {
  if (!supabaseUser) return null;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Initializing - checking for existing session...');
    // Check for existing session on mount
    checkUser();

    // Listen to auth state changes (login, logout, token refresh, etc.)
    console.log('[AuthContext] Setting up auth state change listener...');
    const subscription = authService.onAuthStateChange((supabaseUser, session) => {
      console.log('[AuthContext] Auth state changed:', {
        hasUser: !!supabaseUser,
        userEmail: supabaseUser?.email,
        hasSession: !!session,
      });
      setUser(mapSupabaseUser(supabaseUser));
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('[AuthContext] Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      console.log('[AuthContext] checkUser: Checking for existing session...');
      // Check if there's an existing session
      const { session, error } = await authService.getSession();

      if (error) {
        console.error('[AuthContext] checkUser: Error getting session:', error);
        setUser(null);
      } else if (session?.user) {
        console.log('[AuthContext] checkUser: Found existing session for user:', session.user.email);
        setUser(mapSupabaseUser(session.user));
      } else {
        console.log('[AuthContext] checkUser: No existing session found');
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthContext] checkUser: Exception:', error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log('[AuthContext] checkUser: Complete, loading set to false');
    }
  }

  async function signIn(email: string, password: string) {
    try {
      console.log('[AuthContext] signIn: Starting sign in for:', email);
      const { user: supabaseUser, session, error } = await authService.signIn({
        email,
        password,
      });

      console.log('[AuthContext] signIn: Response received:', {
        hasUser: !!supabaseUser,
        userEmail: supabaseUser?.email,
        hasSession: !!session,
        hasError: !!error,
        errorMessage: error?.message,
      });

      if (error) {
        console.error('[AuthContext] signIn: Error from authService:', error);
        // Throw error to match expected API (screens catch and display)
        throw new Error(error.message || 'Failed to sign in');
      }

      // If email confirmation is required, user might be null
      // but we still have a session, so check session instead
      if (!supabaseUser && !session) {
        console.error('[AuthContext] signIn: No user or session returned');
        throw new Error('Sign in failed - no user or session returned');
      }

      // User state will be updated via onAuthStateChange listener
      // But we can also set it immediately for better UX
      if (supabaseUser) {
        console.log('[AuthContext] signIn: Setting user from supabaseUser');
        setUser(mapSupabaseUser(supabaseUser));
      } else if (session?.user) {
        console.log('[AuthContext] signIn: Setting user from session');
        setUser(mapSupabaseUser(session.user));
      }
    } catch (error) {
      console.error('[AuthContext] signIn: Exception caught:', error);
      throw error;
    }
  }

  async function signUp(email: string, password: string) {
    try {
      console.log('[AuthContext] signUp: Starting sign up for:', email);
      console.log('[AuthContext] signUp: About to call authService.signUp...');

      const { user: supabaseUser, session, error } = await authService.signUp({
        email,
        password,
        // displayName is optional - can be added later if SignupScreen collects it
      });

      console.log('[AuthContext] signUp: Response received from authService:', {
        hasUser: !!supabaseUser,
        userEmail: supabaseUser?.email,
        userId: supabaseUser?.id,
        hasSession: !!session,
        hasError: !!error,
        errorName: error?.name,
        errorMessage: error?.message,
        errorStatus: error?.status,
      });

      if (error) {
        console.error('[AuthContext] signUp: Error from authService:', {
          name: error.name,
          message: error.message,
          status: error.status,
        });
        // Throw error to match expected API (screens catch and display)
        throw new Error(error.message || 'Failed to sign up');
      }

      // If email confirmation is required, user might be null until confirmed
      // In that case, we still want to show success but user won't be set yet
      if (supabaseUser) {
        console.log('[AuthContext] signUp: User created successfully, setting user state');
        setUser(mapSupabaseUser(supabaseUser));
      } else if (session?.user) {
        console.log('[AuthContext] signUp: Session created, setting user from session');
        setUser(mapSupabaseUser(session.user));
      } else {
        // Email confirmation required - user will be set after they confirm
        // For now, we'll throw an error to inform the user
        console.warn('[AuthContext] signUp: No user or session returned - email confirmation may be required');
        throw new Error('Please check your email to confirm your account');
      }
    } catch (error) {
      console.error('[AuthContext] signUp: Exception caught:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      console.log('[AuthContext] signOut: Starting sign out...');
      const { error } = await authService.signOut();

      if (error) {
        console.error('[AuthContext] signOut: Error from authService:', error);
        throw new Error(error.message || 'Failed to sign out');
      }

      console.log('[AuthContext] signOut: Success, clearing user state');
      // User state will be updated via onAuthStateChange listener
      // But we can also clear it immediately for better UX
      setUser(null);
    } catch (error) {
      console.error('[AuthContext] signOut: Exception caught:', error);
      throw error;
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
