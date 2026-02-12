// App.js
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { ThemeProvider } from './src/contexts/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import TasksScreen from './src/screens/TasksScreen';
import HabitsScreen from './src/screens/HabitsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SimpleTabBar from './src/components/SimpleTabBar';
import { getToken } from './src/services/storage'; // Импортируем из storage
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Tasks');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => { // Делаем функцию асинхронной
    try {
      const token = await getToken(); // Используем await
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  // Обертка для контента после ThemeProvider, чтобы использовать тему
  const AppContent = () => {
    if (!isLoggedIn) {
      return (
        <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
      );
    }

    const renderScreen = () => {
      switch (activeTab) {
        case 'Tasks':
          return <TasksScreen />;
        case 'Habits':
          return <HabitsScreen />;
        case 'Profile':
          return <ProfileScreen onLogout={() => setIsLoggedIn(false)} />; // Передаем onLogout
        default:
          return <TasksScreen />;
      }
    };

    return (
      <View style={{ flex: 1, backgroundColor: '#020617' }}> 
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1 }}>
          {renderScreen()}
        </View>
        <SimpleTabBar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      </View>
    );
  };

return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  </GestureHandlerRootView>
);

}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
});
