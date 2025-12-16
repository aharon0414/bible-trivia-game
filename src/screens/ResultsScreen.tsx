import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/MainNavigator';

type ResultsScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Results'>;
  route: RouteProp<MainStackParamList, 'Results'>;
};

export default function ResultsScreen({ navigation, route }: ResultsScreenProps) {
  const { score, total, difficulty } = route.params;
  const percentage = Math.round((score / total) * 100);

  const getResultMessage = () => {
    if (percentage >= 90) return 'Excellent! 🎉';
    if (percentage >= 70) return 'Great Job! 👏';
    if (percentage >= 50) return 'Good Effort! 👍';
    return 'Keep Practicing! 💪';
  };

  const getResultColor = () => {
    if (percentage >= 90) return '#4CAF50';
    if (percentage >= 70) return '#2196F3';
    if (percentage >= 50) return '#FF9800';
    return '#F44336';
  };

  return (
    <View style={styles.container}>
      <View style={[styles.resultHeader, { backgroundColor: getResultColor() }]}>
        <Text style={styles.resultTitle}>{getResultMessage()}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Your Score</Text>
          <Text style={[styles.scoreValue, { color: getResultColor() }]}>
            {score} / {total}
          </Text>
          <Text style={styles.percentage}>{percentage}%</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Difficulty</Text>
            <Text style={styles.statValue}>{difficulty.toUpperCase()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Correct</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{score}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Wrong</Text>
            <Text style={[styles.statValue, { color: '#F44336' }]}>{total - score}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Difficulty')}
        >
          <Text style={styles.primaryButtonText}>Play Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.secondaryButtonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  resultHeader: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  scoreContainer: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 18,
    color: '#666',
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  percentage: {
    fontSize: 24,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  secondaryButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
});
