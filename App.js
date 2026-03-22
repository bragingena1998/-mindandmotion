import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, View, TouchableOpacity, AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { DataSyncProvider } from './src/contexts/DataSyncContext';
import { LinearGradient } from 'expo-linear-gradient';
import { getToken } from './src/services/storage';
import { initNotifications, rescheduleRepeatingNotifications } from './src/services/notifications';
import { isAppLockEnabled } from './src/services/appLock';
import BrandedSplash from './src/components/BrandedSplash';
import AppLockScreen from './src/screens/AppLockScreen';

// Screens
import HabitsScreen from './src/screens/HabitsScreen';
import TasksScreen from './src/screens/TasksScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import SecretChatScreen from './src/screens/SecretChatScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DashboardTabLogo from './src/components/DashboardTabLogo';

const Tab = createBottomTabNavigator();

const MainTabs = ({ onLogout, onOpenSecret }) => {
  const { colors } = useTheme();
  const tapCounter = useRef({ count: 0, lastTime: 0 });

  const handleProfileTap = (e) => {
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
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f0f11',
          borderTopWidth: 1,
          borderTopColor: '#333',
          height: 70,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.accent1,
        tabBarInactiveTintColor: '#555',
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, marginBottom: 4 },
        tabBarIcon: ({ color, focused }) => {
          let iconName;
          if (route.name === 'Tasks') iconName = 'check-square';
          else if (route.name === 'Habits') iconName = 'zap';
          else if (route.name === 'Dashboard') iconName = 'triangle';
          else if (route.name === 'Calendar') iconName = 'calendar';
          else if (route.name === 'Profile') iconName = 'user';
          if (route.name === 'Dashboard') return null;
          return (
            <Feather
              name={iconName}
              size={24}
              color={color}
              style={focused ? { textShadowColor: colors.accent1, textShadowRadius: 10 } : {}}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ tabBarLabel: 'Задачи' }} />
      <Tab.Screen name="Habits" component={HabitsScreen} options={{ tabBarLabel: 'Привычки' }} />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Дашборд',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              activeOpacity={0.9}
              style={[props.style, { top: -12, justifyContent: 'center', alignItems: 'center' }]}
            >
              <LinearGradient
                colors={['#FFF8E7', colors.accent1, '#9A7B2E']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  borderWidth: 2,
                  borderColor: colors.accent1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                  shadowColor: colors.accent1,
                  shadowOpacity: 0.45,
                  shadowRadius: 12,
                  elevation: 10,
                }}
              >
                <DashboardTabLogo size={34} />
              </LinearGradient>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarLabel: 'Календарь' }} />
      <Tab.Screen
        name="Profile"
        children={() => <ProfileScreen onLogout={onLogout} />}
        listeners={{ tabPress: handleProfileTap }}
        options={{ tabBarLabel: 'Профиль' }}
      />
    </Tab.Navigator>
  );
};

const AppContent = () => {
  const { colors } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login');
  const [appUnlocked, setAppUnlocked] = useState(true);

  // Старт: брендированный splash (этап 10) + проверка сессии и PIN (этап 9)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
        await SplashScreen.hideAsync();
      } catch (e) {
        /* уже скрыт */
      }
      const t0 = Date.now();
      try {
        const token = await getToken();
        if (token) {
          if (mounted) {
            setIsAuthenticated(true);
            setCurrentScreen('main');
            const lock = await isAppLockEnabled();
            setAppUnlocked(!lock);
            initNotifications();
            rescheduleRepeatingNotifications();
          }
        } else if (mounted) {
          setIsAuthenticated(false);
          setCurrentScreen('login');
          setAppUnlocked(true);
        }
      } catch (e) {
        if (mounted) setIsAuthenticated(false);
      } finally {
        const elapsed = Date.now() - t0;
        await new Promise((r) => setTimeout(r, Math.max(0, 1100 - elapsed)));
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Блокировка при уходе в фон (если PIN включён)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      if (next !== 'background') return;
      if (!isAuthenticated) return;
      try {
        const lock = await isAppLockEnabled();
        if (lock) setAppUnlocked(false);
      } catch (e) {
        /* ignore */
      }
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  const handleLoginSuccess = async () => {
    setIsAuthenticated(true);
    setCurrentScreen('main');
    const lock = await isAppLockEnabled();
    setAppUnlocked(!lock);
    initNotifications();
    rescheduleRepeatingNotifications();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <BrandedSplash />
      </View>
    );
  }

  if (currentScreen === 'secret') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <SecretChatScreen onExit={() => setCurrentScreen('main')} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    if (currentScreen === 'register')
      return <RegisterScreen onNavigate={setCurrentScreen} onLoginSuccess={handleLoginSuccess} />;
    if (currentScreen === 'forgot-password')
      return <ForgotPasswordScreen onNavigate={setCurrentScreen} />;
    return <LoginScreen onNavigate={setCurrentScreen} onLoginSuccess={handleLoginSuccess} />;
  }

  if (!appUnlocked) {
    return (
      <AppLockScreen onUnlock={() => setAppUnlocked(true)} />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <NavigationContainer>
        <MainTabs
          onLogout={() => {
            setIsAuthenticated(false);
            setCurrentScreen('login');
            setAppUnlocked(true);
          }}
          onOpenSecret={() => setCurrentScreen('secret')}
        />
      </NavigationContainer>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <DataSyncProvider>
        <AppContent />
      </DataSyncProvider>
    </ThemeProvider>
  );
}
