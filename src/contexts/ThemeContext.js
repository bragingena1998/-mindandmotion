import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

// Размеры (оставляем как есть, TasksScreen их использует)
const spacing = {
  radiusXs: 4,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusRound: 999,
  gutter: 16,
};

// Тени
const shadows = {
  primary: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  glow: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10 }
};

// БАЗОВАЯ ПАЛИТРА (Темный фон для всех)
const BASE_DARK = {
  background: '#0f0f11', // Глубокий черный (как на сайте)
  surface: '#18181b',    // Чуть светлее для карточек
  textMain: '#ffffff',
  textMuted: '#888888',
  border: '#333333',
  borderSubtle: '#222222',
  inputBackground: '#202022',
  inputBorder: '#444444',
  gradientBackground: ['#0f0f11', '#0f0f11'],
  
  // ЦВЕТА СТАТУСОВ (КРИТИЧНО ДЛЯ ЗАДАЧ)
  danger1: '#ff4444',  // Красный (Просрочено / Высокий приоритет)
  ok1: '#22c55e',      // Зеленый (Сегодня / Низкий приоритет) <-- ДОБАВИЛ
  success: '#22c55e',  // Дублируем для совместимости
};

const themes = {
  default: {
    ...BASE_DARK,
    accent1: '#FFD700', // Желтый неон
    
    // ИСПРАВИЛ: Был черный, стал Желтый. 
    // Теперь заголовок месяца и цифры статистики будут светиться желтым.
    accentText: '#FFD700', 
    
    accentBorder: '#FFD700',
    gradientPrimary: ['#FFD700', '#D4AF37'],
  },
  storm: {
    ...BASE_DARK,
    background: '#0b1015',
    surface: '#121820',
    accent1: '#0ea5e9', // Голубой
    
    // Исправил на голубой, чтобы текст светился
    accentText: '#0ea5e9', 
    
    accentBorder: '#0ea5e9',
    gradientPrimary: ['#0ea5e9', '#0284c7'],
  },
  ice: {
    ...BASE_DARK,
    background: '#081015',
    surface: '#0c1620',
    accent1: '#38bdf8', // Светло-голубой
    
    accentText: '#38bdf8',
    
    accentBorder: '#7dd3fc',
    gradientPrimary: ['#38bdf8', '#0ea5e9'],
  },
  blood: {
    ...BASE_DARK,
    background: '#120505', // Темный (не красный фон!)
    surface: '#1a0a0a',
    accent1: '#ff3333', // Красный неон
    
    accentText: '#ff3333',
    
    accentBorder: '#ff3333',
    gradientPrimary: ['#ff3333', '#cc0000'],
  },
  toxic: {
    ...BASE_DARK,
    background: '#051005',
    surface: '#0a1a0d',
    accent1: '#4ade80', // Зеленый неон
    
    accentText: '#4ade80',
    
    accentBorder: '#4ade80',
    gradientPrimary: ['#4ade80', '#16a34a'],
  },
  glitch: {
    ...BASE_DARK,
    background: '#10051a',
    surface: '#180a26',
    accent1: '#d8b4fe', // Фиолетовый
    
    accentText: '#d8b4fe',
    
    accentBorder: '#d8b4fe',
    gradientPrimary: ['#d8b4fe', '#9333ea'],
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('user_theme');
      if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
      }
    } catch (error) {
      console.error('Ошибка темы:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeTheme = async (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
      await AsyncStorage.setItem('user_theme', themeName);
    }
  };

  if (isLoading) return null;

  const value = {
    theme: currentTheme,
    colors: themes[currentTheme],
    spacing,
    shadows,
    changeTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
