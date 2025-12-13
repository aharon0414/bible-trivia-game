// Mock AsyncStorage
const asyncStorageMock = {
  store: {} as Record<string, string>,
  getItem: jest.fn((key: string) => Promise.resolve(asyncStorageMock.store[key] || null)),
  setItem: jest.fn((key: string, value: string) => Promise.resolve(asyncStorageMock.store[key] = value)),
  removeItem: jest.fn((key: string) => Promise.resolve(delete asyncStorageMock.store[key])),
  clear: jest.fn(() => Promise.resolve(asyncStorageMock.store = {})),
};

jest.mock('@react-native-async-storage/async-storage', () => asyncStorageMock);

// Mock Supabase
jest.mock('./src/services/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      refreshSession: jest.fn(),
    },
  },
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    }),
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ component: Component }) => <Component />,
  }),
}));

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

