import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/MainNavigator';
import { questionAdminService } from '../services/question-admin.service';
import { migrationService } from '../services/migration.service';
import { useEnvironment } from '../contexts/EnvironmentContext';
import EditQuestionModal from '../components/EditQuestionModal';
import type { Question, Difficulty } from '../types/database';

type QuestionReviewScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'QuestionReview'>;
  route: RouteProp<MainStackParamList, 'QuestionReview'>;
};

interface QuestionReview extends Question {
  categoryName: string;
}

export default function QuestionReviewScreen({ navigation, route }: QuestionReviewScreenProps) {
  const { isDevelopment } = useEnvironment();
  const [questions, setQuestions] = useState<QuestionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<{ difficulty?: Difficulty; active?: boolean }>({});
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const targetQuestionId = route?.params?.questionId;
  const editMode = route?.params?.editMode;

  useEffect(() => {
    loadQuestions();
    loadStats();
  }, [filter]);

  // Scroll to target question if provided
  useEffect(() => {
    if (targetQuestionId && questions.length > 0) {
      const question = questions.find(q => q.id === targetQuestionId);
      if (question) {
        if (editMode) {
          setEditingQuestion(question);
        }
        // Could add scroll to question logic here if needed
      }
    }
  }, [targetQuestionId, questions, editMode]);

  const loadQuestions = async () => {
    try {
      const { questions: devQuestions, error } = await questionAdminService.getDevQuestions({
        difficulty: filter.difficulty,
        isActive: filter.active,
      });

      if (error) {
        Alert.alert('Error', `Failed to load questions: ${error.message}`);
        return;
      }

      // Get category names for each question
      const { questionService } = await import('../services/question.service');
      const questionsWithCategories = await Promise.all(
        devQuestions.map(async (q) => {
          const { category } = await questionService.getCategory(q.category_id);
          return {
            ...q,
            categoryName: category?.name || 'Unknown',
          };
        })
      );

      setQuestions(questionsWithCategories);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    const { stats: questionStats } = await questionAdminService.getQuestionStats();
    setStats(questionStats);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadQuestions();
    loadStats();
  };

  const handleToggleActive = async (questionId: string, currentStatus: boolean) => {
    const { question, error } = await questionAdminService.toggleQuestionActive(questionId);

    if (error) {
      Alert.alert('Error', `Failed to update question: ${error.message}`);
      return;
    }

    Alert.alert('Success', `Question ${question?.is_active ? 'activated' : 'deactivated'}`);
    loadQuestions();
    loadStats();
  };

  const handleMigrateToProd = async (questionId: string) => {
    Alert.alert(
      'Migrate to Production?',
      'This will copy this question to the production tables. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Migrate',
          onPress: async () => {
            const result = await migrationService.migrateQuestion(questionId);
            if (result.success) {
              Alert.alert('Success', result.message);
            } else {
              Alert.alert('Error', result.message);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (questionId: string) => {
    Alert.alert(
      'Delete Question?',
      'This will permanently delete this question from dev. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await questionAdminService.deleteDevQuestion(questionId);
            if (error) {
              Alert.alert('Error', `Failed to delete: ${error.message}`);
            } else {
              Alert.alert('Success', 'Question deleted');
              loadQuestions();
              loadStats();
            }
          },
        },
      ]
    );
  };

  const handleReview = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      // Show detailed review modal or navigate to detail view
      Alert.alert(
        'Question Review',
        `Question: ${question.question_text}\n\nCorrect Answer: ${question.correct_answer}\n\n${question.bible_reference ? `Reference: ${question.bible_reference}\n\n` : ''}${question.explanation || ''}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleEdit = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      setEditingQuestion(question);
    }
  };

  const handleEditSave = () => {
    loadQuestions();
    loadStats();
  };

  const handleFlagForProd = async (questionId: string) => {
    const result = await migrationService.flagQuestionForMigration(questionId);
    if (result.success) {
      Alert.alert('Success', 'Question flagged for migration to production');
      loadQuestions();
      loadStats();
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleUnflag = async (questionId: string) => {
    const result = await migrationService.unflagQuestion(questionId);
    if (result.success) {
      Alert.alert('Success', 'Question unflagged');
      loadQuestions();
      loadStats();
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleBatchMigrate = async () => {
    const flaggedCount = questions.filter(q => q.ready_for_prod).length;
    console.log('[QuestionReviewScreen] handleBatchMigrate called, flaggedCount:', flaggedCount);
    console.log('[QuestionReviewScreen] Platform:', Platform.OS);
    
    if (flaggedCount === 0) {
      if (Platform.OS === 'web') {
        window.alert('No questions are flagged for migration');
      } else {
        Alert.alert('No Questions', 'No questions are flagged for migration');
      }
      return;
    }

    // Platform-specific confirmation
    if (Platform.OS === 'web') {
      // Use browser's native confirm dialog on web
      console.log('[QuestionReviewScreen] Showing web confirmation dialog...');
      const shouldProceed = window.confirm(
        `Migrate ${flaggedCount} flagged question(s) to production?\n\nClick OK to proceed or Cancel to abort.`
      );
      console.log('[QuestionReviewScreen] Web confirmation result:', shouldProceed);
      
      if (shouldProceed) {
        console.log('[QuestionReviewScreen] User confirmed migration on web, proceeding...');
        executeBatchMigration(flaggedCount);
      } else {
        console.log('[QuestionReviewScreen] User cancelled migration on web');
      }
    } else {
      // Use React Native Alert on iOS/Android
      console.log('[QuestionReviewScreen] Showing native Alert confirmation...');
      Alert.alert(
        'Batch Migrate?',
        `Migrate ${flaggedCount} flagged question(s) to production?`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              console.log('[QuestionReviewScreen] Migration cancelled by user');
            }
          },
          {
            text: 'Migrate',
            onPress: () => {
              console.log('[QuestionReviewScreen] User confirmed migration on native, proceeding...');
              // Call the actual migration function
              executeBatchMigration(flaggedCount);
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const executeBatchMigration = async (expectedCount: number) => {
    console.log('[QuestionReviewScreen] executeBatchMigration called, expectedCount:', expectedCount);
    
    // Set loading state
    setMigrating(true);
    
    try {
      console.log('[QuestionReviewScreen] About to call migrationService.batchMigrateFlaggedQuestions()...');
      
      // Actually call the migration service
      const result = await migrationService.batchMigrateFlaggedQuestions();
      
      console.log('[QuestionReviewScreen] Migration service returned result:', {
        success: result.success,
        message: result.message,
        itemsMigrated: result.itemsMigrated,
        hasError: !!result.error,
      });
      
      if (result.error) {
        console.error('[QuestionReviewScreen] Migration error details:', {
          message: result.error.message,
          stack: result.error.stack,
          error: result.error,
        });
      }
      
      // Reload data regardless of success/failure
      await loadQuestions();
      await loadStats();
      
      // Show result to user
      if (result.success) {
        Alert.alert(
          'Success',
          `Migrated ${result.itemsMigrated} question(s) to production!`,
          [{ text: 'OK' }]
        );
      } else {
        const errorMessage = result.error 
          ? `${result.message}\n\nError: ${result.error.message}`
          : result.message;
        
        console.error('[QuestionReviewScreen] Migration failed - showing error alert');
        Alert.alert(
          'Migration Failed',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      // Catch any unexpected errors that weren't caught by the service
      console.error('[QuestionReviewScreen] EXCEPTION in executeBatchMigration:', error);
      console.error('[QuestionReviewScreen] Exception stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('[QuestionReviewScreen] Exception details:', {
        name: error?.name,
        message: error?.message,
        error: error,
      });
      
      // Reload data even on error
      try {
        await loadQuestions();
        await loadStats();
      } catch (reloadError) {
        console.error('[QuestionReviewScreen] Error reloading data after migration failure:', reloadError);
      }
      
      // Show error to user
      Alert.alert(
        'Unexpected Error',
        `Migration failed with an unexpected error:\n\n${error?.message || 'Unknown error'}\n\nCheck console for details.`,
        [{ text: 'OK' }]
      );
    } finally {
      // Always clear loading state
      setMigrating(false);
      console.log('[QuestionReviewScreen] Migration process completed, loading state cleared');
    }
  };

  if (!isDevelopment) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          ⚠️ This screen is only available in development mode.
        </Text>
        <Text style={styles.errorSubtext}>
          Switch to dev mode to review questions.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Question Review</Text>
        <Text style={styles.subtitle}>Dev Environment Questions</Text>
        <TouchableOpacity
          style={[styles.batchMigrateButton, migrating && styles.batchMigrateButtonDisabled]}
          onPress={handleBatchMigrate}
          disabled={migrating}
        >
          {migrating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.batchMigrateButtonText}>
                Migrating...
              </Text>
            </View>
          ) : (
            <Text style={styles.batchMigrateButtonText}>
              🚀 Migrate All Flagged ({questions.filter(q => q.ready_for_prod).length})
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Statistics</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.inactive}</Text>
              <Text style={styles.statLabel}>Inactive</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Filters</Text>
        <View style={styles.filterRow}>
          {(['beginner', 'intermediate', 'expert', 'scholar'] as Difficulty[]).map((diff) => (
            <TouchableOpacity
              key={diff}
              style={[
                styles.filterButton,
                filter.difficulty === diff && styles.filterButtonActive,
              ]}
              onPress={() =>
                setFilter((prev) => ({
                  ...prev,
                  difficulty: prev.difficulty === diff ? undefined : diff,
                }))
              }
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter.difficulty === diff && styles.filterButtonTextActive,
                ]}
              >
                {diff}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter.active === true && styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilter((prev) => ({
                ...prev,
                active: prev.active === true ? undefined : true,
              }))
            }
          >
            <Text
              style={[
                styles.filterButtonText,
                filter.active === true && styles.filterButtonTextActive,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter.active === false && styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilter((prev) => ({
                ...prev,
                active: prev.active === false ? undefined : false,
              }))
            }
          >
            <Text
              style={[
                styles.filterButtonText,
                filter.active === false && styles.filterButtonTextActive,
              ]}
            >
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.questionsContainer}>
        <Text style={styles.questionsTitle}>
          Questions ({questions.length})
        </Text>

        {questions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No questions found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters or import questions from CSV
            </Text>
          </View>
        ) : (
          questions.map((question) => (
            <View key={question.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <View style={styles.questionMeta}>
                  <Text style={styles.categoryBadge}>{question.categoryName}</Text>
                  <Text style={styles.difficultyBadge}>{question.difficulty}</Text>
                  {!question.is_active && (
                    <Text style={styles.inactiveBadge}>INACTIVE</Text>
                  )}
                  {question.ready_for_prod && (
                    <Text style={styles.flaggedBadge}>🚀 FLAGGED FOR PROD</Text>
                  )}
                </View>
              </View>

              <Text style={styles.questionText}>{question.question_text}</Text>

              {question.option_a && (
                <View style={styles.optionsContainer}>
                  <Text style={styles.optionLabel}>A:</Text>
                  <Text style={styles.optionText}>{question.option_a}</Text>
                </View>
              )}
              {question.option_b && (
                <View style={styles.optionsContainer}>
                  <Text style={styles.optionLabel}>B:</Text>
                  <Text style={styles.optionText}>{question.option_b}</Text>
                </View>
              )}
              {question.option_c && (
                <View style={styles.optionsContainer}>
                  <Text style={styles.optionLabel}>C:</Text>
                  <Text style={styles.optionText}>{question.option_c}</Text>
                </View>
              )}
              {question.option_d && (
                <View style={styles.optionsContainer}>
                  <Text style={styles.optionLabel}>D:</Text>
                  <Text style={styles.optionText}>{question.option_d}</Text>
                </View>
              )}

              <View style={styles.answerContainer}>
                <Text style={styles.answerLabel}>Correct Answer:</Text>
                <Text style={styles.answerText}>{question.correct_answer}</Text>
              </View>

              {question.bible_reference && (
                <Text style={styles.referenceText}>📖 {question.bible_reference}</Text>
              )}

              {question.explanation && (
                <Text style={styles.explanationText}>{question.explanation}</Text>
              )}

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    question.is_active ? styles.deactivateButton : styles.activateButton,
                  ]}
                  onPress={() => handleToggleActive(question.id, question.is_active || false)}
                >
                  <Text style={styles.actionButtonText}>
                    {question.is_active ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.reviewButton]}
                  onPress={() => handleReview(question.id)}
                >
                  <Text style={styles.actionButtonText}>👁️ Review</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEdit(question.id)}
                >
                  <Text style={styles.actionButtonText}>✏️ Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton, 
                    question.ready_for_prod ? styles.unflagButton : styles.flagButton
                  ]}
                  onPress={() => question.ready_for_prod 
                    ? handleUnflag(question.id) 
                    : handleFlagForProd(question.id)
                  }
                >
                  <Text style={styles.actionButtonText}>
                    {question.ready_for_prod ? '🚫 Unflag' : '🚀 Flag for Prod'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.migrateButton]}
                  onPress={() => handleMigrateToProd(question.id)}
                >
                  <Text style={styles.actionButtonText}>Migrate Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(question.id)}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Edit Question Modal - Only show in development mode */}
      {isDevelopment && (
        <EditQuestionModal
          visible={!!editingQuestion}
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={handleEditSave}
        />
      )}
    </ScrollView>
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
    paddingBottom: 40,
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 100,
    padding: 24,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  questionsContainer: {
    padding: 16,
  },
  questionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionHeader: {
    marginBottom: 12,
  },
  questionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#4A90E2',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  difficultyBadge: {
    backgroundColor: '#FFA500',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  inactiveBadge: {
    backgroundColor: '#999',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  flaggedBadge: {
    backgroundColor: '#28a745',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 24,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  answerContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  referenceText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activateButton: {
    backgroundColor: '#28A745',
  },
  deactivateButton: {
    backgroundColor: '#FFC107',
  },
  reviewButton: {
    backgroundColor: '#17a2b8',
  },
  editButton: {
    backgroundColor: '#ffc107',
  },
  flagButton: {
    backgroundColor: '#28a745',
  },
  unflagButton: {
    backgroundColor: '#6c757d',
  },
  migrateButton: {
    backgroundColor: '#4A90E2',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
  },
  batchMigrateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  batchMigrateButtonDisabled: {
    opacity: 0.6,
  },
  batchMigrateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});



