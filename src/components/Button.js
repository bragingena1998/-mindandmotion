// src/components/Button.js
// Универсальная кнопка с градиентом и свечением

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger'
  loading = false,
  disabled = false,
  style,
  textStyle 
}) => {
  const { colors, spacing } = useTheme();

  // Градиенты для разных вариантов кнопки
  const getGradientColors = () => {
    if (disabled) {
      return [colors.surface, colors.surface];
    }
    
    switch (variant) {
      case 'danger':
        return [colors.danger1, colors.danger2];
      case 'secondary':
      case 'outline':
        return [colors.surface, colors.surface];
      default: // primary
        return colors.gradientPrimary; // ['#f97316', '#ec4899'] из темы
    }
  };

  // Цвет текста
  const getTextColor = () => {
    if (disabled) {
      return colors.textMuted;
    }
    
    switch (variant) {
      case 'outline':
        return colors.accentBorder;
      case 'secondary':
        return colors.textMain;
      default:
        return '#020617'; // Тёмный текст на ярких кнопках
    }
  };

  // Стили обводки и свечения
  const getBorderStyle = () => {
    if (variant === 'outline') {
      return {
        borderWidth: 1,
        borderColor: colors.accentBorder,
      };
    }
    return {
      borderWidth: 1,
      borderColor: colors.accentBorder,
    };
  };

  // Свечение (shadow с цветом акцента)
  const getShadowStyle = () => {
    if (disabled || variant === 'secondary') {
      return {};
    }
    
    return {
      shadowColor: variant === 'danger' ? colors.danger1 : colors.accent1,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 18,
      elevation: 8,
    };
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          getBorderStyle(),
          getShadowStyle(),
        ]}
      >
        {loading ? (
          <ActivityIndicator 
            color={variant === 'outline' ? colors.accentBorder : '#020617'} 
          />
        ) : (
          <Text style={[styles.buttonText, { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999, // Полностью скруглённая
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.06,
    textTransform: 'uppercase',
  },
});

export default Button;

