// src/components/TutorialButton.js
// Кнопка "?" для перезапуска туториалов

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const TutorialButton = ({ onPress, onLongPress, style }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        { 
          backgroundColor: `${colors.surface}AA`,
          borderColor: colors.borderSubtle,
          borderWidth: 1,
        }, 
        style
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: colors.textMuted }]}>?</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default TutorialButton;
