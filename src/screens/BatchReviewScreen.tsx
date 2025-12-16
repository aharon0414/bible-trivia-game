import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { MainStackParamList } from '../navigation/MainNavigator';
import { questionAdminService } from '../services/question-admin.service';
import { migrationService } from '../services/migration.service';
import { useEnvironment } from '../contexts/EnvironmentContext';
import type { Question, Difficulty, QuestionType } from '../types/database';

type BatchReviewScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'BatchReview'>;
  route: RouteProp<MainStackParamList, 'BatchReview'>;
};

interface QuestionWithCategory extends Question {
  categoryName: string;
}

const { width } = Dimensions.get('window');

export default function BatchReviewScreen({ navigation, route }: BatchReviewScreenProps) {
  const { isDevelopment } = useEnvironment();
  const [questions, setQuestions] = useState<QuestionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<{
    difficulty?: Difficulty;
    readyForProd?: boolean;
  }>({});

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadQuestions();
  }, [filter]);

  const loadQuestions = async () => {
    try {
      const { questions: devQuestions, error } = await questionAdminService.getDevQuestions({
        difficulty: filter.difficulty,
      });

      if (error) {
        Alert.alert('Error', `Failed to load questions: ${error.message}`);
        return;
      }

      // Apply ready_for_prod filter if set
      let filtered = devQuestions;
      if (filter.readyForProd !== undefined) {
        filtered = devQuestions.filter((q) => {
          const isReady = q.ready_for_prod === true;
          return filter.readyForProd ? !isReady : isReady;
        });
      }

      // Get category names
      const { questionService } = await import('../services/question.service');
      const questionsWithCategories = await Promise.all(
        filtered.map(async (q) => {
          const { category } = await questionService.getCategory(q.category_id);
          return {
            ...q,
            categoryName: category?.name || 'Unknown',
          };
        })
      );

      setQuestions(questionsWithCategories);
      setCurrentIndex(0);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const animateNext = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleApprove = async () => {
    const question = questions[currentIndex];
    if (!question) return;

    const result = await migrationService.flagQuestionForMigration(question.id);
    if (result.success) {
      animateNext(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          Alert.alert('Done!', 'All questions reviewed', [
            { text: 'Reload', onPress: loadQuestions },
          ]);
        }
      });
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleEdit = () => {
    const question = questions[currentIndex];
    if (!question) return;

    navigation.navigate('QuestionEdit', {
      questionId: question.id,
    });
  };

  const handleDelete = async () => {
    const question = questions[currentIndex];
    if (!question) return;

    Alert.alert(
      'Delete Question?',
      'This will permanently delete this question from dev. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await questionAdminService.deleteDevQuestion(question.id);
            if (error) {
              Alert.alert('Error', `Failed to delete: ${error.message}`);
            } else {
              animateNext(() => {
                const newQuestions = questions.filter((_, i) => i !== currentIndex);
                setQuestions(newQuestions);
                if (currentIndex >= newQuestions.length) {
                  setCurrentIndex(Math.max(0, newQuestions.length - 1));
                }
              });
            }
          },
        },
      ]
    );
  };

  const handleSkip = () => {
    if (currentIndex < questions.length - 1) {
      animateNext(() => setCurrentIndex(currentIndex + 1));
    } else {
      Alert.alert('End', 'No more questions to review', [
        { text: 'Start Over', onPress: () => setCurrentIndex(0) },
      ]);
    }
  };

  const handleTestQuestion = () => {
    const question = questions[currentIndex];
    if (!question) return;

    // Show a mini quiz interface
    Alert.alert(
      'Test Question',
      question.question_text,
      question.question_type === 'multiple_choice'
        ? [
            {
              text: `A: ${question.option_a}`,
              onPress: () =>
                Alert.alert(
                  question.correct_answer === question.option_a ? 'Correct!' : 'Wrong',
                  `Correct answer: ${question.correct_answer}`
                ),
            },
            {
              text: `B: ${question.option_b}`,
              onPress: () =>
                Alert.alert(
                  question.correct_answer === question.option_b ? 'Correct!' : 'Wrong',
                  `Correct answer: ${question.correct_answer}`
                ),
            },
            {
              text: `C: ${question.option_c}`,
              onPress: () =>
                Alert.alert(
                  question.correct_answer === question.option_c ? 'Correct!' : 'Wrong',
                  `Correct answer: ${question.correct_answer}`
                ),
            },
            {
              text: `D: ${question.option_d}`,
              onPress: () =>
                Alert.alert(
                  question.correct_answer === question.option_d ? 'Correct!' : 'Wrong',
                  `Correct answer: ${question.correct_answer}`
                ),
            },
          ]
        : [
            { text: 'True', onPress: () => Alert.alert('', `Correct answer: ${question.correct_answer}`) },
            { text: 'False', onPress: () => Alert.alert('', `Correct answer: ${question.correct_answer}`) },
          ]
    );
  };

  if (!isDevelopment) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          This screen is only available in development mode.
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

  const currentQuestion = questions[currentIndex];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Batch Review</Text>
        <Text style={styles.progress}>
          {questions.length > 0 ? `${currentIndex + 1} of ${questions.length}` : 'No questions'}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Difficulty:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filter.difficulty || 'all'}
              onValueChange={(value) =>
                setFilter({
                  ...filter,
                  difficulty: value === 'all' ? undefined : (value as Difficulty),
                })
              }
              style={styles.picker}
            >
              <Picker.Item label="All" value="all" />
              <Picker.Item label="Beginner" value="beginner" />
              <Picker.Item label="Intermediate" value="intermediate" />
              <Picker.Item label="Expert" value="expert" />
              <Picker.Item label="Scholar" value="scholar" />
            </Picker>
          </View>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={
                filter.readyForProd === undefined
                  ? 'all'
                  : filter.readyForProd
                  ? 'flagged'
                  : 'unflagged'
              }
              onValueChange={(value) =>
                setFilter({
                  ...filter,
                  readyForProd:
                    value === 'all' ? undefined : value === 'unflagged' ? false : true,
                })
              }
              style={styles.picker}
            >
              <Picker.Item label="All" value="all" />
              <Picker.Item label="Unflagged" value="unflagged" />
              <Picker.Item label="Flagged" value="flagged" />
            </Picker>
          </View>
        </View>
      </View>

      {/* Question Card */}
      {questions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No questions to review</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
        </View>
      ) : currentQuestion ? (
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <ScrollView style={styles.card} contentContainerStyle={styles.cardContent}>
            {/* Badges */}
            <View style={styles.badges}>
              <Text style={styles.categoryBadge}>{currentQuestion.categoryName}</Text>
              <Text style={styles.difficultyBadge}>{currentQuestion.difficulty}</Text>
              <Text style={styles.typeBadge}>{currentQuestion.question_type}</Text>
              {currentQuestion.ready_for_prod && (
                <Text style={styles.flaggedBadge}>FLAGGED</Text>
              )}
            </View>

            {/* Question */}
            <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

            {/* Options */}
            {currentQuestion.question_type === 'multiple_choice' && (
              <View style={styles.optionsContainer}>
                {currentQuestion.option_a && (
                  <Text style={styles.option}>A) {currentQuestion.option_a}</Text>
                )}
                {currentQuestion.option_b && (
                  <Text style={styles.option}>B) {currentQuestion.option_b}</Text>
                )}
                {currentQuestion.option_c && (
                  <Text style={styles.option}>C) {currentQuestion.option_c}</Text>
                )}
                {currentQuestion.option_d && (
                  <Text style={styles.option}>D) {currentQuestion.option_d}</Text>
                )}
              </View>
            )}

            {/* Correct Answer */}
            <View style={styles.answerContainer}>
              <Text style={styles.answerLabel}>Correct Answer:</Text>
              <Text style={styles.answerText}>{currentQuestion.correct_answer}</Text>
            </View>

            {/* Reference */}
            {currentQuestion.bible_reference && (
              <Text style={styles.referenceText}>
                📖 {currentQuestion.bible_reference}
              </Text>
            )}

            {/* Explanation */}
            {currentQuestion.explanation && (
              <View style={styles.explanationContainer}>
                <Text style={styles.explanationLabel}>Explanation:</Text>
                <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
              </View>
            )}

            {/* Teaching Notes */}
            {currentQuestion.teaching_notes && (
              <View style={styles.teachingNotesContainer}>
                <Text style={styles.teachingNotesLabel}>Teaching Notes:</Text>
                <Text style={styles.teachingNotesText}>
                  {currentQuestion.teaching_notes}
                </Text>
              </View>
            )}

            {/* Tags */}
            {currentQuestion.tags && currentQuestion.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                <Text style={styles.tagsLabel}>Tags:</Text>
                <View style={styles.tagsRow}>
                  {currentQuestion.tags.map((tag, index) => (
                    <Text key={index} style={styles.tag}>
                      {tag}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApprove}
            >
              <Text style={styles.actionButtonText}>✅ Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEdit}
            >
              <Text style={styles.actionButtonText}>✏️ Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <Text style={styles.actionButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.skipButton]}
              onPress={handleSkip}
            >
              <Text style={styles.actionButtonText}>⏭️ Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Test Button */}
          <TouchableOpacity style={styles.testButton} onPress={handleTestQuestion}>
            <Text style={styles.testButtonText}>🎯 Test This Question</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
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
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  progress: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 80,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    height: 40,
  },
  cardContainer: {
    flex: 1,
    padding: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardContent: {
    padding: 20,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: '#4A90E2',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  difficultyBadge: {
    backgroundColor: '#FFA500',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  typeBadge: {
    backgroundColor: '#6c757d',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  flaggedBadge: {
    backgroundColor: '#28a745',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    lineHeight: 26,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  option: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
  },
  answerContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
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
    marginBottom: 12,
  },
  explanationContainer: {
    marginBottom: 16,
  },
  explanationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  teachingNotesContainer: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  teachingNotesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  teachingNotesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tagsContainer: {
    marginTop: 8,
  },
  tagsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  editButton: {
    backgroundColor: '#ffc107',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  skipButton: {
    backgroundColor: '#6c757d',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#17a2b8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
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
});
