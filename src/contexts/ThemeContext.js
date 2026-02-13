import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

// ПОЛНЫЕ ТЕМЫ СО ВСЕМИ НУЖНЫМИ ЦВЕТАМИ
const themes = {
  default: {
    background: '#09090b',
    surface: '#18181b',
    textMain: '#fafafa',
    textMuted: '#a1a1aa',
    textSecondary: '#71717a',
    border: '#27272a',
    borderSubtle: '#3f3f46',
    accent1: '#facc15',
    accentText: '#000000',
    accentBorder: '#fef08a',
    danger1: '#ef4444',
    success: '#22c55e',
    gradientStart: '#09090b',
    gradientEnd: '#18181b',
  },
  storm: {
    background: '#020617',
    surface: '#1e293b',
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
    textSecondary: '#64748b',
    border: '#334155',
    borderSubtle: '#475569',
    accent1: '#38bdf8',
    accentText: '#0f172a',
    accentBorder: '#7dd3fc',
    danger1: '#f87171',
    success: '#4ade80',
    gradientStart: '#020617',
    gradientEnd: '#0f172a',
  },
  ice: {
    background: '#f0f9ff',
    surface: '#ffffff',
    textMain: '#0c4a6e',
    textMuted: '#64748b',
    textSecondary: '#475569',
    border: '#bae6fd',
    borderSubtle: '#e0f2fe',
    accent1: '#0ea5e9',
    accentText: '#ffffff',
    accentBorder: '#38bdf8',
    danger1: '#ef4444',
    success: '#10b981',
    gradientStart: '#f0f9ff',
    gradientEnd: '#e0f2fe',
  },
  blood: {
    background: '#450a0a',
    surface: '#7f1d1d',
    textMain: '#fef2f2',
    textMuted: '#fca5a5',
    textSecondary: '#f87171',
    border: '#991b1b',
    borderSubtle: '#b91c1c',
    accent1: '#fca5a5',
    accentText: '#450a0a',
    accentBorder: '#fecaca',
    danger1: '#f87171',
    success: '#4ade80',
    gradientStart: '#450a0a',
    gradientEnd: '#7f1d1d',
  },
  toxic: {
    background: '#052e16',
    surface: '#14532d',
    textMain: '#f0fdf4',
    textMuted: '#86efac',
    textSecondary: '#4ade80',
    border: '#166534',
    borderSubtle: '#15803d',
    accent1: '#4ade80',
    accentText: '#052e16',
    accentBorder: '#86efac',
    danger1: '#ef4444',
    success: '#22c55e',
    gradientStart: '#052e16',
    gradientEnd: '#14532d',
  },
  glitch: {
    background: '#2e1065',
    surface: '#4c1d95',
    textMain: '#faf5ff',
    textMuted: '#a78bfa',
    textSecondary: '#8b5cf6',
    border: '#5b21b6',
    borderSubtle: '#6d28d9',
    accent1: '#d8b4fe',
    accentText: '#2e1065',
    accentBorder: '#e9d5ff',
    danger1: '#f472b6',
    success: '#34d399',
    gradientStart: '#2e1065',
    gradientEnd: '#4c1d95',
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
