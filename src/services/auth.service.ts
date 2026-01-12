import { supabase } from './supabase';
import type { Session, User, AuthError } from '@supabase/supabase-js';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

class AuthService {
  /**
   * Sign up a new user with email and password
   */
  async signUp({ email, password, displayName }: SignUpData): Promise<AuthResponse> {
    try {
      console.log('[AuthService] signUp: Called with email:', email);
      console.log('[AuthService] signUp: Supabase client initialized:', {
        hasSupabase: !!supabase,
        hasAuth: !!supabase?.auth,
      });
      console.log('[AuthService] signUp: About to call supabase.auth.signUp...');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      });

      console.log('[AuthService] signUp: Supabase response received:', {
        hasData: !!data,
        hasUser: !!data?.user,
        userEmail: data?.user?.email,
        userId: data?.user?.id,
        hasSession: !!data?.session,
        hasError: !!error,
        errorName: error?.name,
        errorMessage: error?.message,
        errorStatus: error?.status,
      });

      if (error) {
        console.error('[AuthService] signUp: Supabase returned error:', {
          name: error.name,
          message: error.message,
          status: error.status,
        });
        
        // Check if error is about existing user
        const errorMessage = error.message || '';
        const lowerMessage = errorMessage.toLowerCase();
        
        if (lowerMessage.includes('already registered') || 
            lowerMessage.includes('user already registered') ||
            lowerMessage.includes('email address is already registered') ||
            lowerMessage.includes('user_already_exists') ||
            error.name === 'UserAlreadyRegistered') {
          // Supabase explicitly says user already exists
          console.warn('[AuthService] signUp: Supabase confirmed existing user');
          const existingUserError: AuthError = {
            name: 'UserAlreadyRegistered',
            message: 'This email is already registered. Try logging in instead.',
            status: 400,
          } as AuthError;
          return { user: null, session: null, error: existingUserError };
        }
        
        // Other errors from Supabase
        return { user: null, session: null, error };
      }

      // No error from Supabase - treat as success
      // Note: hasSession can be false if email confirmation is required
      // That's still a successful signup, just requires email confirmation
      if (data?.user) {
        console.log('[AuthService] signUp: Success! User created:', data.user.id);
        console.log('[AuthService] signUp: Session:', data.session ? 'Present (auto-logged in)' : 'Not present (email confirmation may be required)');
        return {
          user: data.user,
          session: data.session, // May be null if email confirmation required
          error: null,
        };
      }

      // Edge case: No user returned (shouldn't happen after successful signUp)
      console.warn('[AuthService] signUp: Unexpected response - no user returned');
      const unexpectedError: AuthError = {
        name: 'UnexpectedResponse',
        message: 'Sign up failed - unexpected response from server',
        status: 500,
      } as AuthError;
      return { user: null, session: null, error: unexpectedError };
    } catch (err) {
      console.error('[AuthService] signUp: Exception caught:', err);
      return {
        user: null,
        session: null,
        error: err as AuthError,
      };
    }
  }

  /**
   * Sign in an existing user with email and password
   */
  async signIn({ email, password }: SignInData): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, session: null, error };
      }

      return {
        user: data.user,
        session: data.session,
        error: null,
      };
    } catch (err) {
      return {
        user: null,
        session: null,
        error: err as AuthError,
      };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err) {
      return { error: err as AuthError };
    }
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return { session: null, error };
      }

      return { session: data.session, error: null };
    } catch (err) {
      return { session: null, error: err as AuthError };
    }
  }

  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (err) {
      return { user: null, error: err as AuthError };
    }
  }

  /**
   * Send a password reset email
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'bibletrivia://reset-password',
      });

      return { error };
    } catch (err) {
      return { error: err as AuthError };
    }
  }

  /**
   * Update user password (must be authenticated)
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      return { error };
    } catch (err) {
      return { error: err as AuthError };
    }
  }

  /**
   * Update user metadata (e.g., display name)
   */
  async updateProfile(updates: { displayName?: string }): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: updates.displayName,
        },
      });

      return { error };
    } catch (err) {
      return { error: err as AuthError };
    }
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        callback(session?.user ?? null, session);
      }
    );

    return subscription;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { session } = await this.getSession();
    return session !== null;
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        return { session: null, error };
      }

      return { session: data.session, error: null };
    } catch (err) {
      return { session: null, error: err as AuthError };
    }
  }
}

// Export a singleton instance
export const authService = new AuthService();
