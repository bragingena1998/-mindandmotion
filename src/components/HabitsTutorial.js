// src/components/HabitsTutorial.js
// Туториал для экрана привычек

import React from 'react';
import TutorialOverlay from './TutorialOverlay';

const HabitsTutorial = ({ visible, currentStep, onNext, onPrevious, onClose, onSkip }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = require('react-native').Dimensions.get('window');

  // Шаги туториала для привычек
  const tutorialSteps = [
    {
      title: 'Привычки — ваш путь к успеху! 🎯',
      description: 'Здесь вы можете отслеживать ежедневные привычки и строить цепочки успеха. Давайте изучим основные функции.',
      spotlightSize: 200,
      x: SCREEN_WIDTH / 2,
      y: 100,
      textPosition: { top: 200, left: 20, right: 20 },
    },
    {
      title: 'Создание привычки ➕',
      description: 'Нажмите на кнопку + чтобы создать новую привычку. Укажите название, цвет, иконку и частоту выполнения.',
      spotlightSize: 60,
      x: SCREEN_WIDTH - 40,
      y: SCREEN_HEIGHT - 100,
      textPosition: { top: null, bottom: 120, left: 20, right: 20 },
      showPointer: true,
      pointerType: 'tap',
    },
    {
      title: 'Отметка выполнения ✅',
      description: 'Нажмите на привычку чтобы отметить её выполнение. Можно указать количество повторений за день.',
      spotlightSize: 150,
      x: SCREEN_WIDTH / 2,
      y: 250,
      textPosition: { top: 350, left: 20, right: 20 },
      showPointer: true,
      pointerType: 'tap',
    },
    {
      title: 'Статистика и прогресс 📊',
      description: 'Нажмите на иконку статистики чтобы посмотреть детальную информацию о прогрессе и рекордах.',
      spotlightSize: 80,
      x: SCREEN_WIDTH - 60,
      y: 200,
      textPosition: { top: 250, left: 20, right: 20 },
      showPointer: true,
      pointerType: 'tap',
    },
    {
      title: 'Цепочка успеха 🔥',
      description: 'Чем дольше вы придерживаетесь привычки, тем длиннее становится цепочка. Не прерывайте её!',
      spotlightSize: 200,
      x: SCREEN_WIDTH / 2,
      y: 400,
      textPosition: { top: 500, left: 20, right: 20 },
      showPointer: false,
    },
    {
      title: 'Отлично! 🎉',
      description: 'Теперь вы знаете как работать с привычками. Начните строить свои цепочки успеха уже сегодня!',
      spotlightSize: 200,
      x: SCREEN_WIDTH / 2,
      y: SCREEN_HEIGHT / 2,
      textPosition: { top: SCREEN_HEIGHT / 2 - 100, left: 20, right: 20 },
    },
  ];

  return (
    <TutorialOverlay
      visible={visible}
      steps={tutorialSteps}
      currentStepIndex={currentStep}
      onNext={onNext}
      onPrevious={onPrevious}
      onClose={onClose}
      onSkip={onSkip}
    />
  );
};

export default HabitsTutorial;
