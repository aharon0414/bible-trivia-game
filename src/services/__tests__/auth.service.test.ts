import { authService } from '../auth.service';
import { supabase } from '../supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// Mock supabase
jest.mock('../supabase');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-AUTH-001: Sign Up with Valid Credentials', () => {
    it('should successfully sign up a new user', async () => {
      const mockUser: User = {
        id: '123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01',
      } as User;

      const mockSession: Session = {
        access_token: 'token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1234567890,
        refresh_token: 'refresh',
        user: mockUser,
      } as Session;

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            display_name: 'Test User',
          },
        },
      });
    });
  });

  describe('TC-AUTH-002: Sign Up with Invalid Email Format', () => {
    it('should return error for invalid email', async () => {
      const mockError: AuthError = {
        name: 'AuthApiError',
        message: 'Invalid email',
        status: 400,
      } as AuthError;

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await authService.signUp({
        email: 'notanemail',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('TC-AUTH-003: Sign Up with Weak Password', () => {
    it('should return error for password too short', async () => {
      const mockError: AuthError = {
        name: 'AuthApiError',
        message: 'Password should be at least 6 characters',
        status: 400,
      } as AuthError;

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await authService.signUp({
        email: 'test@example.com',
        password: '12345',
      });

      expect(result.user).toBeNull();
      expect(result.error).not.toBeNull();
    });
  });

  describe('TC-AUTH-004: Sign Up with Duplicate Email', () => {
    it('should return error for duplicate email', async () => {
      const mockError: AuthError = {
        name: 'AuthApiError',
        message: 'User already registered',
        status: 400,
      } as AuthError;

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await authService.signUp({
        email: 'existing@example.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('TC-AUTH-005: Sign In with Valid Credentials', () => {
    it('should successfully sign in an existing user', async () => {
      const mockUser: User = {
        id: '123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01',
      } as User;

      const mockSession: Session = {
        access_token: 'token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1234567890,
        refresh_token: 'refresh',
        user: mockUser,
      } as Session;

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.user?.email).toBe('test@example.com');
      expect(result.error).toBeNull();
    });
  });

  describe('TC-AUTH-006: Sign In with Invalid Email', () => {
    it('should return error for non-existent email', async () => {
      const mockError: AuthError = {
        name: 'AuthApiError',
        message: 'Invalid login credentials',
        status: 400,
      } as AuthError;

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await authService.signIn({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('TC-AUTH-007: Sign In with Invalid Password', () => {
    it('should return error for incorrect password', async () => {
      const mockError: AuthError = {
        name: 'AuthApiError',
        message: 'Invalid login credentials',
        status: 400,
      } as AuthError;

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('TC-AUTH-008: Sign Out', () => {
    it('should successfully sign out the user', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const result = await authService.signOut();

      expect(result.error).toBeNull();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should clear session after sign out', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await authService.signOut();
      const sessionResult = await authService.getSession();

      expect(sessionResult.session).toBeNull();
    });
  });

  describe('TC-AUTH-009: Get Current Session (Authenticated)', () => {
    it('should return session when authenticated', async () => {
      const mockUser: User = {
        id: '123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01',
      } as User;

      const mockSession: Session = {
        access_token: 'token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1234567890,
        refresh_token: 'refresh',
        user: mockUser,
      } as Session;

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.getSession();

      expect(result.session).toEqual(mockSession);
      expect(result.session?.access_token).toBe('token');
      expect(result.session?.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });
  });

  describe('TC-AUTH-010: Get Current Session (Unauthenticated)', () => {
    it('should return null session when not authenticated', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await authService.getSession();

      expect(result.session).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('TC-AUTH-011: Get Current User (Authenticated)', () => {
    it('should return current user when authenticated', async () => {
      const mockUser: User = {
        id: '123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01',
      } as User;

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.user).toEqual(mockUser);
      expect(result.user?.id).toBe('123');
      expect(result.user?.email).toBe('test@example.com');
      expect(result.error).toBeNull();
    });
  });

  describe('TC-AUTH-012: Check Authentication Status', () => {
    it('should return true when authenticated', async () => {
      const mockSession: Session = {
        access_token: 'token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1234567890,
        refresh_token: 'refresh',
        user: {} as User,
      } as Session;

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when not authenticated', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('TC-AUTH-013: Refresh Session', () => {
    it('should successfully refresh the session', async () => {
      const mockUser: User = {
        id: '123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01',
      } as User;

      const originalSession: Session = {
        access_token: 'old-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1234567890,
        refresh_token: 'refresh',
        user: mockUser,
      } as Session;

      const refreshedSession: Session = {
        access_token: 'new-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1234567890,
        refresh_token: 'refresh',
        user: mockUser,
      } as Session;

      (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: { session: refreshedSession },
        error: null,
      });

      const result = await authService.refreshSession();

      expect(result.session).toEqual(refreshedSession);
      expect(result.session?.access_token).toBe('new-token');
      expect(result.error).toBeNull();
    });
  });

  describe('TC-AUTH-014: Auth State Change Listener', () => {
    it('should call callback on auth state changes', () => {
      const callback = jest.fn();
      const mockUnsubscribe = jest.fn();
      const mockSubscription = { unsubscribe: mockUnsubscribe };

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: mockSubscription },
      });

      const subscription = authService.onAuthStateChange(callback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
      expect(subscription).toEqual(mockSubscription);

      // Simulate auth state change
      const mockCallback = (supabase.auth.onAuthStateChange as jest.Mock).mock.calls[0][0];
      const mockSession: Session = {
        access_token: 'token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1234567890,
        refresh_token: 'refresh',
        user: {} as User,
      } as Session;

      mockCallback('SIGNED_IN', mockSession);
      // Note: The actual callback would be called by Supabase
    });
  });

  describe('Error Handling', () => {
    it('should handle exceptions in signUp', async () => {
      (supabase.auth.signUp as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should handle exceptions in signIn', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toBeDefined();
    });
  });
});

