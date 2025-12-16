import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { MainStackParamList } from '../navigation/MainNavigator';
import { questionAdminService, QuestionImportData } from '../services/question-admin.service';
import { useEnvironment } from '../contexts/EnvironmentContext';
import type { Difficulty, QuestionType, Category, Question } from '../types/database';

type QuestionEditScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'QuestionEdit'>;
  route: RouteProp<MainStackParamList, 'QuestionEdit'>;
};

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'expert', 'scholar'];
const QUESTION_TYPES: QuestionType[] = ['multiple_choice', 'true_false', 'fill_blank'];

export default function QuestionEditScreen({ navigation, route }: QuestionEditScreenProps) {
  const { questionId } = route.params;
  const { isDevelopment } = useEnvironment();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);

  // Form state
  const [categoryName, setCategoryName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice');
  const [questionText, setQuestionText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [bibleReference, setBibleReference] = useState('');
  const [explanation, setExplanation] = useState('');
  const [teachingNotes, setTeachingNotes] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load categories
      const { categories: cats, error: catsError } = await questionAdminService.getCategories();
      if (catsError) {
        Alert.alert('Error', `Failed to load categories: ${catsError.message}`);
        return;
      }
      setCategories(cats);

      // Load question
      const { question: loadedQuestion, error: qError } =
        await questionAdminService.getDevQuestionById(questionId);

      if (qError || !loadedQuestion) {
        Alert.alert('Error', `Failed to load question: ${qError?.message || 'Question not found'}`);
        navigation.goBack();
        return;
      }

      setQuestion(loadedQuestion);

      // Get category name
      const category = cats.find(c => c.id === loadedQuestion.category_id);

      // Populate form
      setCategoryName(category?.name || cats[0]?.name || '');
      setDifficulty(loadedQuestion.difficulty);
      setQuestionType(loadedQuestion.question_type);
      setQuestionText(loadedQuestion.question_text);
      setCorrectAnswer(loadedQuestion.correct_answer);
      setOptionA(loadedQuestion.option_a || '');
      setOptionB(loadedQuestion.option_b || '');
      setOptionC(loadedQuestion.option_c || '');
      setOptionD(loadedQuestion.option_d || '');
      setBibleReference(loadedQuestion.bible_reference || '');
      setExplanation(loadedQuestion.explanation || '');
      setTeachingNotes(loadedQuestion.teaching_notes || '');
      setTags(loadedQuestion.tags ? loadedQuestion.tags.join(', ') : '');
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!question) return;

    const questionData: QuestionImportData = {
      categoryName,
      difficulty,
      questionType,
      questionText: questionText.trim(),
      correctAnswer: correctAnswer.trim(),
      optionA: optionA.trim() || null,
      optionB: optionB.trim() || null,
      optionC: optionC.trim() || null,
      optionD: optionD.trim() || null,
      bibleReference: bibleReference.trim() || null,
      explanation: explanation.trim() || null,
      teachingNotes: teachingNotes.trim() || null,
      tags: tags.trim() ? tags.split(',').map((t) => t.trim()) : null,
    };

    // Validate
    const validation = questionAdminService.validateQuestionData(questionData);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    setSaving(true);

    try {
      const { error } = await questionAdminService.updateDevQuestion(
        questionId,
        questionData
      );

      if (error) {
        Alert.alert('Error', `Failed to update question: ${error.message}`);
        return;
      }

      Alert.alert(
        'Success!',
        'Question updated successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    const preview = `
Question: ${questionText}

Type: ${questionType}
Difficulty: ${difficulty}
Category: ${categoryName}

${questionType === 'multiple_choice' ? `Options:
A) ${optionA}
B) ${optionB}
C) ${optionC}
D) ${optionD}
` : ''}
Correct Answer: ${correctAnswer}

${bibleReference ? `Reference: ${bibleReference}\n` : ''}
${explanation ? `Explanation: ${explanation}\n` : ''}
${teachingNotes ? `Teaching Notes: ${teachingNotes}\n` : ''}
${tags ? `Tags: ${tags}` : ''}
    `.trim();

    Alert.alert('Question Preview', preview, [{ text: 'OK' }]);
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
        <Text style={styles.loadingText}>Loading question...</Text>
      </View>
    );
  }

  if (!question) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Question not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Question</Text>
          <Text style={styles.subtitle}>Update question in dev environment</Text>
          <Text style={styles.idText}>ID: {questionId}</Text>
        </View>

        {/* Category */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={categoryName}
              onValueChange={(value) => setCategoryName(value)}
              style={styles.picker}
            >
              {categories.map((cat) => (
                <Picker.Item key={cat.id} label={cat.name} value={cat.name} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Difficulty *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={difficulty}
              onValueChange={(value) => setDifficulty(value as Difficulty)}
              style={styles.picker}
            >
              {DIFFICULTIES.map((diff) => (
                <Picker.Item
                  key={diff}
                  label={diff.charAt(0).toUpperCase() + diff.slice(1)}
                  value={diff}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Question Type */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Question Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={questionType}
              onValueChange={(value) => setQuestionType(value as QuestionType)}
              style={styles.picker}
            >
              <Picker.Item label="Multiple Choice" value="multiple_choice" />
              <Picker.Item label="True/False" value="true_false" />
              <Picker.Item label="Fill in the Blank" value="fill_blank" />
            </Picker>
          </View>
        </View>

        {/* Question Text */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Question Text *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={questionText}
            onChangeText={setQuestionText}
            placeholder="Enter the question..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Options (for multiple choice) */}
        {questionType === 'multiple_choice' && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Option A</Text>
              <TextInput
                style={styles.input}
                value={optionA}
                onChangeText={setOptionA}
                placeholder="First option..."
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Option B</Text>
              <TextInput
                style={styles.input}
                value={optionB}
                onChangeText={setOptionB}
                placeholder="Second option..."
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Option C</Text>
              <TextInput
                style={styles.input}
                value={optionC}
                onChangeText={setOptionC}
                placeholder="Third option..."
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Option D</Text>
              <TextInput
                style={styles.input}
                value={optionD}
                onChangeText={setOptionD}
                placeholder="Fourth option..."
              />
            </View>
          </>
        )}

        {/* Correct Answer */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Correct Answer *</Text>
          <TextInput
            style={styles.input}
            value={correctAnswer}
            onChangeText={setCorrectAnswer}
            placeholder="Enter the correct answer..."
          />
          {questionType === 'multiple_choice' && (
            <Text style={styles.helpText}>
              Must match one of the options above exactly
            </Text>
          )}
        </View>

        {/* Bible Reference */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Bible Reference</Text>
          <TextInput
            style={styles.input}
            value={bibleReference}
            onChangeText={setBibleReference}
            placeholder="e.g., John 3:16, Genesis 1:1-3"
          />
          <Text style={styles.helpText}>
            Recommended: Helps users learn Scripture locations
          </Text>
        </View>

        {/* Explanation */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Explanation</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={explanation}
            onChangeText={setExplanation}
            placeholder="Brief explanation (1-2 sentences) shown after answering..."
            multiline
            numberOfLines={3}
          />
          <Text style={styles.helpText}>
            {difficulty === 'scholar' ? 'Required for scholar difficulty' : 'Recommended: Helps users learn'}
          </Text>
        </View>

        {/* Teaching Notes */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Teaching Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={teachingNotes}
            onChangeText={setTeachingNotes}
            placeholder="Deeper theological/historical context, cross-references..."
            multiline
            numberOfLines={4}
          />
          <Text style={styles.helpText}>
            Optional: For study mode and deeper learning
          </Text>
        </View>

        {/* Tags */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tags</Text>
          <TextInput
            style={styles.input}
            value={tags}
            onChangeText={setTags}
            placeholder="e.g., Covenant, Exodus, Moses (comma separated)"
          />
          <Text style={styles.helpText}>
            Optional: Helps with categorization and search
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.previewButton]}
            onPress={handlePreview}
          >
            <Text style={styles.buttonText}>Preview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.updateButton, saving && styles.buttonDisabled]}
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update Question</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FFA500',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  idText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButton: {
    backgroundColor: '#6c757d',
  },
  updateButton: {
    backgroundColor: '#FFA500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
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
