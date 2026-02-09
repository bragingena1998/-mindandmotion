// App.js
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemeProvider } from './src/contexts/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import TasksScreen from './src/screens/TasksScreen';
import HabitsScreen from './src/screens/HabitsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SimpleTabBar from './src/components/SimpleTabBar';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Tasks');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('app-auth-token');
    setIsLoggedIn(!!token);
    setLoading(false);
  };

  if (loading) {
    return (
      <ThemeProvider>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </ThemeProvider>
    );
  }

  if (!isLoggedIn) {
    return (
      <ThemeProvider>
        <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
      </ThemeProvider>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'Tasks':
        return <TasksScreen />;
      case 'Habits':
        return <HabitsScreen />;
      case 'Profile':
        return <ProfileScreen />;
      default:
        return <TasksScreen />;
    }
  };

  return (
    <ThemeProvider>
      {renderScreen()}
      <SimpleTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </ThemeProvider>
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
