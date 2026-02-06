// src/components/SimpleTabBar.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const SimpleTabBar = ({ activeTab, onTabChange }) => {
  const { colors } = useTheme();

  const tabs = [
    { id: 'Tasks', label: 'Задачи', icon: '✓' },
    { id: 'Habits', label: 'Привычки', icon: '⚡' },
    { id: 'Profile', label: 'Профиль', icon: '👤' },
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
              <Text style={[
                styles.tabIcon,
                { color: isActive ? colors.accent1 : colors.textMuted }
              ]}>
                {tab.icon}
              </Text>
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
  tabIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.06,
  },
});

export default SimpleTabBar;

