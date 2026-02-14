import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons'; 

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

const MainTabs = ({ onLogout, onOpenSecret }) => {
  const { colors } = useTheme();
  const tapCounter = useRef({ count: 0, lastTime: 0 });

  const handleTabPress = (e) => {
    const now = Date.now();
    if (now - tapCounter.current.lastTime < 500) {
      tapCounter.current.count += 1;
    } else {
      tapCounter.current.count = 1;
    }
    tapCounter.current.lastTime = now;

    if (tapCounter.current.count >= 3) {
      e.preventDefault();
      tapCounter.current.count = 0;
      onOpenSecret();
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f0f11', 
          borderTopWidth: 1,
          borderTopColor: '#333',
          height: 60,
          paddingTop: 10,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.accent1,
        tabBarInactiveTintColor: '#555',
        tabBarShowLabel: false,
        
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Tasks') iconName = 'check-square';
          else if (route.name === 'Habits') iconName = 'zap';
          else if (route.name === 'Profile') iconName = 'user';

          // УБРАЛ КВАДРАТНУЮ ТЕНЬ КОНТЕЙНЕРА
          // ТЕПЕРЬ ПРОСТО ИКОНКА БЕЗ ФОНА
          return (
             <Feather 
               name={iconName} 
               size={28} 
               color={color} 
               // Добавляем свечение самой иконке (для веба работает как textShadow)
               style={focused ? {
                 textShadowColor: colors.accent1,
                 textShadowRadius: 10,
               } : {}}
             />
          );
        },
      })}
    >
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Habits" component={HabitsScreen} />
      <Tab.Screen 
        name="Profile"
        children={() => <ProfileScreen onLogout={onLogout} />}
        listeners={{ tabPress: handleTabPress }}
      />
    </Tab.Navigator>
  );
};

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

  if (currentScreen === 'secret') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
         <SecretChatScreen onExit={() => setCurrentScreen('main')} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    if (currentScreen === 'register') return <RegisterScreen onNavigate={setCurrentScreen} onLoginSuccess={() => { setIsAuthenticated(true); setCurrentScreen('main'); }} />;
    if (currentScreen === 'forgot-password') return <ForgotPasswordScreen onNavigate={setCurrentScreen} />;
    return <LoginScreen onNavigate={setCurrentScreen} onLoginSuccess={() => { setIsAuthenticated(true); setCurrentScreen('main'); }} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <NavigationContainer>
         <MainTabs onLogout={() => { setIsAuthenticated(false); setCurrentScreen('login'); }} onOpenSecret={() => setCurrentScreen('secret')} />
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
