# Authentication Test Plan
## Bible Trivia Game

**Version:** 1.0  
**Date:** 2024  
**Author:** Software Testing Expert  
**Status:** Pending Approval

---

## 1. Executive Summary

This test plan outlines the comprehensive testing strategy to verify authentication functionality in the Bible Trivia Game application. The authentication system uses Supabase Auth service and includes user registration, login, logout, session management, and authentication state handling.

---

## 2. Test Objectives

The primary objectives of this test plan are to:

1. **Verify User Registration**: Ensure new users can successfully create accounts with valid credentials
2. **Verify User Login**: Ensure existing users can authenticate with correct credentials
3. **Verify Authentication Security**: Ensure invalid credentials are properly rejected
4. **Verify Session Management**: Ensure user sessions persist correctly across app restarts
5. **Verify Logout Functionality**: Ensure users can successfully sign out
6. **Verify Navigation Flow**: Ensure proper navigation between authenticated and unauthenticated states
7. **Verify Error Handling**: Ensure appropriate error messages for various failure scenarios

---

## 3. Test Scope

### 3.1 In Scope

- **Authentication Service Layer** (`src/services/auth.service.ts`)
  - Sign up functionality
  - Sign in functionality
  - Sign out functionality
  - Session retrieval
  - Current user retrieval
  - Password reset (if implemented)
  - Session refresh
  - Authentication state checking

- **Authentication Context** (`src/contexts/AuthContext.tsx`)
  - User state management
  - Loading state handling
  - Auth state persistence
  - Context provider functionality

- **UI Components**
  - Login Screen (`src/screens/LoginScreen.tsx`)
    - Form validation
    - Input handling
    - Error display
    - Loading states
  - Signup Screen (`src/screens/SignupScreen.tsx`)
    - Form validation
    - Password confirmation matching
    - Input handling
    - Error display
    - Loading states

- **Navigation**
  - Root Navigator (`src/navigation/RootNavigator.tsx`)
    - Conditional navigation based on auth state
    - Loading screen display
    - Navigation flow between auth and main screens

- **Integration Points**
  - Supabase Auth integration
  - AsyncStorage integration (if used for persistence)
  - Navigation integration

### 3.2 Out of Scope

- Password reset flow (if not yet implemented)
- Password update functionality (if not exposed in UI)
- Profile update functionality (if not exposed in UI)
- Third-party OAuth providers (if not implemented)
- Biometric authentication (if not implemented)
- Email confirmation flow (will be noted but not fully tested)

---

## 4. Test Environment & Prerequisites

### 4.1 Test Environment Setup

- **Development Environment**
  - React Native development environment
  - Expo CLI installed
  - iOS Simulator or Android Emulator, or physical device
  - Node.js and npm/yarn

- **Test Data Requirements**
  - Valid test user accounts (will be created during testing)
  - Invalid email formats for validation testing
  - Various password combinations for security testing
  - Test Supabase project with appropriate configuration

- **Test Tools & Frameworks**
  - Jest (for unit testing)
  - React Native Testing Library (for component testing)
  - Supertest or similar (for API integration testing, if needed)
  - Mock Service Worker or similar (for mocking Supabase calls)

### 4.2 Configuration

- Supabase test project credentials
- Environment variables properly configured
- Test database setup (separate from production)
- Network connectivity for Supabase API calls

---

## 5. Test Cases

### 5.1 Unit Tests - AuthService

#### TC-AUTH-001: Sign Up with Valid Credentials
- **Objective**: Verify user can register with valid email and password
- **Preconditions**: No existing user with test email
- **Test Steps**:
  1. Call `authService.signUp()` with valid email and password
  2. Verify response contains user object
  3. Verify response contains session object
  4. Verify no error is returned
- **Expected Result**: User account created successfully, session established
- **Priority**: High

#### TC-AUTH-002: Sign Up with Invalid Email Format
- **Objective**: Verify system rejects invalid email formats
- **Preconditions**: None
- **Test Steps**:
  1. Call `authService.signUp()` with invalid email (e.g., "notanemail")
  2. Verify response contains error
  3. Verify user is null
  4. Verify session is null
