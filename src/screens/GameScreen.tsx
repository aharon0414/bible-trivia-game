import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/MainNavigator';
import { questionService } from '../services/question.service';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { migrationService } from '../services/migration.service';
import { questionAdminService } from '../services/question-admin.service';
import { Difficulty, Question } from '../types/database';

type GameScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Game'>;
  route: RouteProp<MainStackParamList, 'Game'>;
};

// Using Question type from database.ts

export default function GameScreen({ navigation, route }: GameScreenProps) {
  const { difficulty } = route.params;
  const { isDevelopment } = useEnvironment();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showDevActions, setShowDevActions] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [actionTaken, setActionTaken] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Timer effect - countdown from 30 seconds
  useEffect(() => {
    if (!timerActive || showResult) return;

    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Time's up - mark as wrong and show result
      handleTimeUp();
    }
  }, [timeRemaining, timerActive, showResult]);

  // Reset timer when question changes
  useEffect(() => {
    if (currentQuestion && !showResult) {
      setTimeRemaining(30);
      setTimerActive(true);
      setActionTaken(false);
    }
  }, [currentQuestionIndex, currentQuestion]);

  const handleTimeUp = () => {
    if (showResult) return; // Already handled
    
    setTimerActive(false);
    setSelectedAnswer(null); // No answer selected
    setShowResult(true);
    
    // Show dev actions in dev mode
    if (isDevelopment) {
      setShowDevActions(true);
    }
    
    // Don't increment score (time ran out = wrong answer)
    // In prod mode, auto-advance after delay
    // In dev mode, require action before proceeding
    if (!isDevelopment) {
      setTimeout(() => {
        proceedToNext();
      }, 1500);
    }
  };

  const getQuestionCount = (difficulty: Difficulty): number => {
    switch (difficulty) {
      case 'beginner':
        return 10;
      case 'intermediate':
        return 15;
      case 'expert':
        return 20;
      case 'scholar':
        return 25;
      default:
        return 10;
    }
  };

  const fetchQuestions = async () => {
    try {
      // Determine number of questions based on difficulty
      const questionCount = getQuestionCount(difficulty);

      // Use environment-aware question service
      const { questions: fetchedQuestions, error } = await questionService.getQuestionsByDifficulty(
        difficulty,
        questionCount
      );

      if (error) {
        console.error('Error fetching questions:', error);
        // Fallback to mock data if database fetch fails
        setQuestions(getMockQuestions(difficulty));
      } else if (fetchedQuestions && fetchedQuestions.length > 0) {
        console.log(`✅ Loaded ${fetchedQuestions.length} questions from database`);
        setQuestions(fetchedQuestions);
      } else {
        console.warn('⚠️ No questions found in database, using mock data');
        // No questions in database, use mock data
        setQuestions(getMockQuestions(difficulty));
      }
    } catch (error) {
      console.error('Error:', error);
      setQuestions(getMockQuestions(difficulty));
    } finally {
      setLoading(false);
    }
  };

  const getMockQuestions = (difficulty: Difficulty): Question[] => {
    // Mock questions for development (using correct field names)
    const mockQuestions: Question[] = [
      {
        id: '1',
        category_id: 'mock-category',
        difficulty: 'beginner',
        question_type: 'multiple_choice',
        question_text: 'Who built the ark?',
        correct_answer: 'Noah',
        option_a: 'Moses',
        option_b: 'Abraham',
        option_c: 'David',
        option_d: null,
        bible_reference: null,
      },
      {
        id: '2',
        category_id: 'mock-category',
        difficulty: 'beginner',
        question_type: 'multiple_choice',
        question_text: 'How many days did God take to create the world?',
        correct_answer: '6',
        option_a: '7',
        option_b: '5',
        option_c: '8',
        option_d: null,
        bible_reference: null,
      },
      {
        id: '3',
        category_id: 'mock-category',
        difficulty: 'beginner',
        question_type: 'multiple_choice',
        question_text: 'Who was the first king of Israel?',
        correct_answer: 'Saul',
        option_a: 'David',
        option_b: 'Solomon',
        option_c: 'Samuel',
        option_d: null,
        bible_reference: null,
      },
      {
        id: '4',
        category_id: 'mock-category',
        difficulty: 'beginner',
        question_type: 'multiple_choice',
        question_text: 'What was the name of the giant David defeated?',
        correct_answer: 'Goliath',
        option_a: 'Samson',
        option_b: 'Og',
        option_c: 'Anak',
        option_d: null,
        bible_reference: null,
      },
      {
        id: '5',
        category_id: 'mock-category',
        difficulty: 'beginner',
        question_type: 'multiple_choice',
        question_text: 'How many disciples did Jesus have?',
        correct_answer: '12',
        option_a: '10',
        option_b: '11',
        option_c: '13',
        option_d: null,
        bible_reference: null,
      },
    ];

    const count = getQuestionCount(difficulty);
    // Repeat questions if we need more
    const result: Question[] = [];
    for (let i = 0; i < count; i++) {
      const baseQuestion = mockQuestions[i % mockQuestions.length];
      result.push({ 
        ...baseQuestion, 
        id: `mock-${i}`,
        difficulty, // Use the actual difficulty level
      });
    }
    return result;
  };

  const currentQuestion = questions[currentQuestionIndex];

  // Memoize shuffled answers to prevent re-shuffling on every render
  const [shuffledAnswers, setShuffledAnswers] = React.useState<string[]>([]);

  // Re-shuffle answers when question changes
  React.useEffect(() => {
    if (!currentQuestion) {
      setShuffledAnswers([]);
      return;
    }

    // Collect all unique answer options
    const allOptions = new Set<string>();
    
    // Add correct answer
    allOptions.add(currentQuestion.correct_answer);
    
    // Add all option fields (filter out null/undefined/empty)
    if (currentQuestion.option_a?.trim()) allOptions.add(currentQuestion.option_a.trim());
    if (currentQuestion.option_b?.trim()) allOptions.add(currentQuestion.option_b.trim());
    if (currentQuestion.option_c?.trim()) allOptions.add(currentQuestion.option_c.trim());
    if (currentQuestion.option_d?.trim()) allOptions.add(currentQuestion.option_d.trim());

    // Convert to array and shuffle
    const answersArray = Array.from(allOptions);
    
    // If we have at least 2 options, shuffle them
    if (answersArray.length >= 2) {
      // Fisher-Yates shuffle for better randomization
      for (let i = answersArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answersArray[i], answersArray[j]] = [answersArray[j], answersArray[i]];
      }
      setShuffledAnswers(answersArray);
    } else {
      // Fallback: just use correct answer if no options available
      setShuffledAnswers([currentQuestion.correct_answer]);
    }
  }, [currentQuestion]);

  const handleAnswerPress = (answer: string) => {
    if (showResult) return; // Prevent multiple selections

    setTimerActive(false); // Stop the timer
    setSelectedAnswer(answer);
    setShowResult(true);
    
    // Show dev actions in dev mode
    if (isDevelopment) {
      setShowDevActions(true);
    }

    if (answer === currentQuestion.correct_answer) {
      setScore(score + 1);
    }

    // Don't auto-advance in dev mode - require action
    // In prod mode, auto-advance after delay
    if (!isDevelopment) {
      setTimeout(() => {
        proceedToNext();
      }, 1500);
    }
  };

  const handleMoveToProd = async () => {
    try {
      const result = await migrationService.flagQuestionForMigration(currentQuestion.id);
      if (result.success) {
        Alert.alert('Success', 'Question flagged for migration to production!');
        setActionTaken(true);
        // Continue to next question
        proceedToNext();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to flag question for migration');
    }
  };

  const handleReview = () => {
    // Navigate to question review screen with current question ID
    navigation.navigate('QuestionReview', { questionId: currentQuestion.id });
    setActionTaken(true);
  };

  const handleEdit = () => {
    // Navigate to review screen where editing can be done
    navigation.navigate('QuestionReview', { questionId: currentQuestion.id, editMode: true });
    setActionTaken(true);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await questionAdminService.deleteDevQuestion(currentQuestion.id);
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                Alert.alert('Success', 'Question deleted');
                setActionTaken(true);
                // Remove from current questions array and proceed
                const updatedQuestions = questions.filter(q => q.id !== currentQuestion.id);
                setQuestions(updatedQuestions);
                proceedToNext();
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete question');
            }
          },
        },
      ]
    );
  };

  const proceedToNext = () => {
    if (isDevelopment && !actionTaken) {
      Alert.alert('Action Required', 'Please take an action (Keep, Review, Edit, or Delete) before proceeding to the next question.');
      return;
    }
    
    setShowResult(false);
    setShowDevActions(false);
    setTimerActive(false);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setTimeRemaining(30);
    } else {
      navigation.navigate('Results', {
        score,
        total: questions.length,
        difficulty,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );
  }

  if (!currentQuestion) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No questions available</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleQuitGame = () => {
    // Show confirmation alert before quitting
    Alert.alert(
      'Quit Game?',
      'Are you sure you want to quit? Your progress will be lost.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: () => navigation.navigate('Home'),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.quitButton}
          onPress={handleQuitGame}
        >
          <Text style={styles.quitButtonText}>✕ Quit</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.questionCounter}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </Text>
          <View style={styles.headerRight}>
            <View style={[styles.timerContainer, timeRemaining <= 5 && styles.timerWarning]}>
              <Text style={styles.timerText}>⏱️ {timeRemaining}s</Text>
            </View>
            <Text style={styles.score}>Score: {score}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
        </View>

        <View style={styles.answersContainer}>
          {shuffledAnswers.map((answer) => {
            const isSelected = selectedAnswer === answer;
            const isCorrect = answer === currentQuestion.correct_answer;
            const showCorrect = showResult && isCorrect;
            const showWrong = showResult && isSelected && !isCorrect;

            return (
              <TouchableOpacity
                key={`${currentQuestion.id}-${answer}`}
                style={[
                  styles.answerButton,
                  showCorrect && styles.correctAnswer,
                  showWrong && styles.wrongAnswer,
                ]}
                onPress={() => handleAnswerPress(answer)}
                disabled={showResult}
              >
                <Text style={[
                  styles.answerText,
                  (showCorrect || showWrong) && styles.answerTextSelected,
                ]}>
                  {answer}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Show scripture reference and explanation after answer */}
        {showResult && (
          <View style={styles.feedbackContainer}>
            {currentQuestion.bible_reference && (
              <View style={styles.referenceContainer}>
                <Text style={styles.referenceLabel}>📖 Scripture Reference:</Text>
                <Text style={styles.referenceText}>{currentQuestion.bible_reference}</Text>
              </View>
            )}
            {currentQuestion.explanation && (
              <View style={styles.explanationContainer}>
                <Text style={styles.explanationLabel}>💡 Explanation:</Text>
                <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
              </View>
            )}
          </View>
        )}

        {/* Dev mode actions */}
        {isDevelopment && showDevActions && (
          <View style={styles.devActionsContainer}>
            <Text style={styles.devActionsTitle}>🔧 Dev Mode Actions</Text>
            <View style={styles.devActionsGrid}>
              <TouchableOpacity
                style={[styles.devActionButton, styles.keepButton]}
                onPress={handleMoveToProd}
              >
                <Text style={styles.devActionText}>✅ Flag for Prod</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.devActionButton, styles.reviewButton]}
                onPress={handleReview}
              >
                <Text style={styles.devActionText}>👁️ Review</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.devActionButton, styles.editButton]}
                onPress={handleEdit}
              >
                <Text style={styles.devActionText}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.devActionButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Text style={styles.devActionText}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !actionTaken && styles.continueButtonDisabled
              ]}
              onPress={proceedToNext}
              disabled={!actionTaken}
            >
              <Text style={styles.continueButtonText}>
                {actionTaken ? 'Continue to Next Question' : '⚠️ Action Required'}
              </Text>
            </TouchableOpacity>
            
            {!actionTaken && (
              <Text style={styles.actionRequiredText}>
                Please take an action above before continuing
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.difficultyBadge}>{difficulty.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quitButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  quitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerWarning: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionCounter: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  score: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  questionContainer: {
    padding: 24,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionText: {
    fontSize: 22,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  answersContainer: {
    padding: 16,
  },
  answerButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  correctAnswer: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  wrongAnswer: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  answerText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  answerTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  difficultyBadge: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  feedbackContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  referenceContainer: {
    marginBottom: 12,
  },
  referenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 4,
  },
  referenceText: {
    fontSize: 16,
    color: '#333',
    fontStyle: 'italic',
  },
  explanationContainer: {
    marginTop: 8,
  },
  explanationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  devActionsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  devActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 12,
    textAlign: 'center',
  },
  devActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  devActionButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  keepButton: {
    backgroundColor: '#28a745',
  },
  reviewButton: {
    backgroundColor: '#17a2b8',
  },
  editButton: {
    backgroundColor: '#ffc107',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  devActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#4A90E2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionRequiredText: {
    color: '#dc3545',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
