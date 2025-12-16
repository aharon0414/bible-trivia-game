import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { EnvironmentProvider } from './src/contexts/EnvironmentContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <EnvironmentProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthProvider>
    </EnvironmentProvider>
  );
}