- **Expected Result**: Error returned, no user created
- **Priority**: High

#### TC-AUTH-003: Sign Up with Weak Password
- **Objective**: Verify password strength requirements are enforced
- **Preconditions**: None
- **Test Steps**:
  1. Call `authService.signUp()` with password < 6 characters
  2. Verify response contains error
  3. Verify user is null
- **Expected Result**: Error returned indicating password too short
- **Priority**: High

#### TC-AUTH-004: Sign Up with Duplicate Email
- **Objective**: Verify system prevents duplicate account creation
- **Preconditions**: User with test email already exists
- **Test Steps**:
  1. Call `authService.signUp()` with existing email
  2. Verify response contains error
  3. Verify user is null
- **Expected Result**: Error returned, no duplicate account created
- **Priority**: High

#### TC-AUTH-005: Sign In with Valid Credentials
- **Objective**: Verify existing user can authenticate
- **Preconditions**: Valid user account exists
- **Test Steps**:
  1. Call `authService.signIn()` with correct email and password
  2. Verify response contains user object
  3. Verify response contains session object
  4. Verify user email matches input
  5. Verify no error is returned
- **Expected Result**: User authenticated, session established
- **Priority**: High

#### TC-AUTH-006: Sign In with Invalid Email
- **Objective**: Verify system rejects non-existent email
- **Preconditions**: No user with test email exists
- **Test Steps**:
  1. Call `authService.signIn()` with non-existent email
  2. Verify response contains error
  3. Verify user is null
  4. Verify session is null
- **Expected Result**: Error returned, authentication fails
- **Priority**: High

#### TC-AUTH-007: Sign In with Invalid Password
- **Objective**: Verify system rejects incorrect password
- **Preconditions**: Valid user account exists
- **Test Steps**:
  1. Call `authService.signIn()` with correct email but wrong password
  2. Verify response contains error
  3. Verify user is null
  4. Verify session is null
- **Expected Result**: Error returned, authentication fails
- **Priority**: High

#### TC-AUTH-008: Sign Out
- **Objective**: Verify user can successfully sign out
- **Preconditions**: User is currently authenticated
- **Test Steps**:
  1. Call `authService.signOut()`
  2. Verify no error is returned
  3. Call `authService.getSession()`
  4. Verify session is null
- **Expected Result**: User signed out, session cleared
- **Priority**: High

#### TC-AUTH-009: Get Current Session (Authenticated)
- **Objective**: Verify session can be retrieved when authenticated
- **Preconditions**: User is authenticated
- **Test Steps**:
  1. Call `authService.getSession()`
  2. Verify session object is returned
  3. Verify session contains valid token
  4. Verify session user matches authenticated user
- **Expected Result**: Valid session returned
- **Priority**: Medium

#### TC-AUTH-010: Get Current Session (Unauthenticated)
- **Objective**: Verify session is null when not authenticated
- **Preconditions**: User is not authenticated
- **Test Steps**:
  1. Call `authService.getSession()`
  2. Verify session is null
  3. Verify no error is returned
- **Expected Result**: Null session returned
- **Priority**: Medium

#### TC-AUTH-011: Get Current User (Authenticated)
- **Objective**: Verify current user can be retrieved
- **Preconditions**: User is authenticated
- **Test Steps**:
  1. Call `authService.getCurrentUser()`
  2. Verify user object is returned
  3. Verify user contains expected properties (id, email)
  4. Verify no error is returned
- **Expected Result**: Valid user object returned
- **Priority**: Medium

#### TC-AUTH-012: Check Authentication Status
- **Objective**: Verify `isAuthenticated()` returns correct state
- **Preconditions**: Various auth states
- **Test Steps**:
  1. When authenticated: Call `authService.isAuthenticated()` → should return true
  2. When not authenticated: Call `authService.isAuthenticated()` → should return false
- **Expected Result**: Correct boolean returned based on auth state
- **Priority**: Medium

