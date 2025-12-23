import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { AreaFormScreen } from '@/screens/AreaFormScreen';
import { AreaListScreen } from '@/screens/AreaListScreen';

import { AreasStackParamList } from './types';

const AreasStack = createNativeStackNavigator<AreasStackParamList>();

export function AreasNavigator() {
  return (
    <AreasStack.Navigator>
      <AreasStack.Screen
        name="AreaList"
        component={AreaListScreen}
        options={{ headerShown: false }}
      />
      <AreasStack.Screen
        name="AreaForm"
        component={AreaFormScreen}
        options={{ title: 'Area' }}
      />
    </AreasStack.Navigator>
  );
}
