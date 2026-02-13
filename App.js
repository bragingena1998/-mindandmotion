import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, Text, View, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { getToken } from './services/storage';

// Screens
import HabitsScreen from './screens/HabitsScreen';
import TasksScreen from './screens/TasksScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import SecretChatScreen from './screens/SecretChatScreen';

const Tab = createBottomTabNavigator();

// --- КОМПОНЕНТ ВКЛАДОК (С ЛОГИКОЙ ТРОЙНОГО ТАПА) ---
const MainTabs = ({ onLogout, onOpenSecret }) => {
  const { colors } = useTheme();
  
  // Ref для хранения времени последнего тапа, чтобы не сбрасывалось при рендере
  const tapState = useRef({ count: 0, lastTime: 0 });

  const handleProfilePress = (e) => {
    const now = Date.now();
    // Если прошло меньше 500мс
    if (now - tapState.current.lastTime < 500) {
      tapState.current.count += 1;
    } else {
      tapState.current.count = 1;
    }
    tapState.current.lastTime = now;

    console.log('Tap count:', tapState.current.count); // Debug

    if (tapState.current.count >= 3) {
      e.preventDefault(); // Отменяем переход
      tapState.current.count = 0;
      onOpenSecret(); // Открываем секрет
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          height: 60,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.accent1,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold', marginBottom: 15 }
      }}
    >
      <Tab.Screen 
        name="Tasks" 
        component={TasksScreen}
        options={{ tabBarLabel: 'ЗАДАЧИ', tabBarIcon: () => null }}
      />
      <Tab.Screen 
        name="Habits" 
        component={HabitsScreen}
        options={{ tabBarLabel: 'ПРИВЫЧКИ', tabBarIcon: () => null }}
      />
      <Tab.Screen 
        name="Profile"
        children={() => <ProfileScreen onLogout={onLogout} />}
        listeners={{
          tabPress: handleProfilePress, // Вешаем обработчик
        }}
        options={{ tabBarLabel: 'ПРОФИЛЬ', tabBarIcon: () => null }}
      />
    </Tab.Navigator>
  );
};

// --- ВНУТРЕННИЙ КОНТЕНТ (ЧТОБЫ РАБОТАЛ useTheme) ---
const AppContent = () => {
  const { colors } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login'); // login, register, forgot, main, secret

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await getToken();
    if (token) {
      setIsAuthenticated(true);
      setCurrentScreen('main');
    } else {
      setIsAuthenticated(false);
      setCurrentScreen('login');
    }
    setLoading(false);
  };

  if (loading) return null;

  // 1. Секретный чат (поверх всего)
  if (currentScreen === 'secret') {
    return <SecretChatScreen onExit={() => setCurrentScreen('main')} />;
  }

  // 2. Экраны авторизации
  if (!isAuthenticated) {
    if (currentScreen === 'register') {
      return <RegisterScreen onNavigate={setCurrentScreen} onLoginSuccess={() => { setIsAuthenticated(true); setCurrentScreen('main'); }} />;
    }
    if (currentScreen === 'forgot-password') {
      return <ForgotPasswordScreen onNavigate={setCurrentScreen} />;
    }
    return <LoginScreen onNavigate={setCurrentScreen} onLoginSuccess={() => { setIsAuthenticated(true); setCurrentScreen('main'); }} />;
  }

  // 3. Главное приложение (Табы)
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <NavigationContainer>
         <MainTabs 
            onLogout={() => { setIsAuthenticated(false); setCurrentScreen('login'); }} 
            onOpenSecret={() => setCurrentScreen('secret')}
         />
      </NavigationContainer>
    </SafeAreaView>
  );
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
