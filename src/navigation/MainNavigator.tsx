import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import DifficultyScreen from '../screens/DifficultyScreen';
import GameScreen from '../screens/GameScreen';
import ResultsScreen from '../screens/ResultsScreen';
import QuestionReviewScreen from '../screens/QuestionReviewScreen';
import QuestionCreateScreen from '../screens/QuestionCreateScreen';
import QuestionEditScreen from '../screens/QuestionEditScreen';
import BatchReviewScreen from '../screens/BatchReviewScreen';
import QuestionStatsScreen from '../screens/QuestionStatsScreen';
import { Difficulty } from '../types/database';

export type MainStackParamList = {
  Home: undefined;
  Difficulty: undefined;
  Game: { difficulty: Difficulty };
  Results: { score: number; total: number; difficulty: Difficulty };
  QuestionReview: { questionId?: string; editMode?: boolean } | undefined;
  QuestionCreate: undefined;
  QuestionEdit: { questionId: string };
  BatchReview: undefined;
  QuestionStats: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4A90E2',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Difficulty"
        component={DifficultyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Game"
        component={GameScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Results"
        component={ResultsScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="QuestionReview"
        component={QuestionReviewScreen}
        options={{
          title: 'Question Review',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="QuestionCreate"
        component={QuestionCreateScreen}
        options={{
          title: 'Create Question',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="QuestionEdit"
        component={QuestionEditScreen}
        options={{
          title: 'Edit Question',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="BatchReview"
        component={BatchReviewScreen}
        options={{
          title: 'Batch Review',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="QuestionStats"
        component={QuestionStatsScreen}
        options={{
          title: 'Question Statistics',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}
