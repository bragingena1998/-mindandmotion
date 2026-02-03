// src/components/Card.js
// Карточка с градиентной рамкой (как на вашем сайте)

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const Card = ({ children, style }) => {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.wrapper, style]}>
      {/* Градиентная рамка */}
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.border,
          {
            borderRadius: spacing.radiusLg,
            padding: 1, // Толщина рамки
          },
        ]}
      >
        {/* Внутренний контент */}
        <View
          style={[
            styles.content,
            {
              backgroundColor: colors.background,
              borderRadius: spacing.radiusLg - 1,
            },
          ]}
        >
          {children}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    // Свечение вокруг карточки
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  border: {
    // LinearGradient создаёт рамку
  },
  content: {
    padding: 18,
  },
});

export default Card;

