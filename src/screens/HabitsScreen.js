// src/screens/HabitsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import HabitTable from '../components/HabitTable';

const HabitsScreen = () => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState([]);
  const [profile, setProfile] = useState(null);
  const [lifeProgress, setLifeProgress] = useState({ percent: 0, yearsLived: 0, yearsLeft: 64 });
  const [yearProgress, setYearProgress] = useState({ percent: 0, daysPassed: 0, daysLeft: 365 });
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [records, setRecords] = useState([]);

  // Загрузка профиля и прогресса жизни
  useEffect(() => {
    loadProfile();
    loadHabits();
  }, []);

  // Загрузка записей за месяц
  useEffect(() => {
    if (habits.length > 0) {
      loadRecords();
    }
  }, [year, month, habits]);

  const loadProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      setProfile(response.data);
      calculateLifeProgress(response.data.birthdate);
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
    }
  };

  const calculateLifeProgress = (birthdate) => {
    if (!birthdate) return;

    const today = new Date();
    const birth = new Date(birthdate);
    const lifeExpectancy = 64;

    const ageMs = today - birth;
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
    const lifePercent = Math.min(100, Math.round((ageYears / lifeExpectancy) * 100));
    const yearsLived = Math.floor(ageYears);
    const yearsLeft = Math.max(0, Math.round(lifeExpectancy - ageYears));

    setLifeProgress({ percent: lifePercent, yearsLived, yearsLeft });

    const birthMonth = birth.getMonth();
    const birthDay = birth.getDate();
    let yearStart = new Date(today.getFullYear(), birthMonth, birthDay);
    
    if (today < yearStart) {
      yearStart = new Date(today.getFullYear() - 1, birthMonth, birthDay);
    }
    
    const yearEnd = new Date(yearStart.getFullYear() + 1, birthMonth, birthDay - 1);
    const daysInYear = Math.round((yearEnd - yearStart) / (1000 * 60 * 60 * 24)) + 1;
    const daysPassed = Math.round((today - yearStart) / (1000 * 60 * 60 * 24));
    const daysLeft = daysInYear - daysPassed;
    const yearPercent = Math.min(100, Math.round((daysPassed / daysInYear) * 100));

    setYearProgress({ percent: yearPercent, daysPassed, daysLeft });
  };

  const loadHabits = async () => {
    try {
      setLoading(true);
      const response = await api.get('/habits');
      setHabits(response.data);
      console.log('Привычек загружено:', response.data.length);
    } catch (error) {
      console.error('Ошибка загрузки привычек:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      console.log(`Загрузка записей за ${year}-${month}`);
      const response = await api.get(`/habits/records/${year}/${month}`);
      setRecords(response.data);
      console.log('Записей загружено:', response.data.length);
    } catch (error) {
      console.error('Ошибка загрузки записей:', error);
    }
  };

  const handleCellChange = async (habitId, year, month, day, value) => {
    console.log('📝 Изменение ячейки:', { habitId, year, month, day, value });

    // Оптимистичное обновление UI
    setRecords((prev) => {
      const filtered = prev.filter(
        (r) => !(r.habit_id === habitId && r.day === day)
      );
      if (value) {
        return [...filtered, { habit_id: habitId, year, month, day, value }];
      }
      return filtered;
    });

    // Сохранение на сервер
    try {
      if (value) {
        await api.post('/habits/records', { habit_id: habitId, year, month, day, value });
        console.log('✅ Запись сохранена');
      } else {
        await api.delete(`/habits/records/${habitId}/${year}/${month}/${day}`);
        console.log('🗑️ Запись удалена');
      }
    } catch (error) {
      console.error('Ошибка сохранения записи:', error);
      loadRecords();
    }
  };

  const handleHabitEdit = (habit) => {
    console.log('✏️ Редактирование привычки:', habit);
  };

  const handleHabitDelete = (habit) => {
    console.log('🗑️ Удаление привычки:', habit);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent1} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* ЖИЗНЕННОЕ ВРЕМЯ */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMain }]}>
          ЖИЗНЕННОЕ ВРЕМЯ
        </Text>

        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            Прожито
          </Text>
          <Text style={[styles.progressValue, { color: colors.textMain }]}>
            {lifeProgress.percent}%
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.borderSubtle }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${lifeProgress.percent}%`,
                  backgroundColor: colors.accent1,
                },
              ]}
            >
              <Text style={styles.progressText}>{lifeProgress.percent}%</Text>
            </View>
          </View>
          <Text style={[styles.progressDetails, { color: colors.textMuted }]}>
            {lifeProgress.yearsLived} лет прожито, {lifeProgress.yearsLeft} осталось
          </Text>
        </View>

        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            Год (с ДР)
          </Text>
          <Text style={[styles.progressValue, { color: colors.textMain }]}>
            {yearProgress.daysPassed} дней
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.borderSubtle }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${yearProgress.percent}%`,
                  backgroundColor: colors.accent2,
                },
              ]}
            >
              <Text style={styles.progressText}>{yearProgress.percent}%</Text>
            </View>
          </View>
          <Text style={[styles.progressDetails, { color: colors.textMuted }]}>
            {yearProgress.daysPassed} дней прошло, {yearProgress.daysLeft} осталось
          </Text>
        </View>
      </View>

      {/* ПРИВЫЧКИ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textMain }]}>
            ПРИВЫЧКИ
          </Text>
          <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>
            {String(month).padStart(2, '0')}.{year}
          </Text>
        </View>

        {habits.length === 0 ? (
          <View style={[styles.placeholder, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
              Нет привычек
            </Text>
          </View>
        ) : (
          <HabitTable
            habits={habits}
            year={year}
            month={month}
            records={records}
            onCellChange={handleCellChange}
            onHabitEdit={handleHabitEdit}
            onHabitDelete={handleHabitDelete}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.12,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.06,
    marginBottom: 8,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressBar: {
    height: 24,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#020617',
  },
  progressDetails: {
    fontSize: 12,
    marginTop: 4,
  },
  placeholder: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
  },
});

export default HabitsScreen;
