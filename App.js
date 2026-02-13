import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// ВАЖНО: Убедись, что путь ./contexts/ThemeContext правильный!
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { getToken } from './src/services/storage';

// Screens
import HabitsScreen from './src/screens/HabitsScreen';
import TasksScreen from './src/screens/TasksScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import SecretChatScreen from './src/screens/SecretChatScreen';

const Tab = createBottomTabNavigator();

// --- Вкладки с логикой тройного тапа ---
const MainTabs = ({ onLogout, onOpenSecret }) => {
  const { colors } = useTheme();
  
  // Ref для подсчета тапов (чтобы не сбрасывался при ререндере)
  const tapCounter = useRef({ count: 0, lastTime: 0 });

  const handleTabPress = (e) => {
    const now = Date.now();
    // Если между тапами меньше 500 мс, считаем их
    if (now - tapCounter.current.lastTime < 500) {
      tapCounter.current.count += 1;
    } else {
      tapCounter.current.count = 1;
    }
    tapCounter.current.lastTime = now;

    // Если 3 тапа подряд
    if (tapCounter.current.count >= 3) {
      e.preventDefault(); // Отменяем переход в профиль
      tapCounter.current.count = 0; // Сброс
      onOpenSecret(); // Открываем секретку
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
          tabPress: handleTabPress, // Вешаем обработчик на нажатие вкладки
        }}
        options={{ tabBarLabel: 'ПРОФИЛЬ', tabBarIcon: () => null }}
      />
    </Tab.Navigator>
  );
};

// --- Внутренний контент приложения ---
const AppContent = () => {
  const { colors } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login'); 

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        setIsAuthenticated(true);
        setCurrentScreen('main');
      } else {
        setIsAuthenticated(false);
        setCurrentScreen('login');
      }
    } catch(e) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  // 1. Секретный чат
  if (currentScreen === 'secret') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
         <SecretChatScreen onExit={() => setCurrentScreen('main')} />
      </SafeAreaView>
    );
  }

  // 2. Авторизация
  if (!isAuthenticated) {
    if (currentScreen === 'register') {
      return <RegisterScreen onNavigate={setCurrentScreen} onLoginSuccess={() => { setIsAuthenticated(true); setCurrentScreen('main'); }} />;
    }
    if (currentScreen === 'forgot-password') {
      return <ForgotPasswordScreen onNavigate={setCurrentScreen} />;
    }
    // Login
    return <LoginScreen onNavigate={setCurrentScreen} onLoginSuccess={() => { setIsAuthenticated(true); setCurrentScreen('main'); }} />;
  }

  // 3. Главный экран
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

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
