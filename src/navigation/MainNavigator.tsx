import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TestScreen from '../screens/TestScreen';

export type MainStackParamList = {
  Home: undefined;
  // Add more screens here as you build them
  // Categories: undefined;
  // Quiz: { categoryId: string };
  // Results: { score: number };
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
        component={TestScreen}
        options={{ title: 'Bible Trivia' }}
      />
      {/* Add more screens here */}
    </Stack.Navigator>
  );
}
