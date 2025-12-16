import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { environmentManager, Environment } from '../config/environment';

interface EnvironmentContextValue {
  environment: Environment;
  setEnvironment: (env: Environment) => Promise<void>;
  isDevelopment: boolean;
  isProduction: boolean;
  isLoading: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextValue | undefined>(undefined);

interface EnvironmentProviderProps {
  children: ReactNode;
}

export function EnvironmentProvider({ children }: EnvironmentProviderProps) {
  const [environment, setEnvironmentState] = useState<Environment>('production');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize environment from storage
    const initEnvironment = async () => {
      try {
        await environmentManager.initialize();
        setEnvironmentState(environmentManager.getEnvironment());
      } catch (error) {
        console.error('Failed to initialize environment:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initEnvironment();

    // Subscribe to environment changes
    const unsubscribe = environmentManager.subscribe((env) => {
      setEnvironmentState(env);
    });

    return unsubscribe;
  }, []);

  const setEnvironment = async (env: Environment) => {
    await environmentManager.setEnvironment(env);
  };

  const value: EnvironmentContextValue = {
    environment,
    setEnvironment,
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
    isLoading,
  };

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
}

/**
 * Hook to access environment context
 */
export function useEnvironment(): EnvironmentContextValue {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
}