#### TC-AUTH-013: Refresh Session
- **Objective**: Verify session can be refreshed
- **Preconditions**: User is authenticated
- **Test Steps**:
  1. Get original session token
  2. Call `authService.refreshSession()`
  3. Verify new session is returned
  4. Verify session contains valid token
- **Expected Result**: Session refreshed successfully
- **Priority**: Low

#### TC-AUTH-014: Auth State Change Listener
- **Objective**: Verify auth state changes are properly detected
- **Preconditions**: None
- **Test Steps**:
  1. Subscribe to auth state changes
  2. Sign in a user
  3. Verify callback is invoked with user and session
  4. Sign out user
  5. Verify callback is invoked with null user
  6. Unsubscribe
- **Expected Result**: Callbacks fire correctly for auth state changes
- **Priority**: Medium

### 5.2 Unit Tests - AuthContext

#### TC-CONTEXT-001: Initial State
- **Objective**: Verify context initializes with correct default state
- **Preconditions**: None
- **Test Steps**:
  1. Render AuthProvider
  2. Access context via useAuth hook
  3. Verify user is null initially
  4. Verify loading is true initially
- **Expected Result**: Initial state is correct
- **Priority**: High

#### TC-CONTEXT-002: Loading State After Check
- **Objective**: Verify loading state becomes false after user check
- **Preconditions**: None
- **Test Steps**:
  1. Render AuthProvider
  2. Wait for initial user check to complete
  3. Verify loading becomes false
- **Expected Result**: Loading state transitions correctly
- **Priority**: Medium

#### TC-CONTEXT-003: Sign In Updates User State
- **Objective**: Verify sign in updates context user state
- **Preconditions**: Valid user credentials
- **Test Steps**:
  1. Call `signIn()` from context
  2. Verify user state is updated with user object
  3. Verify user object contains expected properties
- **Expected Result**: User state updated correctly
- **Priority**: High

#### TC-CONTEXT-004: Sign Up Updates User State
- **Objective**: Verify sign up updates context user state
- **Preconditions**: Valid new user credentials
- **Test Steps**:
  1. Call `signUp()` from context
  2. Verify user state is updated with user object
  3. Verify user object contains expected properties
- **Expected Result**: User state updated correctly
- **Priority**: High

#### TC-CONTEXT-005: Sign Out Clears User State
- **Objective**: Verify sign out clears user state
- **Preconditions**: User is authenticated
- **Test Steps**:
  1. Call `signOut()` from context
  2. Verify user state becomes null
- **Expected Result**: User state cleared
- **Priority**: High

#### TC-CONTEXT-006: Context Error Handling
- **Objective**: Verify errors are properly handled
- **Preconditions**: None
- **Test Steps**:
  1. Attempt sign in with invalid credentials
  2. Verify error is thrown/caught appropriately
  3. Verify user state remains null
- **Expected Result**: Errors handled gracefully
- **Priority**: Medium

### 5.3 Component Tests - Login Screen

#### TC-LOGIN-001: Render Login Screen
- **Objective**: Verify login screen renders correctly
- **Preconditions**: None
- **Test Steps**:
  1. Render LoginScreen component
  2. Verify email input field is present
  3. Verify password input field is present
  4. Verify sign in button is present
  5. Verify "Create New Account" link is present
- **Expected Result**: All UI elements render correctly
- **Priority**: High

#### TC-LOGIN-002: Empty Form Validation
- **Objective**: Verify empty form submission shows error
- **Preconditions**: None
- **Test Steps**:
  1. Render LoginScreen
  2. Click sign in button without entering credentials
  3. Verify error alert is shown
- **Expected Result**: Validation error displayed
- **Priority**: High

#### TC-LOGIN-003: Successful Login
- **Objective**: Verify successful login flow
- **Preconditions**: Valid user credentials
- **Test Steps**:
  1. Enter valid email
  2. Enter valid password
  3. Click sign in button
  4. Verify loading state is shown
  5. Verify sign in function is called
  6. Verify navigation occurs (if testable)
