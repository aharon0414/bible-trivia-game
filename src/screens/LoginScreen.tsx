import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useEnvironment } from '../contexts/EnvironmentContext';

interface LoginScreenProps {
  navigation: any;
}

/**
 * Maps Supabase auth errors to user-friendly messages
 */
function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred';
  
  const errorMessage = error.message || error.toString() || '';
  const lowerMessage = errorMessage.toLowerCase();

  // Check for specific error patterns
  if (lowerMessage.includes('already registered') || 
      lowerMessage.includes('user already registered') ||
      lowerMessage.includes('email address is already registered')) {
    return 'This email is already registered';
  }

  if (lowerMessage.includes('invalid login credentials') ||
      lowerMessage.includes('invalid credentials') ||
      lowerMessage.includes('email or password') ||
      lowerMessage.includes('wrong password') ||
      lowerMessage.includes('incorrect password')) {
    return 'Invalid email or password';
  }

  if (lowerMessage.includes('password too short') ||
      lowerMessage.includes('password should be at least')) {
    return 'Password must be at least 6 characters';
  }

  if (lowerMessage.includes('network') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('timeout')) {
    return 'Connection error. Please check your internet';
  }

  if (lowerMessage.includes('email not confirmed') ||
      lowerMessage.includes('email not verified')) {
    return 'Please verify your email before signing in';
  }

  if (lowerMessage.includes('too many requests') ||
      lowerMessage.includes('rate limit')) {
    return 'Too many attempts. Please try again in a few minutes';
  }

  // Return original message if no pattern matches, but make it more user-friendly
  return errorMessage || 'An error occurred. Please try again';
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { signIn } = useAuth();
  
  // Get environment context (must be called unconditionally - hooks rule)
  const { environment, isDevelopment, setEnvironment, isLoading: envLoading } = useEnvironment();

  // Debug: Log environment state on mount and changes
  useEffect(() => {
    console.log('LoginScreen - Environment state:', {
      environment,
      isDevelopment,
      isLoading: envLoading,
    });
  }, [environment, isDevelopment, envLoading]);

  // Clear error when user starts typing
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (authError) {
      setAuthError(null);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (authError) {
      setAuthError(null);
    }
  };

  async function handleLogin() {
    // Prevent double-submission
    if (isLoading) {
      return;
    }

    // Clear previous errors
    setAuthError(null);

    // Validate inputs
    if (!email || !password) {
      setAuthError('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email, password);
      // Navigation will be handled automatically by auth state change
      // Clear form on success
      setEmail('');
      setPassword('');
      setAuthError(null);
    } catch (error: any) {
      console.error('[LoginScreen] Login error:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      setAuthError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <Text style={styles.headerIcon}>📖</Text>
          <Text style={styles.title}>Bible Trivia</Text>
          <Text style={styles.subtitle}>Test your knowledge of Scripture</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[
                styles.input,
                authError && styles.inputError
              ]}
              placeholder="Enter your email"
              value={email}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  authError && styles.inputError
                ]}
                placeholder="Enter your password"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Text style={styles.passwordToggleIcon}>
                  {showPassword ? '👁️‍🗨️' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error message display */}
          {authError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              (isLoading || !email || !password) && styles.buttonDisabled
            ]}
            onPress={handleLogin}
            disabled={isLoading || !email || !password}
          >
            {isLoading ? (
              <View style={styles.buttonLoadingContainer}>
                <ActivityIndicator size="small" color="#fff" style={styles.buttonSpinner} />
                <Text style={styles.buttonText}>Logging in...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => Alert.alert('Forgot Password', 'This feature is coming soon!')}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Signup')}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Create New Account</Text>
          </TouchableOpacity>

          {/* Environment Toggle Section - Always visible */}
          <View style={styles.environmentSection}>
            <Text style={styles.environmentLabel}>
              Environment: {isDevelopment ? '🔧 DEV' : '🚀 PROD'}
            </Text>
            <TouchableOpacity
              style={[
                styles.environmentToggle,
                isDevelopment ? styles.environmentToggleDev : styles.environmentToggleProd
              ]}
              onPress={async () => {
                try {
                  const newEnv = isDevelopment ? 'production' : 'development';
                  console.log('Switching environment from', environment, 'to', newEnv);
                  await setEnvironment(newEnv);
                  console.log('Environment switched successfully');
                } catch (error) {
                  console.error('Failed to switch environment:', error);
                  Alert.alert('Error', 'Failed to switch environment. Please try again.');
                }
              }}
              disabled={isLoading}
            >
              <Text style={styles.environmentToggleText}>
                Switch to {isDevelopment ? 'PROD' : 'DEV'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 40, // Extra padding to ensure environment section is visible
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    zIndex: 1,
  },
  passwordToggleIcon: {
    fontSize: 20,
  },
  inputError: {
    borderColor: '#DC3545',
    borderWidth: 1.5,
  },
  errorContainer: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#DC3545',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#B0C4DE',
    opacity: 0.6,
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSpinner: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#4A90E2',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  environmentSection: {
    marginTop: 32,
    paddingTop: 24,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
    width: '100%',
  },
  environmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  environmentToggle: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    minWidth: 150,
    alignItems: 'center',
    marginTop: 8,
  },
  environmentToggleDev: {
    backgroundColor: '#FFA500',
  },
  environmentToggleProd: {
    backgroundColor: '#28A745',
  },
  environmentToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
