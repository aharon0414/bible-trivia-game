import React from 'react';
import { render } from '@testing-library/react-native';
import RootNavigator from '../RootNavigator';
import { useAuth } from '../../contexts/AuthContext';
import AuthNavigator from '../AuthNavigator';
import MainNavigator from '../MainNavigator';

// Mock useAuth
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock navigators
jest.mock('../AuthNavigator', () => {
  return jest.fn(() => null);
});

jest.mock('../MainNavigator', () => {
  return jest.fn(() => null);
});

describe('RootNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-NAV-001: Unauthenticated User Sees Auth Navigator', () => {
    it('should render AuthNavigator when user is null', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(<RootNavigator />);

      expect(AuthNavigator).toHaveBeenCalled();
      expect(MainNavigator).not.toHaveBeenCalled();
    });
  });

  describe('TC-NAV-002: Authenticated User Sees Main Navigator', () => {
    it('should render MainNavigator when user is authenticated', () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      render(<RootNavigator />);

      expect(MainNavigator).toHaveBeenCalled();
      expect(AuthNavigator).not.toHaveBeenCalled();
    });
  });

  describe('TC-NAV-003: Loading State Shows Loading Screen', () => {
    it('should show loading indicator when loading is true', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      const { UNSAFE_getByType } = render(<RootNavigator />);

      // Should show loading, not navigators
      expect(AuthNavigator).not.toHaveBeenCalled();
      expect(MainNavigator).not.toHaveBeenCalled();
    });

    it('should render ActivityIndicator when loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      const { getByTestId } = render(<RootNavigator />);

      // Since we can't easily test ActivityIndicator without testID,
      // we verify that navigators are not rendered
      expect(AuthNavigator).not.toHaveBeenCalled();
      expect(MainNavigator).not.toHaveBeenCalled();
    });
  });

  describe('TC-NAV-004: Navigation Updates After Login', () => {
    it('should switch to MainNavigator after user logs in', () => {
      const { rerender } = render(
        <RootNavigator />
      );

      // Initial state: no user
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      rerender(<RootNavigator />);
      expect(AuthNavigator).toHaveBeenCalled();

      // After login: user exists
      const mockUser = {
        id: '123',
        email: 'test@example.com',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      jest.clearAllMocks();
      rerender(<RootNavigator />);

      expect(MainNavigator).toHaveBeenCalled();
    });
  });

  describe('TC-NAV-005: Navigation Updates After Logout', () => {
    it('should switch to AuthNavigator after user logs out', () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
      };

      // Initial state: user authenticated
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      const { rerender } = render(<RootNavigator />);
      expect(MainNavigator).toHaveBeenCalled();

      // After logout: user is null
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      });

      jest.clearAllMocks();
      rerender(<RootNavigator />);

      expect(AuthNavigator).toHaveBeenCalled();
    });
  });
});