- **Expected Result**: Login succeeds, navigation occurs
- **Priority**: High

#### TC-LOGIN-004: Failed Login Error Display
- **Objective**: Verify error is displayed on failed login
- **Preconditions**: Invalid credentials
- **Test Steps**:
  1. Enter invalid email or password
  2. Click sign in button
  3. Verify error alert is displayed
  4. Verify error message is appropriate
- **Expected Result**: Error alert shown with message
- **Priority**: High

#### TC-LOGIN-005: Input Field Interaction
- **Objective**: Verify input fields accept user input
- **Preconditions**: None
- **Test Steps**:
  1. Type email in email field
  2. Verify email state updates
  3. Type password in password field
  4. Verify password state updates
- **Expected Result**: Inputs work correctly
- **Priority**: Medium

#### TC-LOGIN-006: Navigation to Signup
- **Objective**: Verify navigation to signup screen works
- **Preconditions**: None
- **Test Steps**:
  1. Click "Create New Account" button
  2. Verify navigation.navigate('Signup') is called
- **Expected Result**: Navigation occurs
- **Priority**: Medium

#### TC-LOGIN-007: Loading State During Login
- **Objective**: Verify loading state disables form during login
- **Preconditions**: None
- **Test Steps**:
  1. Enter credentials
  2. Click sign in
  3. Verify button shows loading text
  4. Verify inputs are disabled
  5. Verify button is disabled
- **Expected Result**: Form disabled during loading
- **Priority**: Medium

### 5.4 Component Tests - Signup Screen

#### TC-SIGNUP-001: Render Signup Screen
- **Objective**: Verify signup screen renders correctly
- **Preconditions**: None
- **Test Steps**:
  1. Render SignupScreen component
  2. Verify email input is present
  3. Verify password input is present
  4. Verify confirm password input is present
  5. Verify sign up button is present
  6. Verify "Already have account" link is present
- **Expected Result**: All UI elements render correctly
- **Priority**: High

#### TC-SIGNUP-002: Empty Form Validation
- **Objective**: Verify empty form validation works
- **Preconditions**: None
- **Test Steps**:
  1. Click sign up without filling fields
  2. Verify error alert is shown
- **Expected Result**: Validation error displayed
- **Priority**: High

#### TC-SIGNUP-003: Password Mismatch Validation
- **Objective**: Verify password confirmation validation
- **Preconditions**: None
- **Test Steps**:
  1. Enter password
  2. Enter different confirm password
  3. Click sign up
  4. Verify error alert about password mismatch
- **Expected Result**: Password mismatch error shown
- **Priority**: High

#### TC-SIGNUP-004: Short Password Validation
- **Objective**: Verify minimum password length validation
- **Preconditions**: None
- **Test Steps**:
  1. Enter password < 6 characters
  2. Enter matching confirm password
  3. Click sign up
  4. Verify error alert about password length
- **Expected Result**: Password length error shown
- **Priority**: High

#### TC-SIGNUP-005: Successful Signup
- **Objective**: Verify successful signup flow
- **Preconditions**: Valid new user credentials
- **Test Steps**:
  1. Enter valid email
  2. Enter valid password (≥6 chars)
  3. Enter matching confirm password
  4. Click sign up
  5. Verify loading state
  6. Verify sign up function is called
- **Expected Result**: Signup succeeds
- **Priority**: High

#### TC-SIGNUP-006: Failed Signup Error Display
- **Objective**: Verify error display on failed signup
- **Preconditions**: Duplicate email or invalid data
- **Test Steps**:
  1. Attempt signup with existing email
  2. Click sign up
  3. Verify error alert is displayed
- **Expected Result**: Error alert shown
- **Priority**: High

#### TC-SIGNUP-007: Navigation to Login
- **Objective**: Verify navigation to login screen
- **Preconditions**: None
- **Test Steps**:
  1. Click "Already have account? Sign In"
  2. Verify navigation.navigate('Login') is called
