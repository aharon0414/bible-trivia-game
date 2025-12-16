import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/MainNavigator';
import { Difficulty } from '../types/database';

type DifficultyScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Difficulty'>;
};

export default function DifficultyScreen({ navigation }: DifficultyScreenProps) {
  const handleSelectDifficulty = (difficulty: Difficulty) => {
    navigation.navigate('Game', { difficulty });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Difficulty</Text>
        <Text style={styles.subtitle}>Choose your challenge level</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.difficultyButton, styles.beginnerButton]}
          onPress={() => handleSelectDifficulty('beginner')}
        >
          <Text style={styles.difficultyTitle}>Beginner</Text>
          <Text style={styles.difficultyDescription}>
            Perfect for new learners
          </Text>
          <Text style={styles.difficultyDetails}>10 questions • Basic knowledge</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.difficultyButton, styles.intermediateButton]}
          onPress={() => handleSelectDifficulty('intermediate')}
        >
          <Text style={styles.difficultyTitle}>Intermediate</Text>
          <Text style={styles.difficultyDescription}>
            A balanced challenge
          </Text>
          <Text style={styles.difficultyDetails}>15 questions • Moderate knowledge</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.difficultyButton, styles.expertButton]}
          onPress={() => handleSelectDifficulty('expert')}
        >
          <Text style={styles.difficultyTitle}>Expert</Text>
          <Text style={styles.difficultyDescription}>
            For experienced readers
          </Text>
          <Text style={styles.difficultyDetails}>20 questions • Advanced knowledge</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.difficultyButton, styles.scholarButton]}
          onPress={() => handleSelectDifficulty('scholar')}
        >
          <Text style={styles.difficultyTitle}>Scholar</Text>
          <Text style={styles.difficultyDescription}>
            Master level challenge
          </Text>
          <Text style={styles.difficultyDetails}>25 questions • Expert knowledge</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back to Menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  difficultyButton: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  beginnerButton: {
    backgroundColor: '#4CAF50',
  },
  intermediateButton: {
    backgroundColor: '#2196F3',
  },
  expertButton: {
    backgroundColor: '#FF9800',
  },
  scholarButton: {
    backgroundColor: '#F44336',
  },
  difficultyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  difficultyDescription: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.95,
    marginBottom: 8,
  },
  difficultyDetails: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.85,
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
});
