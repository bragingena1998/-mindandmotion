// src/contexts/ThemeContext.js
// Контекст для управления темами приложения

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from '../theme/themes';
import { spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import { typography } from '../theme/typography';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем сохранённую тему при запуске
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
      }
    } catch (error) {
      console.error('Ошибка загрузки темы:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Переключение темы
  const changeTheme = async (themeName) => {
    try {
      if (themes[themeName]) {
        await AsyncStorage.setItem('app_theme', themeName);
        setCurrentTheme(themeName);
      }
    } catch (error) {
      console.error('Ошибка сохранения темы:', error);
    }
  };

  // Получаем цвета текущей темы
  const colors = themes[currentTheme];

  const value = {
    theme: currentTheme,        // Название темы ('default', 'storm', и т.д.)
    colors,                      // Цвета текущей темы
    spacing,                     // Отступы и радиусы
    shadows,                     // Тени
    typography,                  // Шрифты
    changeTheme,                 // Функция смены темы
    isDark: true,                // Всегда тёмная (у вас нет светлой)
  };

  if (isLoading) {
    return null; // Или экран загрузки
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Хук для использования темы
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme должен использоваться внутри ThemeProvider');
  }
  return context;
};

