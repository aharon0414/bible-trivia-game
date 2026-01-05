import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { questionAdminService, QuestionImportData } from '../services/question-admin.service';
import type { Question, Difficulty, Category } from '../types/database';

interface EditQuestionModalProps {
  visible: boolean;
  question: Question | null;
  onClose: () => void;
  onSave: () => void;
}

export default function EditQuestionModal({
  visible,
  question,
  onClose,
  onSave,
}: EditQuestionModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [categoryId, setCategoryId] = useState<string>('');
  const [bibleReference, setBibleReference] = useState('');
  const [explanation, setExplanation] = useState('');

  const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'expert', 'scholar'];

  // Load categories on mount
  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  // Populate form when question changes
  useEffect(() => {
    if (question && visible) {
      setQuestionText(question.question_text || '');
      setOptionA(question.option_a || '');
      setOptionB(question.option_b || '');
      setOptionC(question.option_c || '');
      setOptionD(question.option_d || '');
      
      // Determine correct answer letter
      const correct = question.correct_answer || '';
      if (question.option_a && correct === question.option_a) {
        setCorrectAnswer('A');
      } else if (question.option_b && correct === question.option_b) {
        setCorrectAnswer('B');
      } else if (question.option_c && correct === question.option_c) {
        setCorrectAnswer('C');
      } else if (question.option_d && correct === question.option_d) {
        setCorrectAnswer('D');
      } else {
        setCorrectAnswer('A');
      }
      
      setDifficulty(question.difficulty);
      setCategoryId(question.category_id);
      setBibleReference(question.bible_reference || '');
      setExplanation(question.explanation || '');
      setError(null);
      setSuccessMessage(null);
      setValidationErrors({});
    }
  }, [question, visible]);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const { categories: cats, error: catsError } = await questionAdminService.getCategories();
      if (catsError) {
        setError(`Failed to load categories: ${catsError.message}`);
      } else {
        setCategories(cats);
        if (question && !categoryId && cats.length > 0) {
          setCategoryId(question.category_id || cats[0].id);
        }
      }
    } catch (err: any) {
      setError(`Error loading categories: ${err.message}`);
    } finally {
      setLoadingCategories(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Question text validation
    if (!questionText.trim() || questionText.trim().length < 10) {
      errors.questionText = 'Question text must be at least 10 characters';
    }

    // At least 2 answer options required
    const options = [optionA, optionB, optionC, optionD].filter(opt => opt.trim().length > 0);
    if (options.length < 2) {
      errors.options = 'At least 2 answer options are required';
    }

    // Correct answer must be one of the provided options
    const selectedOption = correctAnswer === 'A' ? optionA : 
                          correctAnswer === 'B' ? optionB :
                          correctAnswer === 'C' ? optionC : optionD;
    if (!selectedOption || !selectedOption.trim()) {
      errors.correctAnswer = 'Correct answer must be one of the provided options';
    }

    // Category required
    if (!categoryId) {
      errors.category = 'Category is required';
    }

    // Difficulty required (should always have a value, but check anyway)
    if (!difficulty) {
      errors.difficulty = 'Difficulty is required';
    }

    setValidationErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    console.log('[EditQuestionModal] Validation result:', { isValid, errors });
    return isValid;
  };

  const getAvailableOptions = (): Array<{ label: string; value: 'A' | 'B' | 'C' | 'D' }> => {
    const options: Array<{ label: string; value: 'A' | 'B' | 'C' | 'D' }> = [];
    if (optionA.trim()) options.push({ label: `A: ${optionA}`, value: 'A' });
    if (optionB.trim()) options.push({ label: `B: ${optionB}`, value: 'B' });
    if (optionC.trim()) options.push({ label: `C: ${optionC}`, value: 'C' });
    if (optionD.trim()) options.push({ label: `D: ${optionD}`, value: 'D' });
    return options;
  };

  const handleSave = async () => {
    console.log('[EditQuestionModal] handleSave called');
    
    if (!question) {
      console.error('[EditQuestionModal] No question provided');
      setError('No question to save');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setValidationErrors({});

    console.log('[EditQuestionModal] Validating form...');
    if (!validateForm()) {
      console.error('[EditQuestionModal] Validation failed:', validationErrors);
      return;
    }

    console.log('[EditQuestionModal] Validation passed, starting save...');
    setLoading(true);

    try {
      const selectedCategory = categories.find(c => c.id === categoryId);
      if (!selectedCategory) {
        console.error('[EditQuestionModal] Category not found:', categoryId);
        setError('Selected category not found');
        setLoading(false);
        return;
      }

      const selectedOptionValue = correctAnswer === 'A' ? optionA.trim() :
                                 correctAnswer === 'B' ? optionB.trim() :
                                 correctAnswer === 'C' ? optionC.trim() : optionD.trim();

      const updateData: Partial<QuestionImportData> = {
        categoryName: selectedCategory.name,
        difficulty,
        questionText: questionText.trim(),
        correctAnswer: selectedOptionValue,
        optionA: optionA.trim() || null,
        optionB: optionB.trim() || null,
        optionC: optionC.trim() || null,
        optionD: optionD.trim() || null,
        bibleReference: bibleReference.trim() || null,
        explanation: explanation.trim() || null,
      };

      console.log('[EditQuestionModal] Calling updateDevQuestion with:', {
        questionId: question.id,
        updateData,
      });

      const { question: updatedQuestion, error: updateError } = await questionAdminService.updateDevQuestion(
        question.id,
        updateData
      );

      if (updateError) {
        console.error('[EditQuestionModal] Save failed:', updateError);
        setError(`Failed to save: ${updateError.message}`);
        setLoading(false);
        return;
      }

      console.log('[EditQuestionModal] Save successful!');
      
      // Success - show success message in modal, then close and refresh
      setLoading(false);
      setError(null);
      setSuccessMessage('Question updated successfully!');
      console.log('[EditQuestionModal] Success message set, will close in 1.5s');
      
      // Close modal and refresh after showing success message
      setTimeout(() => {
        console.log('[EditQuestionModal] Closing modal and refreshing...');
        onSave(); // Refresh the question list
        onClose(); // Close the modal
        // Also show native alert for additional feedback
        setTimeout(() => {
          Alert.alert('Success', 'Question updated successfully!');
        }, 100);
      }, 1500); // Show success message for 1.5 seconds
    } catch (err: any) {
      console.error('[EditQuestionModal] Exception in handleSave:', err);
      setError(`Error saving question: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const availableOptions = getAvailableOptions();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Question</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {Object.keys(validationErrors).length > 0 && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  Please fix the following errors:
                </Text>
                {Object.values(validationErrors).map((err, idx) => (
                  <Text key={idx} style={styles.errorText}>
                    • {err}
                  </Text>
                ))}
              </View>
            )}

            {successMessage && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>✓ {successMessage}</Text>
              </View>
            )}

            {/* Question Text */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Question Text *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.multilineInput,
                  validationErrors.questionText && styles.inputError,
                ]}
                value={questionText}
                onChangeText={setQuestionText}
                placeholder="Enter question text (min 10 characters)"
                multiline
                numberOfLines={4}
                editable={!loading}
              />
              {validationErrors.questionText && (
                <Text style={styles.errorMessage}>{validationErrors.questionText}</Text>
              )}
            </View>

            {/* Answer Options */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Answer Options *</Text>
              
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>A:</Text>
                <TextInput
                  style={[styles.optionInput, validationErrors.options && styles.inputError]}
                  value={optionA}
                  onChangeText={setOptionA}
                  placeholder="Option A"
                  editable={!loading}
                />
              </View>

              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>B:</Text>
                <TextInput
                  style={[styles.optionInput, validationErrors.options && styles.inputError]}
                  value={optionB}
                  onChangeText={setOptionB}
                  placeholder="Option B"
                  editable={!loading}
                />
              </View>

              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>C:</Text>
                <TextInput
                  style={styles.optionInput}
                  value={optionC}
                  onChangeText={setOptionC}
                  placeholder="Option C (optional)"
                  editable={!loading}
                />
              </View>

              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>D:</Text>
                <TextInput
                  style={styles.optionInput}
                  value={optionD}
                  onChangeText={setOptionD}
                  placeholder="Option D (optional)"
                  editable={!loading}
                />
              </View>

              {validationErrors.options && (
                <Text style={styles.errorMessage}>{validationErrors.options}</Text>
              )}
            </View>

            {/* Correct Answer */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Correct Answer *</Text>
              {availableOptions.length > 0 ? (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={correctAnswer}
                    onValueChange={(value) => setCorrectAnswer(value)}
                    enabled={!loading}
                    style={styles.picker}
                  >
                    {availableOptions.map((opt) => (
                      <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <Text style={styles.helperText}>Add at least 2 options above</Text>
              )}
              {validationErrors.correctAnswer && (
                <Text style={styles.errorMessage}>{validationErrors.correctAnswer}</Text>
              )}
            </View>

            {/* Difficulty */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Difficulty *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={difficulty}
                  onValueChange={(value) => setDifficulty(value)}
                  enabled={!loading}
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
              {validationErrors.difficulty && (
                <Text style={styles.errorMessage}>{validationErrors.difficulty}</Text>
              )}
            </View>

            {/* Category */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category *</Text>
              {loadingCategories ? (
                <ActivityIndicator size="small" color="#4A90E2" />
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={categoryId}
                    onValueChange={(value) => setCategoryId(value)}
                    enabled={!loading}
                    style={styles.picker}
                  >
                    {categories.map((cat) => (
                      <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                    ))}
                  </Picker>
                </View>
              )}
              {validationErrors.category && (
                <Text style={styles.errorMessage}>{validationErrors.category}</Text>
              )}
            </View>

            {/* Scripture Reference */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Scripture Reference</Text>
              <TextInput
                style={styles.textInput}
                value={bibleReference}
                onChangeText={setBibleReference}
                placeholder="e.g., John 3:16"
                editable={!loading}
              />
            </View>

            {/* Explanation */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Explanation</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={explanation}
                onChangeText={setExplanation}
                placeholder="Optional explanation for the answer"
                multiline
                numberOfLines={4}
                editable={!loading}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
    maxHeight: '70%',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  successText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#C62828',
    borderWidth: 2,
  },
  errorMessage: {
    color: '#C62828',
    fontSize: 12,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    width: 24,
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

