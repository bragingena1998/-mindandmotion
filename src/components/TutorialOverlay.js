// src/components/TutorialOverlay.js
// Overlay туториал для подсветки функций приложения

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TutorialOverlay = ({ visible, steps, currentStepIndex, onNext, onPrevious, onClose, onSkip }) => {
  const { colors } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));
  
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;
  const titleColor = colors.textMain;
  const descriptionColor = colors.textMuted;
  const skipColor = colors.textMuted;

  useEffect(() => {
    if (visible) {
      // Простая анимация появления
      if (__DEV__) console.log('🔧 Tutorial overlay showing, step:', currentStepIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Анимация исчезновения
      if (__DEV__) console.log('🔧 Tutorial overlay hiding');
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible || !currentStep) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Полупрозрачный фон */}
      <View style={styles.background} />
      
      {/* Простое окно по центру */}
      <View style={styles.centerContainer}>
        <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.title, { color: titleColor }]}>
            {currentStep.title}
          </Text>
          <Text style={[styles.description, { color: descriptionColor }]}>
            {currentStep.description}
          </Text>
          
          {/* Кнопки навигации */}
          <View style={styles.buttonContainer}>
            {!isFirstStep && (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.borderSubtle }]}
                onPress={onPrevious}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textMain }]}>Назад</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.accent1 }]}
              onPress={isLastStep ? onClose : onNext}
            >
              <Text style={[styles.primaryButtonText, { color: '#020617' }]}>
                {isLastStep ? 'Завершить' : 'Далее'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Кнопка пропуска */}
          {!isLastStep && (
            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={[styles.skipButtonText, { color: skipColor }]}>Пропустить туториал</Text>
            </TouchableOpacity>
          )}

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
        </View>
      </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    borderRadius: 16,
    padding: 24,
    maxWidth: SCREEN_WIDTH - 40,
    width: '100%',
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
  },
});

export default TutorialOverlay;
