/* eslint-disable import/no-duplicates */
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
// eslint-disable-next-line import/no-duplicates
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingOverlay } from '@/components';
import { initializeDatabase } from '@/db';
import { AppNavigator } from '@/navigation';
import { AuthProvider } from '@/services/auth/AuthContext';
import { colors } from '@/theme';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        await initializeDatabase();
      } finally {
        setDbReady(true);
      }
    };

    prepare();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={colors.background} />
        {dbReady ? (
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        ) : (
          <LoadingOverlay visible message="Preparando banco..." />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