- **Expected Result**: Navigation occurs
- **Priority**: Medium

### 5.5 Integration Tests - Navigation Flow

#### TC-NAV-001: Unauthenticated User Sees Auth Navigator
- **Objective**: Verify unauthenticated users see login/signup screens
- **Preconditions**: User is not authenticated
- **Test Steps**:
  1. Render RootNavigator with no user
  2. Verify AuthNavigator is rendered
  3. Verify LoginScreen is accessible
- **Expected Result**: Auth screens shown
- **Priority**: High

#### TC-NAV-002: Authenticated User Sees Main Navigator
- **Objective**: Verify authenticated users see main app
- **Preconditions**: User is authenticated
- **Test Steps**:
  1. Render RootNavigator with authenticated user
  2. Verify MainNavigator is rendered
  3. Verify auth screens are not accessible
- **Expected Result**: Main app screens shown
- **Priority**: High

#### TC-NAV-003: Loading State Shows Loading Screen
- **Objective**: Verify loading state shows loading indicator
- **Preconditions**: Auth check in progress
- **Test Steps**:
  1. Render RootNavigator with loading=true
  2. Verify loading spinner is shown
  3. Verify no navigator is shown
- **Expected Result**: Loading screen displayed
- **Priority**: Medium

#### TC-NAV-004: Navigation Updates After Login
- **Objective**: Verify navigation switches after successful login
- **Preconditions**: None
- **Test Steps**:
  1. Start with unauthenticated state
  2. Perform successful login
  3. Verify navigation switches to MainNavigator
- **Expected Result**: Navigation updates correctly
- **Priority**: High

#### TC-NAV-005: Navigation Updates After Logout
- **Objective**: Verify navigation switches after logout
- **Preconditions**: User is authenticated
- **Test Steps**:
  1. Start with authenticated state
  2. Perform logout
  3. Verify navigation switches to AuthNavigator
- **Expected Result**: Navigation updates correctly
- **Priority**: High

### 5.6 Integration Tests - Session Persistence

#### TC-PERSIST-001: Session Persists Across App Restart (if implemented)
- **Objective**: Verify user remains logged in after app restart
- **Preconditions**: User is authenticated
- **Test Steps**:
  1. Authenticate user
  2. Restart app
  3. Verify user is still authenticated
  4. Verify MainNavigator is shown
- **Expected Result**: Session persists
- **Priority**: High

#### TC-PERSIST-002: Session Expiry Handling (if applicable)
- **Objective**: Verify expired sessions are handled
- **Preconditions**: User has expired session
- **Test Steps**:
  1. Attempt to use expired session
  2. Verify user is logged out
  3. Verify AuthNavigator is shown
- **Expected Result**: Expired session handled gracefully
- **Priority**: Medium

### 5.7 Security Tests

#### TC-SEC-001: Password Not Stored in Plain Text
- **Objective**: Verify passwords are not stored in plain text
- **Preconditions**: None
- **Test Steps**:
  1. Check AsyncStorage/local storage
  2. Verify password is not stored in plain text
  3. Verify only session tokens/user IDs are stored
- **Expected Result**: No plain text passwords stored
- **Priority**: High

#### TC-SEC-002: Sensitive Data in Console Logs
- **Objective**: Verify sensitive data is not logged
- **Preconditions**: None
- **Test Steps**:
  1. Monitor console logs during authentication
  2. Verify passwords are not logged
  3. Verify tokens are not logged (or properly masked)
- **Expected Result**: No sensitive data in logs
- **Priority**: Medium

#### TC-SEC-003: Input Sanitization
- **Objective**: Verify inputs are properly sanitized
- **Preconditions**: None
- **Test Steps**:
  1. Attempt login with SQL injection attempts in email
  2. Attempt login with XSS attempts in email
  3. Verify no errors occur, inputs are sanitized
- **Expected Result**: Inputs sanitized correctly
- **Priority**: Medium

---

## 6. Test Data

### 6.1 Valid Test Users
- **User 1**: Standard user account
  - Email: `testuser1@example.com`
  - Password: `TestPassword123!`
  
