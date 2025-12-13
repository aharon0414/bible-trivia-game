import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignupScreen from '../SignupScreen';
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

describe('SignupScreen', () => {
  const mockSignUp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signUp: mockSignUp,
      signOut: jest.fn(),
    });
  });

  describe('TC-SIGNUP-001: Render Signup Screen', () => {
    it('should render all UI elements correctly', () => {
      const { getByPlaceholderText, getByText } = render(
        <SignupScreen navigation={mockNavigation} />
      );

      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(getByPlaceholderText('Create a password (min 6 characters)')).toBeTruthy();
      expect(getByPlaceholderText('Re-enter your password')).toBeTruthy();
      expect(getByText('Sign Up')).toBeTruthy();
      expect(getByText('Already have an account? Sign In')).toBeTruthy();
      expect(getByText('Create Account')).toBeTruthy();
    });
  });

  describe('TC-SIGNUP-002: Empty Form Validation', () => {
    it('should show error alert when submitting empty form', async () => {
      const { getByText } = render(<SignupScreen navigation={mockNavigation} />);
      const signUpButton = getByText('Sign Up');

      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
      });
    });

    it('should show error when email is missing', async () => {
      const { getByPlaceholderText, getByText } = render(
        <SignupScreen navigation={mockNavigation} />
      );

      const passwordInput = getByPlaceholderText('Create a password (min 6 characters)');
      const confirmPasswordInput = getByPlaceholderText('Re-enter your password');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
      });
    });
  });

  describe('TC-SIGNUP-003: Password Mismatch Validation', () => {
    it('should show error when passwords do not match', async () => {
      const { getByPlaceholderText, getByText } = render(
        <SignupScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Create a password (min 6 characters)');
      const confirmPasswordInput = getByPlaceholderText('Re-enter your password');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'differentpassword');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Passwords do not match');
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  describe('TC-SIGNUP-004: Short Password Validation', () => {
    it('should show error when password is less than 6 characters', async () => {
      const { getByPlaceholderText, getByText } = render(
        <SignupScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Create a password (min 6 characters)');
      const confirmPasswordInput = getByPlaceholderText('Re-enter your password');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, '12345');
      fireEvent.changeText(confirmPasswordInput, '12345');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Password must be at least 6 characters');
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('should allow password of exactly 6 characters', async () => {
      mockSignUp.mockResolvedValue(undefined);

      const { getByPlaceholderText, getByText } = render(
        <SignupScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Create a password (min 6 characters)');
      const confirmPasswordInput = getByPlaceholderText('Re-enter your password');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, '123456');
      fireEvent.changeText(confirmPasswordInput, '123456');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('test@example.com', '123456');
      });
    });
  });

  describe('TC-SIGNUP-005: Successful Signup', () => {
    it('should call signUp function with correct credentials', async () => {
      mockSignUp.mockResolvedValue(undefined);

      const { getByPlaceholderText, getByText } = render(
        <SignupScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Create a password (min 6 characters)');
      const confirmPasswordInput = getByPlaceholderText('Re-enter your password');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(emailInput, 'newuser@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('newuser@example.com', 'password123');
      });
    });
  });

  describe('TC-SIGNUP-006: Failed Signup Error Display', () => {
    it('should display error alert on failed signup', async () => {
      const errorMessage = 'Email already registered';
      mockSignUp.mockRejectedValue(new Error(errorMessage));

      const { getByPlaceholderText, getByText } = render(
        <SignupScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Create a password (min 6 characters)');
      const confirmPasswordInput = getByPlaceholderText('Re-enter your password');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(emailInput, 'existing@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Signup Failed',
          errorMessage || 'Please try again'
        );
      });
    });
  });

  describe('TC-SIGNUP-007: Navigation to Login', () => {
    it('should navigate to login screen when clicking sign in link', () => {
      const { getByText } = render(<SignupScreen navigation={mockNavigation} />);
      const loginLink = getByText('Already have an account? Sign In');

      fireEvent.press(loginLink);

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('Input Field Interaction', () => {
    it('should update all input fields when typing', () => {
      const { getByPlaceholderText } = render(<SignupScreen navigation={mockNavigation} />);

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Create a password (min 6 characters)');
      const confirmPasswordInput = getByPlaceholderText('Re-enter your password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'mypassword');
      fireEvent.changeText(confirmPasswordInput, 'mypassword');

      expect(emailInput.props.value).toBe('test@example.com');
      expect(passwordInput.props.value).toBe('mypassword');
      expect(confirmPasswordInput.props.value).toBe('mypassword');
    });
  });

  describe('Loading State', () => {
    it('should show loading state during signup', async () => {
      let resolveSignUp: () => void;
      const signUpPromise = new Promise<void>((resolve) => {
        resolveSignUp = resolve;
      });
      mockSignUp.mockReturnValue(signUpPromise);

      const { getByPlaceholderText, getByText } = render(
        <SignupScreen navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Create a password (min 6 characters)');
      const confirmPasswordInput = getByPlaceholderText('Re-enter your password');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(getByText('Creating account...')).toBeTruthy();
      });

      expect(emailInput.props.editable).toBe(false);
      expect(passwordInput.props.editable).toBe(false);
      expect(confirmPasswordInput.props.editable).toBe(false);

      resolveSignUp!();
      await waitFor(() => {
        expect(getByText('Sign Up')).toBeTruthy();
      });
    });
  });
});

