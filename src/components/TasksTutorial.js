// src/components/TasksTutorial.js
// Туториал для экрана задач

import React, { useRef, useEffect, useState } from 'react';
import { View, findNodeHandle } from 'react-native';
import TutorialOverlay from './TutorialOverlay';

const TasksTutorial = ({ visible, onClose }) => {
  const [steps, setSteps] = useState([]);
  const addButtonRef = useRef(null);
  const filterButtonRef = useRef(null);
  const taskItemRef = useRef(null);
  const focusButtonRef = useRef(null);

  useEffect(() => {
    // Формируем шаги туториала
    const tutorialSteps = [
      {
        title: 'Добро пожаловать в задачи! 📝',
        description: 'Здесь вы можете управлять всеми своими задачами. Давайте рассмотрим основные функции.',
        spotlightSize: 100,
        x: 50, // По умолчанию вверху слева
        y: 100,
        textPosition: { top: 200, left: 20, right: 20 },
        showPointer: false,
      },
      {
        title: 'Создание задачи ➕',
        description: 'Нажмите на кнопку + чтобы создать новую задачу. Вы можете указать название, время, приоритет и комментарии.',
        spotlightSize: 60,
        x: 0, // Будет обновлено при измерении
        y: 0,
        textPosition: { top: null, bottom: 100, left: 20, right: 20 },
        showPointer: true,
        pointerType: 'tap',
      },
      {
        title: 'Фильтрация задач 🔍',
        description: 'Используйте фильтры для отображения задач по статусу: все, активные, выполненные или просроченные.',
        spotlightSize: 150,
        x: 0, // Будет обновлено при измерении
        y: 0,
        textPosition: { top: 150, left: 20, right: 20 },
        showPointer: true,
        pointerType: 'tap',
      },
      {
        title: 'Свайп для действий 👉',
        description: 'Проведите пальцем по задаче вправо для быстрого выполнения или влево для удаления. Попробуйте!',
        spotlightSize: 300,
        x: SCREEN_WIDTH / 2,
        y: 300,
        textPosition: { top: null, bottom: 150, left: 20, right: 20 },
        showPointer: true,
        pointerType: 'swipe',
      },
      {
        title: 'Концентрация 🎯',
        description: 'Запустите таймер концентрации для глубокой работы над задачей без отвлечений.',
        spotlightSize: 80,
        x: 0, // Будет обновлено при измерении
        y: 0,
        textPosition: { top: null, bottom: 100, left: 20, right: 20 },
        showPointer: true,
        pointerType: 'tap',
      },
      {
        title: 'Готово! 🎉',
        description: 'Теперь вы знаете основы управления задачами. Начните планировать свой день эффективно!',
        spotlightSize: 200,
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT / 2,
        textPosition: { top: SCREEN_HEIGHT / 2 - 100, left: 20, right: 20 },
        showPointer: false,
      },
    ];

    // Обновляем координаты для элементов
    if (addButtonRef.current) {
      addButtonRef.current.measure((fx, fy, width, height, px, py) => {
        tutorialSteps[1].x = px + width / 2;
        tutorialSteps[1].y = py + height / 2;
      });
    }

    if (filterButtonRef.current) {
      filterButtonRef.current.measure((fx, fy, width, height, px, py) => {
        tutorialSteps[2].x = px + width / 2;
        tutorialSteps[2].y = py + height / 2;
      });
    }

    if (focusButtonRef.current) {
      focusButtonRef.current.measure((fx, fy, width, height, px, py) => {
        tutorialSteps[4].x = px + width / 2;
        tutorialSteps[4].y = py + height / 2;
      });
    }

    setSteps(tutorialSteps);
  }, []);

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = require('react-native').Dimensions.get('window');

  return (
    <>
      {/* Скрытые элементы для измерения координат */}
      <View ref={addButtonRef} style={{ position: 'absolute' }} />
      <View ref={filterButtonRef} style={{ position: 'absolute' }} />
      <View ref={taskItemRef} style={{ position: 'absolute' }} />
      <View ref={focusButtonRef} style={{ position: 'absolute' }} />
      
      <TutorialOverlay
        visible={visible}
        steps={steps}
        currentStepIndex={0} // Будет управляться извне
        onNext={() => {}} // Будет управляться извне
        onPrevious={() => {}} // Будет управляться извне
        onClose={onClose}
        onSkip={onClose}
      />
    </>
  );
};

export default TasksTutorial;
