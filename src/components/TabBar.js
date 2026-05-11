// src/components/TabBar.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const TabBar = ({ state, navigation }) => {
  const { colors } = useTheme();

  const tabs = [
    { name: 'Tasks', label: 'Задачи', iconOutline: 'checkmark-circle-outline', iconActive: 'checkmark-circle' },
    { name: 'Habits', label: 'Привычки', iconOutline: 'flash-outline', iconActive: 'flash' },
    { name: 'Profile', label: 'Профиль', iconOutline: 'person-outline', iconActive: 'person' },
  ];

  return (
    <View style={[styles.tabBar, { 
      backgroundColor: colors.surface, 
      borderTopColor: colors.borderSubtle 
    }]}>
      {tabs.map((tab, index) => {
        const isFocused = state.index === index;
        const route = state.routes[index];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={onPress}
            style={styles.tabButton}
          >
            <View style={[
              styles.tabContent,
              isFocused && { backgroundColor: colors.accent1 + '20' }
            ]}>
              <Ionicons
                name={isFocused ? tab.iconActive : tab.iconOutline}
                size={24}
                color={isFocused ? colors.accent1 : colors.textMuted}
              />
              <Text style={[
                styles.tabLabel,
                { color: isFocused ? colors.accent1 : colors.textMuted }
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
    paddingBottom: 8,
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

export default TabBar;

