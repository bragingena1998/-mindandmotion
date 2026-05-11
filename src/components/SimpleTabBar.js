// src/components/SimpleTabBar.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const SimpleTabBar = ({ activeTab, onTabChange }) => {
  const { colors } = useTheme();

  const tabs = [
    { id: 'Tasks', label: 'Задачи', iconOutline: 'checkmark-circle-outline', iconActive: 'checkmark-circle' },
    { id: 'Habits', label: 'Привычки', iconOutline: 'flash-outline', iconActive: 'flash' },
    { id: 'Profile', label: 'Профиль', iconOutline: 'person-outline', iconActive: 'person' },
  ];

  return (
    <View style={[styles.tabBar, { 
      backgroundColor: colors.surface, 
      borderTopColor: colors.borderSubtle 
    }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={styles.tabButton}
          >
            <View style={[
              styles.tabContent,
              isActive && { backgroundColor: colors.accent1 + '20' }
            ]}>
              <Ionicons
                name={isActive ? tab.iconActive : tab.iconOutline}
                size={24}
                color={isActive ? colors.accent1 : colors.textMuted}
              />
              <Text style={[
                styles.tabLabel,
                { color: isActive ? colors.accent1 : colors.textMuted }
              ]}>
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.06,
  },
});

export default SimpleTabBar;

