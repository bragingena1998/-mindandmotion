// src/components/TutorialOverlay.js
// Overlay туториал для подсветки функций приложения

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TutorialOverlay = ({ 
  visible, 
  steps, 
  currentStepIndex, 
  onNext, 
  onPrevious, 
  onClose,
  onSkip 
}) => {
  const { colors } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [spotlightAnim] = useState(new Animated.ValueXY({ x: 0, y: 0 }));
  const [textAnim] = useState(new Animated.Value(0));
  
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  useEffect(() => {
    if (visible && currentStep) {
      // Получаем позицию spotlight
      const getSpotlightPosition = () => {
        if (currentStep.targetRef && currentStep.targetRef.current) {
          currentStep.targetRef.current.measure((fx, fy, width, height, px, py) => {
            if (px && py) {
              const targetX = px + width / 2 - SCREEN_WIDTH / 2;
              const targetY = py + height / 2 - SCREEN_HEIGHT / 2;
              Animated.timing(spotlightAnim, {
                toValue: { x: targetX, y: targetY },
                duration: 500,
                useNativeDriver: false,
              }).start();
            }
          });
        } else {
          const targetX = (currentStep.x || SCREEN_WIDTH / 2) - SCREEN_WIDTH / 2;
          const targetY = (currentStep.y || SCREEN_HEIGHT / 2) - SCREEN_HEIGHT / 2;
          Animated.timing(spotlightAnim, {
            toValue: { x: targetX, y: targetY },
            duration: 500,
            useNativeDriver: false,
          }).start();
        }
      };

      // Анимация появления overlay
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Установка позиции spotlight с небольшой задержкой
      setTimeout(() => {
        getSpotlightPosition();
      }, 100);

      // Анимация появления текста
      setTimeout(() => {
        Animated.timing(textAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 200);
    } else {
      // Анимация исчезновения
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, currentStep]);

  if (!visible || !currentStep) return null;

  const spotlightSize = currentStep.spotlightSize || 200;
  const spotlightRadius = spotlightSize / 2;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Полупрозрачный фон */}
      <View style={styles.background} />
      
      {/* Spotlight круг (визуальный + прозрачный для нажатий) */}
      <Animated.View
        style={[
          styles.spotlight,
          {
            width: spotlightSize,
            height: spotlightSize,
            borderRadius: spotlightRadius,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            transform: [
              { translateX: spotlightAnim.x },
              { translateY: spotlightAnim.y },
            ],
          },
        ]}
      />

      {/* Текст туториала */}
      <Animated.View
        style={[
          styles.textContainer,
          currentStep.textPosition,
          { opacity: textAnim },
        ]}
      >
        <Text style={[styles.title, { color: colors.textMain }]}>
          {currentStep.title}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {currentStep.description}
        </Text>
        
        {/* Кнопки навигации */}
        <View style={styles.buttonContainer}>
          {/* Кнопка "Пропустить" или "Назад" */}
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.borderSubtle }]}
            onPress={isFirstStep ? onSkip : onPrevious}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>
              {isFirstStep ? 'Пропустить' : 'Назад'}
            </Text>
          </TouchableOpacity>

          {/* Кнопка "Далее" или "Завершить" */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.accent1 }]}
            onPress={isLastStep ? onClose : onNext}
          >
            <Text style={[styles.primaryButtonText, { color: '#020617' }]}>
              {isLastStep ? 'Завершить' : 'Далее'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Прогресс-бар */}
        <View style={styles.progressBar}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor: index <= currentStepIndex ? colors.accent1 : colors.borderSubtle,
                  width: index === currentStepIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>

      {/* Указатель (стрелка или рука) */}
      {currentStep.showPointer && (
        <Animated.View
          style={[
            styles.pointer,
            {
              transform: [
                { translateX: spotlightAnim.x },
                { translateY: spotlightAnim.y },
              ],
            },
          ]}
        >
          <Text style={styles.pointerEmoji}>
            {currentStep.pointerType === 'swipe' ? '👉' : '👆'}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  spotlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  textContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    padding: 20,
    maxWidth: SCREEN_WIDTH - 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
  },
  progressDot: {
    height: 4,
    borderRadius: 2,
  },
  pointer: {
    position: 'absolute',
  },
  pointerEmoji: {
    fontSize: 24,
  },
});

export default TutorialOverlay;
