// src/components/TimePicker.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Web: react-datepicker + ReactDOM для Portal
let ReactDatePicker = null;
let ReactDOM = null;
if (Platform.OS === 'web') {
  ReactDatePicker = require('react-datepicker').default;
  ReactDOM = require('react-dom');
  require('react-datepicker/dist/react-datepicker.css');
  require('./DatePicker.css');
}

// Mobile: DateTimePicker
let DateTimePicker = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

const TimePicker = ({ label, value, onChangeTime }) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Конвертация "HH:MM" в Date объект (дата не важна, только время)
  const getTimeFromString = (timeString) => {
    const date = new Date();
    if (!timeString) {
      // По умолчанию 12:00
      date.setHours(12, 0, 0, 0);
      return date;
    }
    const [hours, minutes] = timeString.split(':');
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return date;
  };

  // Конвертация Date в "HH:MM"
  const getStringFromTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Форматирование для отображения
  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return 'Без времени';
    return timeString; // Уже в формате HH:MM
  };

  // WEB: react-datepicker с Portal (режим только время)
  if (Platform.OS === 'web' && ReactDatePicker && ReactDOM) {
    const timePortal = isOpen && ReactDOM.createPortal(
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
      }}>
        {/* Затемнённый фон */}
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 999999,
          }}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Карточка */}
        <div style={{
          position: 'relative',
          zIndex: 1000000,
          borderRadius: '16px',
          padding: '20px',
          backgroundColor: colors.surface,
          border: `2px solid ${colors.borderSubtle}`,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)',
          maxWidth: '360px',
          width: '90%',
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '16px',
            textAlign: 'center',
            color: colors.accentText,
          }}>
            Выберите время
          </div>
          
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <ReactDatePicker
              selected={getTimeFromString(value)}
              onChange={(date) => {
                const timeString = getStringFromTime(date);
                onChangeTime(timeString);
                setIsOpen(false);
              }}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={15}
              timeCaption="Время"
              dateFormat="HH:mm"
              timeFormat="HH:mm"
              inline
              locale="ru"
            />
          </div>
          
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: colors.danger1,
              color: '#020617',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              marginBottom: '8px'
            }}
          >
            Закрыть
          </button>
          
          <button
            onClick={() => {
              onChangeTime(null);
              setIsOpen(false);
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '999px',
              border: `1px solid ${colors.borderSubtle}`,
              backgroundColor: 'transparent',
              color: colors.textMain,
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Удалить время
          </button>
        </div>
      </div>,
      document.body
    );

    return (
      <View style={styles.container}>
        {label && (
          <Text style={[styles.label, { color: colors.textMain }]}>
            {label}
          </Text>
        )}
        
        <TouchableOpacity
          style={[styles.button, { 
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
          }]}
          onPress={() => setIsOpen(true)}
        >
          <Text style={[styles.buttonText, { color: value ? colors.textMain : colors.textMuted }]}>
            {formatTimeForDisplay(value)}
          </Text>
          <Text style={styles.icon}>🕒</Text>
        </TouchableOpacity>

        {timePortal}
      </View>
    );
  }

  // iOS/ANDROID: DateTimePicker
  if (Platform.OS !== 'web' && DateTimePicker) {
    return (
      <View style={styles.container}>
        {label && (
          <Text style={[styles.label, { color: colors.textMain }]}>
            {label}
          </Text>
        )}
        
        <TouchableOpacity
          style={[styles.button, { 
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
          }]}
          onPress={() => setIsOpen(true)}
        >
          <Text style={[styles.buttonText, { color: value ? colors.textMain : colors.textMuted }]}>
            {formatTimeForDisplay(value)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {value && (
              <TouchableOpacity onPress={() => onChangeTime(null)}>
                <Text style={styles.iconClear}>❌</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.icon}>🕒</Text>
          </View>
        </TouchableOpacity>

        {isOpen && (
          <DateTimePicker
            value={getTimeFromString(value)}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setIsOpen(Platform.OS === 'ios');
              
              if (event.type === 'set' && selectedDate) {
                const timeString = getStringFromTime(selectedDate);
                onChangeTime(timeString);
              } else if (event.type === 'dismiss') {
                 // Оставляем как было
              }
            }}
          />
        )}
      </View>
    );
  }

  // Fallback
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textMain }]}>
        {label}
      </Text>
      <View style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.buttonText, { color: colors.textMuted }]}>
          {formatTimeForDisplay(value)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.06,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
  },
  icon: {
    fontSize: 20,
  },
  iconClear: {
    fontSize: 16,
    marginTop: 2,
  }
});

export default TimePicker;
