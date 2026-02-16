// src/components/Background.js
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const { height } = Dimensions.get('window');

const Background = ({ children }) => {
  const { colors } = useTheme();

  // Определяем базовый цвет фона: если в теме его нет, ставим темный
  const baseColor = colors.background || '#0f172a'; 

  return (
    <View style={[styles.container, { backgroundColor: baseColor }]}>
      {/* 1. Базовый темный слой (страховка от белого экрана) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: baseColor }]} />
      
      {/* 2. Верхний левый градиент (пятно) */}
      <LinearGradient
        colors={[colors.accent1 ? colors.accent1 + '40' : '#4facfe40', 'transparent']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientSpot, styles.spotTopLeft]}
      />
      
      {/* 3. Нижний правый градиент (пятно) - ТЕПЕРЬ ОНО ЕСТЬ И СНИЗУ */}
      <LinearGradient
        colors={[colors.accent2 ? colors.accent2 + '35' : '#00f2fe35', 'transparent']}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={[styles.gradientSpot, styles.spotBottomRight]}
      />

      {/* 4. Контент поверх фона */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // ВАЖНО: Дефолтный темный цвет, чтобы не было белых миганий
  },
  gradientSpot: {
    position: 'absolute',
    width: '100%',     // Растягиваем шире, чтобы не было "швов"
    height: height * 0.7, // Занимает 70% высоты
  },
  spotTopLeft: {
    top: 0,
    left: 0,
  },
  spotBottomRight: {
    bottom: 0,      // Прижимаем к низу
    right: 0,
  },
  content: {
    flex: 1,
    zIndex: 1,      // Контент всегда сверху
  },
});

export default Background;
