// src/components/Button.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  noBorder = false,
  style,
  textStyle
}) => {
  const { colors } = useTheme();

  const getGradientColors = () => {
    if (disabled) return [colors.surface, colors.surface];
    switch (variant) {
      // FIX: danger2 может отсутствовать в теме — используем danger1 как запасной
      case 'danger': return [colors.danger1, colors.danger2 ?? colors.danger1];
      case 'secondary':
      case 'outline': return [colors.surface, colors.surface];
      default: return colors.gradientPrimary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case 'danger':    return '#FFFFFF';
      case 'outline':   return colors.accentBorder;
      case 'secondary': return colors.textMain;
      default:          return '#020617';
    }
  };

  const getBorderStyle = () => {
    if (noBorder) return { borderWidth: 0 };
    if (variant === 'outline') return { borderWidth: 1, borderColor: colors.accentBorder };
    return { borderWidth: 1, borderColor: colors.accentBorder };
  };

  const getShadowStyle = () => {
    if (disabled || variant === 'secondary') return {};
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
        style={[styles.gradient, getBorderStyle(), getShadowStyle()]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'danger' ? '#FFFFFF' : (variant === 'outline' ? colors.accentBorder : '#020617')} />
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
  container: { marginBottom: 0 },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
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
