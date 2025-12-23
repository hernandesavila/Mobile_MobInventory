import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { AssetDetailScreen } from '@/screens/AssetDetailScreen';
import { AssetFormScreen } from '@/screens/AssetFormScreen';
import { AssetListScreen } from '@/screens/AssetListScreen';

import { AssetsStackParamList } from './types';

const AssetsStack = createNativeStackNavigator<AssetsStackParamList>();

export function AssetsNavigator() {
  return (
    <AssetsStack.Navigator>
      <AssetsStack.Screen
        name="AssetList"
        component={AssetListScreen}
        options={{ headerShown: false }}
      />
      <AssetsStack.Screen
        name="AssetDetail"
        component={AssetDetailScreen}
        options={{ title: 'Patrimonio' }}
      />
      <AssetsStack.Screen
        name="AssetForm"
        component={AssetFormScreen}
        options={{ title: 'Patrimonio' }}
      />
    </AssetsStack.Navigator>
  );
}
