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
          backgroundColor: colors.accent1, 
          borderColor: colors.accent1,
          borderWidth: 3,
        }, 
        style
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: '#020617' }]}>?</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  text: {
    fontSize: 24,
    fontWeight: '800',
  },
});

export default TutorialButton;
