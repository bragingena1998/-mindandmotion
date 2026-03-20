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
      description: 'Здесь вы можете видеть все задачи, привычки и события в одном месте. Давайте изучим возможности.',
    },
    {
      title: 'Два режима отображения 📆',
      description: 'Переключатель "Месяц/Неделя" вверху справа. Месяц — классическая сетка, Неделя — горизонтальная полоса из 7 дней.',
    },
    {
      title: 'Навигация и свайпы �',
      description: 'Стрелки или свайп влево/вправо для переключения. Нажмите на название месяца — вернуться к сегодняшнему дню.',
    },
    {
      title: 'Что показывают ячейки �',
      description: 'В каждой ячейке: ✅ задачи, ⚡ привычки, 🌟 события. Выходные подсвечены красным, праздники — жёлтым.',
    },
    {
      title: 'Панель дня 📋',
      description: 'Нажмите на день → выезжает шторка с событиями, задачами и привычками. Можно перейти на нужный экран.',
    },
    {
      title: 'Создание событий ➕',
      description: 'Кнопка + СОБЫТИЕ добавляет день рождения, важную дату или обычное событие с напоминанием.',
    },
    {
      title: 'Готово к планированию! 🎉',
      description: 'Теперь вы умеете пользоваться календарём. Планируйте и не упускайте важные даты!',
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
