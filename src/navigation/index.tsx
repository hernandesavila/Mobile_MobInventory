import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { enableScreens } from 'react-native-screens';

import {
  BackupRestoreScreen,
  DashboardScreen,
  LoginScreen,
  SettingsScreen,
  RegisterUserScreen,
  ForgotPasswordScreen,
  CollectorConfigScreen,
  CollectorConnectScreen,
  CollectorActionScreen,
  CollectorScanScreen,
  MasterReceiveScreen,
  MasterBatchListScreen,
  MasterBatchDetailScreen,
} from '@/screens';
import { useAuth } from '@/services/auth/AuthContext';
import { colors } from '@/theme';

import { AreasNavigator } from './areasNavigator';
import { AssetsNavigator } from './assetsNavigator';
import { InventoriesNavigator } from './inventoriesNavigator';
import { AppTabsParamList, AuthStackParamList, RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tabs = createBottomTabNavigator<AppTabsParamList>();

enableScreens();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.primary,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

function AuthNavigator() {
  const { hasUsers } = useAuth();

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      {!hasUsers ? (
        <AuthStack.Screen name="Register" component={RegisterUserScreen} />
      ) : (
        <>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <AuthStack.Screen name="CollectorConfig" component={CollectorConfigScreen} />
          <AuthStack.Screen name="CollectorConnect" component={CollectorConnectScreen} />
          <AuthStack.Screen name="CollectorAction" component={CollectorActionScreen} />
          <AuthStack.Screen name="CollectorScan" component={CollectorScanScreen} />
        </>
      )}
    </AuthStack.Navigator>
  );
}

function AppTabs() {
  const iconForRoute = (routeName: keyof AppTabsParamList, focused: boolean) => {
    const icons: Record<keyof AppTabsParamList, [string, string]> = {
      Dashboard: ['speedometer-outline', 'speedometer'],
      Areas: ['grid-outline', 'grid'],
      Patrimonio: ['albums-outline', 'albums'],
      Inventario: ['clipboard-outline', 'clipboard'],
      BackupRestore: ['cloud-upload-outline', 'cloud-upload'],
      Settings: ['settings-outline', 'settings'],
    };

    const [outline, filled] = icons[routeName];
    return focused ? filled : outline;
  };

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={iconForRoute(route.name as keyof AppTabsParamList, focused) as never}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tabs.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tabs.Screen name="Areas" component={AreasNavigator} options={{ title: 'Areas' }} />
      <Tabs.Screen
        name="Patrimonio"
        component={AssetsNavigator}
        options={{ title: 'Patrimonio' }}
      />
      <Tabs.Screen
        name="Inventario"
        component={InventoriesNavigator}
        options={{ title: 'Inventario' }}
      />
      <Tabs.Screen
        name="BackupRestore"
        component={BackupRestoreScreen}
        options={{ title: 'Backup/Restore' }}
      />
      <Tabs.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Configuracoes' }}
      />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <RootStack.Screen name="App" component={AppTabs} />
            <RootStack.Screen
              name="MasterReceive"
              component={MasterReceiveScreen}
              options={{ headerShown: true, title: 'Receber Coletas' }}
            />
            <RootStack.Screen
              name="MasterBatchList"
              component={MasterBatchListScreen}
              options={{ headerShown: true, title: 'Inbox de Coletas' }}
            />
            <RootStack.Screen
              name="MasterBatchDetail"
              component={MasterBatchDetailScreen}
              options={{ headerShown: true, title: 'Detalhes do Lote' }}
            />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
