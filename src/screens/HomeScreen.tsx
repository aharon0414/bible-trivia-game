import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/MainNavigator';
import { useAuth } from '../contexts/AuthContext';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { supabase } from '../services/supabase';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, signOut } = useAuth();
  const { isDevelopment, setEnvironment, environment } = useEnvironment();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const handleStartGame = () => {
    navigation.navigate('Difficulty');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleToggleEnvironment = async () => {
    const newEnv = isDevelopment ? 'production' : 'development';
    await setEnvironment(newEnv);
  };

  // Fetch user profile to get role
  useEffect(() => {
    async function fetchUserProfile() {
      if (!user?.id) {
        setLoadingProfile(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setUserRole(null);
        } else {
          setUserRole(data?.role || null);
        }
      } catch (err) {
        console.error('Exception fetching user profile:', err);
        setUserRole(null);
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchUserProfile();
  }, [user?.id]);

  const isAdmin = userRole === 'admin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Bible Trivia</Text>
        <Text style={styles.subtitle}>Test Your Knowledge</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.welcomeText}>Welcome, {user?.email}!</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStartGame}
        >
          <Text style={styles.primaryButtonText}>Start Game</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {/* TODO: Add leaderboard */}}
        >
          <Text style={styles.secondaryButtonText}>Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {/* TODO: Add stats */}}
        >
          <Text style={styles.secondaryButtonText}>My Stats</Text>
        </TouchableOpacity>
      </View>

      {/* Dev Tools Section - Only visible to admins */}
      {!loadingProfile && isAdmin && (
        <View style={styles.devToolsContainer}>
        <Text style={styles.devToolsTitle}>Content Management</Text>
        <Text style={styles.envBadge}>
          {environment.toUpperCase()} MODE
        </Text>

        <TouchableOpacity
          style={styles.envToggleButton}
          onPress={handleToggleEnvironment}
        >
          <Text style={styles.envToggleText}>
            Switch to {isDevelopment ? 'Production' : 'Development'}
          </Text>
        </TouchableOpacity>

        {isDevelopment && (
          <>
            <TouchableOpacity
              style={styles.devButton}
              onPress={() => navigation.navigate('QuestionCreate')}
            >
              <Text style={styles.devButtonText}>📝 Create Question</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.devButton}
              onPress={() => navigation.navigate('BatchReview')}
            >
              <Text style={styles.devButtonText}>✅ Batch Review</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.devButton}
              onPress={() => navigation.navigate('QuestionReview')}
            >
              <Text style={styles.devButtonText}>📋 Question List</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.devButton}
              onPress={() => navigation.navigate('QuestionStats')}
            >
              <Text style={styles.devButtonText}>📊 Statistics</Text>
            </TouchableOpacity>
          </>
        )}
        </View>
      )}

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 20,
    color: '#333',
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  secondaryButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  devToolsContainer: {
    backgroundColor: '#fff',
    margin: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFC107',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  devToolsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  envBadge: {
    backgroundColor: '#FFC107',
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  envToggleButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  envToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  devButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  devButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  signOutButton: {
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#999',
    fontSize: 16,
  },
});