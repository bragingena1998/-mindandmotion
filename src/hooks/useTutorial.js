// src/hooks/useTutorial.js
// Хук для управления туториалами в приложении

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_KEY = '@mm_tutorial_completed';

export const useTutorial = (screenName) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Проверка, завершен ли туториал для экрана
  useEffect(() => {
    const checkTutorialStatus = async () => {
      try {
        const completed = await AsyncStorage.getItem(`${TUTORIAL_KEY}_${screenName}`);
        setIsCompleted(!!completed);
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      }
    };

    checkTutorialStatus();
  }, [screenName]);

  // Запуск туториала
  const startTutorial = useCallback(() => {
    if (!isCompleted) {
      setIsVisible(true);
      setCurrentStep(0);
    }
  }, [isCompleted]);

  // Перезапуск туториала (даже если завершен)
  const restartTutorial = useCallback(() => {
    setIsVisible(true);
    setCurrentStep(0);
  }, []);

  // Следующий шаг
  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  // Предыдущий шаг
  const previousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  // Закрытие туториала
  const closeTutorial = useCallback(async () => {
    setIsVisible(false);
    // Отмечаем туториал как завершенный
    try {
      await AsyncStorage.setItem(`${TUTORIAL_KEY}_${screenName}`, 'true');
      setIsCompleted(true);
    } catch (error) {
      console.error('Error saving tutorial status:', error);
    }
  }, [screenName]);

  // Пропуск туториала
  const skipTutorial = useCallback(async () => {
    setIsVisible(false);
    // Отмечаем туториал как пропущенный (завершенный)
    try {
      await AsyncStorage.setItem(`${TUTORIAL_KEY}_${screenName}`, 'true');
      setIsCompleted(true);
    } catch (error) {
      console.error('Error saving tutorial status:', error);
    }
  }, [screenName]);

  // Сброс всех туториалов (для тестирования)
  const resetAllTutorials = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const tutorialKeys = keys.filter(key => key.startsWith(TUTORIAL_KEY));
      await AsyncStorage.multiRemove(tutorialKeys);
      setIsCompleted(false);
    } catch (error) {
      console.error('Error resetting tutorials:', error);
    }
  }, []);

  return {
    isVisible,
    currentStep,
    isCompleted,
    startTutorial,
    restartTutorial,
    nextStep,
    previousStep,
    closeTutorial,
    skipTutorial,
    resetAllTutorials,
  };
};
