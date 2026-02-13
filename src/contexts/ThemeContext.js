import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const themes = {
  default: {
    background: '#09090b',
    surface: '#18181b',
    textMain: '#fafafa',
    textMuted: '#a1a1aa',
    border: '#27272a',
    borderSubtle: '#3f3f46',
    accent1: '#facc15', // Yellow
    accentText: '#000000',
    danger1: '#ef4444',
    success: '#22c55e'
  },
  storm: {
    background: '#020617', // Slate 950
    surface: '#1e293b',    // Slate 800
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
    border: '#334155',
    borderSubtle: '#475569',
    accent1: '#38bdf8',    // Sky blue
    accentText: '#0f172a',
    danger1: '#f87171',
    success: '#4ade80'
  },
  ice: {
    background: '#f0f9ff', // Sky 50 (Light)
    surface: '#ffffff',
    textMain: '#0c4a6e',
    textMuted: '#64748b',
    border: '#bae6fd',
    borderSubtle: '#e0f2fe',
    accent1: '#0ea5e9',    // Sky 500
    accentText: '#ffffff',
    danger1: '#ef4444',
    success: '#10b981'
  },
  blood: {
    background: '#450a0a', // Red 950
    surface: '#7f1d1d',    // Red 900
    textMain: '#fef2f2',
    textMuted: '#fca5a5',
    border: '#991b1b',
    borderSubtle: '#b91c1c',
    accent1: '#fca5a5',    // Red 300
    accentText: '#450a0a',
    danger1: '#f87171',
    success: '#4ade80'
  },
  toxic: {
    background: '#052e16', // Green 950
    surface: '#14532d',    // Green 900
    textMain: '#f0fdf4',
    textMuted: '#86efac',
    border: '#166534',
    borderSubtle: '#15803d',
    accent1: '#4ade80',    // Green 400
    accentText: '#052e16',
    danger1: '#ef4444',
    success: '#22c55e'
  },
  glitch: {
    background: '#2e1065', // Violet 950
    surface: '#4c1d95',    // Violet 900
    textMain: '#faf5ff',
    textMuted: '#a78bfa',
    border: '#5b21b6',
    borderSubtle: '#6d28d9',
    accent1: '#d8b4fe',    // Violet 300
    accentText: '#2e1065',
    danger1: '#f472b6',    // Pink
    success: '#34d399'
  }
};

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState('default');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('user_theme');
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (e) {
      console.log('Failed to load theme');
    }
  };

  const changeTheme = async (newThemeKey) => {
    setTheme(newThemeKey);
    try {
      await AsyncStorage.setItem('user_theme', newThemeKey);
    } catch (e) {
      console.log('Failed to save theme');
    }
  };

  const colors = themes[theme] || themes.default;

  return (
    <ThemeContext.Provider value={{ theme, colors, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
