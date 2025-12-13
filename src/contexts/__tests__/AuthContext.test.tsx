import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('TC-CONTEXT-001: Initial State', () => {
    it('should initialize with null user and loading true', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      // Loading should be true initially
      expect(result.current.loading).toBe(true);

      // Wait for initial check to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('TC-CONTEXT-002: Loading State After Check', () => {
    it('should set loading to false after user check completes', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initially loading should be true
      expect(result.current.loading).toBe(true);

      // Wait for checkUser to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('TC-CONTEXT-003: Sign In Updates User State', () => {
    it('should update user state after successful sign in', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockUser = {
        id: '1',
        email: 'test@example.com',
      };

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.user?.email).toBe('test@example.com');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    });
  });

  describe('TC-CONTEXT-004: Sign Up Updates User State', () => {
    it('should update user state after successful sign up', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockUser = {
        id: '1',
        email: 'newuser@example.com',
      };

      await act(async () => {
        await result.current.signUp('newuser@example.com', 'password123');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.user?.email).toBe('newuser@example.com');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    });
  });

  describe('TC-CONTEXT-005: Sign Out Clears User State', () => {
    it('should clear user state after sign out', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // First sign in
      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.user).not.toBeNull();

      // Then sign out
      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('TC-CONTEXT-006: Context Error Handling', () => {
    it('should handle errors during sign in gracefully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock AsyncStorage to throw an error
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await act(async () => {
        try {
          await result.current.signIn('test@example.com', 'password123');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      // User should remain null on error
      expect(result.current.user).toBeNull();
    });

    it('should handle errors during sign up gracefully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await act(async () => {
        try {
          await result.current.signUp('test@example.com', 'password123');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('User Persistence', () => {
    it('should load user from AsyncStorage on mount', async () => {
      const storedUser = {
        id: '123',
        email: 'stored@example.com',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(storedUser);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('user');
    });
  });

  describe('useAuth Hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});