- **User 2**: Another user account (for duplicate testing)
  - Email: `testuser2@example.com`
  - Password: `TestPassword456!`

### 6.2 Invalid Test Data
- Invalid emails: `notanemail`, `@example.com`, `test@`, `test.example.com`
- Short passwords: `12345`, `pass`
- Mismatched passwords: Various combinations
- Non-existent users: `nonexistent@example.com`

### 6.3 Edge Cases
- Very long email addresses
- Very long passwords
- Special characters in emails
- Unicode characters in passwords
- Empty strings
- Null/undefined values

---

## 7. Test Execution Strategy

### 7.1 Test Phases

1. **Phase 1: Unit Tests**
   - Execute all AuthService unit tests
   - Execute all AuthContext unit tests
   - Target: 100% code coverage for auth logic

2. **Phase 2: Component Tests**
   - Execute LoginScreen component tests
   - Execute SignupScreen component tests
   - Target: All UI interactions verified

3. **Phase 3: Integration Tests**
   - Execute navigation flow tests
   - Execute session persistence tests
   - Target: End-to-end flows working

4. **Phase 4: Security Tests**
   - Execute security-related tests
   - Target: Security requirements met

### 7.2 Test Execution Order
- Execute tests in dependency order (unit → component → integration)
- Execute critical path tests first (sign in, sign up, sign out)
- Execute edge cases and negative tests after positive tests

### 7.3 Regression Testing
- Re-run all tests after any authentication-related code changes
- Focus on affected test areas after bug fixes

---

## 8. Success Criteria

### 8.1 Test Coverage
- **Minimum Code Coverage**: 80% for authentication-related code
- **Critical Path Coverage**: 100% for sign in, sign up, sign out flows

### 8.2 Pass Criteria
- All high-priority test cases must pass
- No critical bugs in authentication flow
- All security tests must pass
- Navigation flow must work correctly

### 8.3 Failure Criteria
- Any high-priority test failure is a blocker
- Security test failures are critical blockers
- Multiple medium-priority failures may indicate design issues

---

## 9. Risk Assessment

### 9.1 High-Risk Areas
- Session persistence (user experience impact)
- Password security (data protection)
- Error handling (user confusion)
- Navigation flow (app usability)

### 9.2 Dependencies
- Supabase service availability
- Network connectivity for testing
- Test data cleanup between test runs

---

## 10. Deliverables

After test execution, the following will be delivered:

1. **Test Results Report**
   - Summary of all test cases executed
   - Pass/fail status for each test
   - Code coverage report
   - Defect log

2. **Test Code**
   - All unit test files
   - All component test files
   - All integration test files
   - Test utilities and helpers

3. **Documentation**
   - Test execution log
   - Known issues and limitations
   - Recommendations for improvements

---

## 11. Approval

**Test Plan Status:** ⬜ Pending Approval

**Approved By:** ___________________  
**Date:** _______________  
**Signature:** ___________________

---

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | Testing Expert | Initial test plan creation |

---

## Appendix A: Test Case Summary

**Total Test Cases**: 50+

**By Priority:**
- High Priority: ~30 test cases
- Medium Priority: ~15 test cases
- Low Priority: ~5 test cases

**By Type:**
- Unit Tests: ~20 test cases
- Component Tests: ~15 test cases
- Integration Tests: ~10 test cases
- Security Tests: ~5 test cases

---

## Appendix B: Tools & Setup Instructions

### Testing Stack (Proposed)
- **Jest**: Test runner
- **React Native Testing Library**: Component testing
- **@testing-library/jest-native**: Additional matchers
- **@supabase/supabase-js**: Mock or use test instance
- **@react-native-async-storage/async-storage**: Mock for testing

### Setup Commands
```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
npm install --save-dev @types/jest
```

### Configuration Files
- `jest.config.js`: Jest configuration
- Test setup file for mocking React Native components
- Mock files for Supabase and AsyncStorage

---

**End of Test Plan**

