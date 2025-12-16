/**
 * Environment Configuration
 * Manages dev/prod environment switching for data isolation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type Environment = 'development' | 'production';

export interface EnvironmentConfig {
  current: Environment;
  tables: {
    categories: string;
    questions: string;
    gamesSessions: string;
    gameAnswers: string;
    categoryStats: string;
  };
}

class EnvironmentManager {
  private static STORAGE_KEY = '@bible_trivia_environment';
  private environment: Environment;
  private listeners: Set<(env: Environment) => void>;

  constructor() {
    this.environment = 'production'; // Default to production for safety
    this.listeners = new Set();
  }

  /**
   * Initialize environment from storage
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(EnvironmentManager.STORAGE_KEY);
      if (stored === 'development' || stored === 'production') {
        this.environment = stored;
      }
    } catch (error) {
      console.error('Failed to load environment from storage:', error);
    }
  }

  /**
   * Get current environment
   */
  getEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Set current environment
   */
  async setEnvironment(env: Environment): Promise<void> {
    if (env === this.environment) return;

    this.environment = env;

    // Save to storage
    try {
      await AsyncStorage.setItem(EnvironmentManager.STORAGE_KEY, env);
    } catch (error) {
      console.error('Failed to save environment to storage:', error);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(env));
  }

  /**
   * Subscribe to environment changes
   */
  subscribe(listener: (env: Environment) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get table names for current environment
   */
  getTables(): EnvironmentConfig['tables'] {
    const suffix = this.environment === 'development' ? '_dev' : '';

    return {
      categories: `categories${suffix}`,
      questions: `questions${suffix}`,
      gamesSessions: `game_sessions${suffix}`,
      gameAnswers: `game_answers${suffix}`,
      categoryStats: `category_stats${suffix}`,
    };
  }

  /**
   * Get config for current environment
   */
  getConfig(): EnvironmentConfig {
    return {
      current: this.environment,
      tables: this.getTables(),
    };
  }

  /**
   * Check if currently in development mode
   */
  isDevelopment(): boolean {
    return this.environment === 'development';
  }

  /**
   * Check if currently in production mode
   */
  isProduction(): boolean {
    return this.environment === 'production';
  }
}

// Export singleton instance
export const environmentManager = new EnvironmentManager();

// Helper function to get table name for current environment
export function getTableName(baseTable: keyof EnvironmentConfig['tables']): string {
  return environmentManager.getTables()[baseTable];
}

// Helper to get current environment
export function getCurrentEnvironment(): Environment {
  return environmentManager.getEnvironment();
}

// Helper to check if in dev mode
export function isDevelopmentMode(): boolean {
  return environmentManager.isDevelopment();
}

// Helper to check if in prod mode
export function isProductionMode(): boolean {
  return environmentManager.isProduction();
}
