import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import {
  InventoryCompareScreen,
  InventoryFormScreen,
  InventoryListScreen,
  InventoryReadScreen,
  InventoryResolutionScreen,
  InventorySecondReadScreen,
} from '@/screens';
import { colors } from '@/theme';

import { InventoriesStackParamList } from './types';

const Stack = createNativeStackNavigator<InventoriesStackParamList>();

export function InventoriesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="InventoryList"
        component={InventoryListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InventoryForm"
        component={InventoryFormScreen}
        options={{ title: 'Novo inventario' }}
      />
      <Stack.Screen
        name="InventoryRead"
        component={InventoryReadScreen}
        options={{ title: 'Leitura' }}
      />
      <Stack.Screen
        name="InventoryCompare"
        component={InventoryCompareScreen}
        options={{ title: 'Comparativo' }}
      />
      <Stack.Screen
        name="InventorySecondRead"
        component={InventorySecondReadScreen}
        options={{ title: 'Leitura 2' }}
      />
      <Stack.Screen
        name="InventoryResolution"
        component={InventoryResolutionScreen}
        options={{ title: 'Resolucao' }}
      />
    </Stack.Navigator>
  );
}
