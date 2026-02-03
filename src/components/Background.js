// src/components/Background.js
// Многослойный фон с градиентами (как на сайте)

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const Background = ({ children }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Базовый слой */}
      <View style={[styles.baseLayer, { backgroundColor: colors.background }]} />
      
      {/* Градиентные пятна (как radial-gradient на сайте) */}
      <LinearGradient
        colors={[colors.accent1 + '40', 'transparent']} // 40 = прозрачность
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientSpot, styles.spotTopLeft]}
      />
      
      <LinearGradient
        colors={[colors.accent2 + '35', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.gradientSpot, styles.spotTopRight]}
      />

      {/* Контент поверх фона */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  baseLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientSpot: {
    position: 'absolute',
    width: '60%',
    height: '50%',
  },
  spotTopLeft: {
    top: 0,
    left: 0,
  },
  spotTopRight: {
    top: 0,
    right: 0,
  },
  content: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
});

export default Background;

