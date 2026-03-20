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
      description: 'Здесь вы можете отслеживать ежедневные привычки. Давайте изучим как это работает.',
    },
    {
      title: 'Создание привычки ➕',
      description: 'При создании привычки выберите единицу измерения: Дни (галочка), Часы (таймер), Кол-во (число) или своя единица. Укажите период выполнения или сделайте бессрочной.',
    },
    {
      title: 'Единицы измерения 📏',
      description: 'Дни — просто галочка выполнения. Часы — сколько времени в день, с таймером по долгому тапу. Кол-во — число повторений (отжимания, страницы). Своя — любая единица (км, слова).',
    },
    {
      title: 'План: в день vs за период �',
      description: '"в день" — нужно выполнять каждый день по плану. "за период" — суммарно за весь период, распределение произвольное.',
    },
    {
      title: 'Таблица и статистика �',
      description: 'Нажмите на ячейку чтобы ввести значение. Клик на последнем столбце меняет формат: сумма за все дни + процент от плана, либо среднее в день.',
    },
    {
      title: 'Готово! 🎉',
      description: 'Теперь вы умеете работать с привычками. Начните строить свои цепочки успеха уже сегодня!',
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
