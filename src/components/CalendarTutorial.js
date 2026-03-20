// src/components/CalendarTutorial.js
// Туториал для экрана календаря

import React from 'react';
import TutorialOverlay from './TutorialOverlay';

const CalendarTutorial = ({ visible, currentStep, onNext, onPrevious, onClose, onSkip }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = require('react-native').Dimensions.get('window');

  // Шаги туториала для календаря
  const tutorialSteps = [
    {
      title: 'Добро пожаловать в календарь! 📅',
      description: 'Здесь вы можете планировать события, отслеживать задачи и помнить о важных датах. Давайте изучим возможности.',
      spotlightSize: 200,
      x: SCREEN_WIDTH / 2,
      y: 100,
      textPosition: { top: 200, left: 20, right: 20 },
    },
    {
      title: 'Навигация по месяцам 📆',
      description: 'Используйте стрелки для переключения между месяцами или нажмите на название месяца для быстрого выбора.',
      spotlightSize: 150,
      x: SCREEN_WIDTH / 2,
      y: 80,
      textPosition: { top: 150, left: 20, right: 20 },
      showPointer: true,
      pointerType: 'tap',
    },
    {
      title: 'Просмотр дня 📋',
      description: 'Нажмите на любой день чтобы посмотреть детальную информацию: задачи, привычки и события на этот день.',
      spotlightSize: 100,
      x: SCREEN_WIDTH / 2,
      y: 250,
      textPosition: { top: 350, left: 20, right: 20 },
      showPointer: true,
      pointerType: 'tap',
    },
    {
      title: 'Создание события 🎂',
      description: 'Нажмите + чтобы добавить событие или день рождения. Укажите напоминание и не забудьте про важные даты!',
      spotlightSize: 60,
      x: SCREEN_WIDTH - 40,
      y: SCREEN_HEIGHT - 100,
      textPosition: { top: null, bottom: 120, left: 20, right: 20 },
      showPointer: true,
      pointerType: 'tap',
    },
    {
      title: 'Индикаторы активности 🟢',
      description: 'Цветные индикаторы показывают активность: задачи, привычки, события. Чем больше точек, тем насыщеннее день!',
      spotlightSize: 120,
      x: SCREEN_WIDTH / 2,
      y: 300,
      textPosition: { top: 400, left: 20, right: 20 },
      showPointer: false,
    },
    {
      title: 'Готово к планированию! 🎉',
      description: 'Теперь вы знаете как использовать календарь. Планируйте заранее и не упускайте важные события!',
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

export default CalendarTutorial;
