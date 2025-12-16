import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/MainNavigator';
import { questionAdminService } from '../services/question-admin.service';
import { migrationService } from '../services/migration.service';
import { useEnvironment } from '../contexts/EnvironmentContext';

type QuestionStatsScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'QuestionStats'>;
  route: RouteProp<MainStackParamList, 'QuestionStats'>;
};

export default function QuestionStatsScreen({ navigation, route }: QuestionStatsScreenProps) {
  const { isDevelopment, environment } = useEnvironment();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const [migrationSummary, setMigrationSummary] = useState<any>(null);

  useEffect(() => {
    loadAllStats();
  }, [environment]);

  const loadAllStats = async () => {
    try {
      // Load basic stats
      const { stats: basicStats, error: statsError } =
        await questionAdminService.getQuestionStats();
      if (!statsError) {
        setStats(basicStats);
      }

      // Load quality metrics (dev only)
      if (isDevelopment) {
        const { metrics, error: metricsError } =
          await questionAdminService.getQualityMetrics();
        if (!metricsError) {
          setQualityMetrics(metrics);
        }

        // Load migration readiness summary
        const { summary, error: summaryError } =
          await migrationService.getMigrationReadinessSummary();
        if (!summaryError) {
          setMigrationSummary(summary);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllStats();
  };

  const handleViewMigrationErrors = () => {
    if (!migrationSummary || migrationSummary.errorDetails.length === 0) {
      Alert.alert('No Errors', 'All flagged questions are ready to migrate!');
      return;
    }

    const errorMessages = migrationSummary.errorDetails
      .map(
        (detail: any) =>
          `${detail.questionText.substring(0, 50)}...\n${detail.errors.join(', ')}`
      )
      .join('\n\n');

    Alert.alert('Migration Errors', errorMessages);
  };

  const handleBatchMigrate = () => {
    if (!migrationSummary || migrationSummary.readyToMigrate === 0) {
      Alert.alert('No Questions', 'No questions are ready to migrate');
      return;
    }

    Alert.alert(
      'Batch Migrate?',
      `Migrate ${migrationSummary.readyToMigrate} ready question(s) to production?\n\n${
        migrationSummary.hasErrors > 0
          ? `⚠️ ${migrationSummary.hasErrors} question(s) have errors and will be skipped.`
          : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Migrate',
          onPress: async () => {
            const result = await migrationService.batchMigrateFlaggedQuestions();
            Alert.alert(
              result.success ? 'Success' : 'Error',
              result.message,
              [{ text: 'OK', onPress: loadAllStats }]
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Question Statistics</Text>
        <Text style={styles.subtitle}>
          {isDevelopment ? 'Development Environment' : 'Production Environment'}
        </Text>
      </View>

      {/* Basic Stats */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Questions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, styles.statNumberGreen]}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, styles.statNumberOrange]}>
                {stats.inactive}
              </Text>
              <Text style={styles.statLabel}>Inactive</Text>
            </View>
          </View>
        </View>
      )}

      {/* Difficulty Breakdown */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Difficulty</Text>
          <View style={styles.difficultyContainer}>
            {Object.entries(stats.byDifficulty).map(([difficulty, count]) => (
              <View key={difficulty} style={styles.difficultyRow}>
                <View style={styles.difficultyInfo}>
                  <Text style={styles.difficultyName}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </Text>
                  <Text style={styles.difficultyCount}>{count as number}</Text>
                </View>
                <View style={styles.difficultyBar}>
                  <View
                    style={[
                      styles.difficultyBarFill,
                      {
                        width: `${((count as number) / stats.total) * 100}%`,
                        backgroundColor: getDifficultyColor(difficulty),
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Category Breakdown */}
      {stats && stats.byCategory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Category</Text>
          <View style={styles.categoryContainer}>
            {stats.byCategory.map((cat: any, index: number) => (
              <View key={index} style={styles.categoryRow}>
                <Text style={styles.categoryName}>{cat.categoryName}</Text>
                <Text style={styles.categoryCount}>{cat.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quality Metrics (Dev Only) */}
      {isDevelopment && qualityMetrics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quality Metrics</Text>

          {/* Completeness Score */}
          <View style={styles.completenessContainer}>
            <Text style={styles.completenessLabel}>Average Completeness</Text>
            <View style={styles.completenessBar}>
              <View
                style={[
                  styles.completenessBarFill,
                  {
                    width: `${qualityMetrics.averageCompleteness}%`,
                    backgroundColor: getCompletenessColor(
                      qualityMetrics.averageCompleteness
                    ),
                  },
                ]}
              />
            </View>
            <Text style={styles.completenessScore}>
              {qualityMetrics.averageCompleteness}%
            </Text>
          </View>

          {/* Quality Breakdown */}
          <View style={styles.qualityGrid}>
            <View style={styles.qualityCard}>
              <Text style={styles.qualityNumber}>
                {qualityMetrics.questionsWithExplanations}
              </Text>
              <Text style={styles.qualityLabel}>With Explanation</Text>
              <Text style={styles.qualityPercentage}>
                {Math.round(
                  (qualityMetrics.questionsWithExplanations / qualityMetrics.totalQuestions) *
                    100
                )}
                %
              </Text>
            </View>

            <View style={styles.qualityCard}>
              <Text style={styles.qualityNumber}>
                {qualityMetrics.questionsWithReferences}
              </Text>
              <Text style={styles.qualityLabel}>With Reference</Text>
              <Text style={styles.qualityPercentage}>
                {Math.round(
                  (qualityMetrics.questionsWithReferences / qualityMetrics.totalQuestions) *
                    100
                )}
                %
              </Text>
            </View>

            <View style={styles.qualityCard}>
              <Text style={styles.qualityNumber}>
                {qualityMetrics.questionsWithTeachingNotes}
              </Text>
              <Text style={styles.qualityLabel}>With Teaching Notes</Text>
              <Text style={styles.qualityPercentage}>
                {Math.round(
                  (qualityMetrics.questionsWithTeachingNotes /
                    qualityMetrics.totalQuestions) *
                    100
                )}
                %
              </Text>
            </View>

            <View style={styles.qualityCard}>
              <Text style={styles.qualityNumber}>{qualityMetrics.questionsWithTags}</Text>
              <Text style={styles.qualityLabel}>With Tags</Text>
              <Text style={styles.qualityPercentage}>
                {Math.round(
                  (qualityMetrics.questionsWithTags / qualityMetrics.totalQuestions) * 100
                )}
                %
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Migration Readiness (Dev Only) */}
      {isDevelopment && migrationSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Migration Readiness</Text>

          <View style={styles.migrationSummary}>
            <View style={styles.migrationRow}>
              <Text style={styles.migrationLabel}>Total Flagged:</Text>
              <Text style={styles.migrationValue}>{migrationSummary.totalFlagged}</Text>
            </View>
            <View style={styles.migrationRow}>
              <Text style={styles.migrationLabel}>Ready to Migrate:</Text>
              <Text style={[styles.migrationValue, styles.migrationValueGreen]}>
                {migrationSummary.readyToMigrate}
              </Text>
            </View>
            <View style={styles.migrationRow}>
              <Text style={styles.migrationLabel}>Has Warnings Only:</Text>
              <Text style={[styles.migrationValue, styles.migrationValueOrange]}>
                {migrationSummary.hasWarningsOnly}
              </Text>
            </View>
            <View style={styles.migrationRow}>
              <Text style={styles.migrationLabel}>Has Errors:</Text>
              <Text style={[styles.migrationValue, styles.migrationValueRed]}>
                {migrationSummary.hasErrors}
              </Text>
            </View>
          </View>

          <View style={styles.migrationActions}>
            {migrationSummary.hasErrors > 0 && (
              <TouchableOpacity
                style={styles.errorButton}
                onPress={handleViewMigrationErrors}
              >
                <Text style={styles.errorButtonText}>View Errors</Text>
              </TouchableOpacity>
            )}

            {migrationSummary.readyToMigrate > 0 && (
              <TouchableOpacity
                style={styles.migrateButton}
                onPress={handleBatchMigrate}
              >
                <Text style={styles.migrateButtonText}>
                  Migrate {migrationSummary.readyToMigrate} Question(s)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>💡 Tips for Quality Questions</Text>
        <Text style={styles.helpText}>
          • Always include Bible references to help users learn Scripture locations
        </Text>
        <Text style={styles.helpText}>
          • Add explanations to help users understand why answers are correct
        </Text>
        <Text style={styles.helpText}>
          • Use teaching notes for deeper theological context (especially for scholar difficulty)
        </Text>
        <Text style={styles.helpText}>
          • Tag questions with themes, biblical books, and key concepts
        </Text>
        <Text style={styles.helpText}>
          • Aim for 100% completeness before migrating to production
        </Text>
      </View>
    </ScrollView>
  );
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'beginner':
      return '#28a745';
    case 'intermediate':
      return '#ffc107';
    case 'expert':
      return '#fd7e14';
    case 'scholar':
      return '#dc3545';
    default:
      return '#6c757d';
  }
}

function getCompletenessColor(percentage: number): string {
  if (percentage >= 75) return '#28a745';
  if (percentage >= 50) return '#ffc107';
  return '#dc3545';
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
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statNumberGreen: {
    color: '#28a745',
  },
  statNumberOrange: {
    color: '#ffc107',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  difficultyContainer: {
    gap: 12,
  },
  difficultyRow: {
    gap: 8,
  },
  difficultyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  difficultyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  difficultyCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  difficultyBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  difficultyBarFill: {
    height: '100%',
  },
  categoryContainer: {
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  completenessContainer: {
    marginBottom: 20,
  },
  completenessLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  completenessBar: {
    height: 24,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  completenessBarFill: {
    height: '100%',
  },
  completenessScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  qualityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  qualityCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  qualityNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  qualityLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  qualityPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745',
    marginTop: 4,
  },
  migrationSummary: {
    gap: 12,
    marginBottom: 16,
  },
  migrationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  migrationLabel: {
    fontSize: 14,
    color: '#666',
  },
  migrationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  migrationValueGreen: {
    color: '#28a745',
  },
  migrationValueOrange: {
    color: '#ffc107',
  },
  migrationValueRed: {
    color: '#dc3545',
  },
  migrationActions: {
    gap: 8,
  },
  errorButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  migrateButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  migrateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  helpContainer: {
    backgroundColor: '#FFF3CD',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
