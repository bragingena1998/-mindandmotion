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

  // Конвертация "HH:MM" в Date объект
  const getTimeFromString = (timeString) => {
    const date = new Date();
    if (!timeString) {
      // По умолчанию ставим 12:00, если время не выбрано
      date.setHours(12, 0, 0, 0);
      return date;
    }
    const [hours, minutes] = timeString.split(':');
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return date;
  };

  // Конвертация Date в "HH:MM"
  const getStringFromTime = (date) => {
    if (!date) return null;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Форматирование для отображения
  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return 'Без времени';
    return timeString; // уже в формате HH:MM
  };

  // WEB: react-datepicker с Portal
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
              selected={value ? getTimeFromString(value) : null}
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
              inline
              locale="ru"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                onChangeTime(null);
                setIsOpen(false);
              }}
              style={{
                flex: 1,
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
              Очистить
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: colors.danger1,
                color: '#020617',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Закрыть
            </button>
          </div>
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
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.button, { 
              flex: 1,
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

          {value && (
            <TouchableOpacity
              style={[styles.clearButton, { borderColor: colors.borderSubtle }]}
              onPress={() => onChangeTime(null)}
            >
              <Text style={{ color: colors.textMuted }}>✖</Text>
            </TouchableOpacity>
          )}
        </View>

        {isOpen && (
          <DateTimePicker
            value={getTimeFromString(value)}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setIsOpen(Platform.OS === 'ios');
              if (event.type === 'set' && selectedDate) {
                onChangeTime(getStringFromTime(selectedDate));
              } else if (event.type === 'dismissed') {
                setIsOpen(false);
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
       {label && (
          <Text style={[styles.label, { color: colors.textMain }]}>
            {label}
          </Text>
        )}
      <View style={[styles.button, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
         <Text style={{ color: colors.textMuted }}>
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
  clearButton: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
  }
});

export default TimePicker;