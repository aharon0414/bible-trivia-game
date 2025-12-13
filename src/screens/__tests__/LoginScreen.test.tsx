import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from 'react-native';

// Mock useAuth
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  dispatch: jest.fn(),
};

describe('LoginScreen', () => {
  const mockSignIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
    });
  });

  describe('TC-LOGIN-001: Render Login Screen', () => {
    it('should render all UI elements correctly', () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(getByPlaceholderText('Enter your password')).toBeTruthy();
      expect(getByText('Sign In')).toBeTruthy();
      expect(getByText('Create New Account')).toBeTruthy();
      expect(getByText('Bible Trivia')).toBeTruthy();
    });
  });

  describe('TC-LOGIN-002: Empty Form Validation', () => {
    it('should show error alert when submitting empty form', async () => {
      const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
      const signInButton = getByText('Sign In');

      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
      });
    });

    it('should show error when email is empty', async () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const passwordInput = getByPlaceholderText('Enter your password');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
      });
    });

    it('should show error when password is empty', async () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
      });
    });
  });

  describe('TC-LOGIN-003: Successful Login', () => {
    it('should call signIn function with correct credentials', async () => {
      mockSignIn.mockResolvedValue(undefined);

      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });

  describe('TC-LOGIN-004: Failed Login Error Display', () => {
    it('should display error alert on failed login', async () => {
      const errorMessage = 'Invalid credentials';
      mockSignIn.mockRejectedValue(new Error(errorMessage));

      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Login Failed',
          errorMessage || 'Please try again'
        );
      });
    });
  });

  describe('TC-LOGIN-005: Input Field Interaction', () => {
    it('should update email state when typing', () => {
      const { getByPlaceholderText } = render(<LoginScreen navigation={mockNavigation} />);
      const emailInput = getByPlaceholderText('Enter your email');

      fireEvent.changeText(emailInput, 'test@example.com');

      expect(emailInput.props.value).toBe('test@example.com');
    });

    it('should update password state when typing', () => {
      const { getByPlaceholderText } = render(<LoginScreen navigation={mockNavigation} />);
      const passwordInput = getByPlaceholderText('Enter your password');

      fireEvent.changeText(passwordInput, 'mypassword');

      expect(passwordInput.props.value).toBe('mypassword');
    });
  });

  describe('TC-LOGIN-006: Navigation to Signup', () => {
    it('should navigate to signup screen when clicking create account', () => {
      const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
      const signupLink = getByText('Create New Account');

      fireEvent.press(signupLink);

      expect(mockNavigate).toHaveBeenCalledWith('Signup');
    });
  });

  describe('TC-LOGIN-007: Loading State During Login', () => {
    it('should disable form and show loading text during login', async () => {
      let resolveSignIn: () => void;
      const signInPromise = new Promise<void>((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignIn.mockReturnValue(signInPromise);

      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(getByText('Signing in...')).toBeTruthy();
      });

      // Check that inputs are disabled
      expect(emailInput.props.editable).toBe(false);
      expect(passwordInput.props.editable).toBe(false);

      // Resolve the promise
      resolveSignIn!();
      await waitFor(() => {
        expect(getByText('Sign In')).toBeTruthy();
      });
    });
  });

  describe('Forgot Password', () => {
    it('should show alert when forgot password is clicked', () => {
      const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
      const forgotPasswordLink = getByText('Forgot Password?');

      fireEvent.press(forgotPasswordLink);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Forgot Password',
        'This feature is coming soon!'
      );
    });
  });
});

