import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, TextInput
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../services/settingsStorage';
import Background from '../components/Background';
import TimePicker from '../components/TimePicker';

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const NotificationSettingsScreen = ({ onBack }) => {
  const { colors } = useTheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = useCallback(async (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  // Простая строка со свичем
  const SwitchRow = ({ emoji, title, sub, value, onChange, last }) => (
    <View style={[
      styles.row,
      { borderBottomColor: colors.borderSubtle },
      last && { borderBottomWidth: 0 },
    ]}>
      <View style={styles.rowLeft}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: colors.textMain }]}>{title}</Text>
          {!!sub && <Text style={[styles.rowSub, { color: colors.textMuted }]}>{sub}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.borderSubtle, true: colors.accent1 }}
        thumbColor={'#fff'}
      />
    </View>
  );

  // Строка с барабаном времени — занимает всю ширину карточки
  const TimeRow = ({ label, value, onChange, last }) => (
    <View style={[
      styles.timeBlock,
      { borderBottomColor: colors.borderSubtle },
      last && { borderBottomWidth: 0 },
    ]}>
      <Text style={[styles.timeBlockLabel, { color: colors.textMuted }]}>{label}</Text>
      <TimePicker
        value={value}
        onChangeTime={v => onChange(v || '08:00')}
      />
    </View>
  );

  return (
    <Background>
      <View style={styles.container}>

        {/* ШАПКА */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            onPress={onBack}
          >
            <Text style={[styles.backText, { color: colors.textMain }]}>{'←'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textMain }]}>Уведомления</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* УТРО / ВЕЧЕР */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Напоминания дня</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>

              <SwitchRow
                emoji="🌅"
                title="Утреннее"
                sub="Сводка задач и дедлайнов на сегодня"
                value={settings.morningEnabled}
                onChange={v => update('morningEnabled', v)}
              />
              {settings.morningEnabled && (
                <TimeRow
                  label="Время утреннего"
                  value={settings.morningTime}
                  onChange={v => update('morningTime', v)}
                />
              )}

              <SwitchRow
                emoji="🌙"
                title="Вечернее"
                sub="Напоминание внести отметки за день"
                value={settings.eveningEnabled}
                onChange={v => update('eveningEnabled', v)}
                last={!settings.eveningEnabled}
              />
              {settings.eveningEnabled && (
                <TimeRow
                  label="Время вечернего"
                  value={settings.eveningTime}
                  onChange={v => update('eveningTime', v)}
                  last
                />
              )}

            </View>
          </View>

          {/* ДО ЗАДАЧИ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Задачи</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>

              <SwitchRow
                emoji="⏰"
                title="Напоминание до задачи"
                sub="Только для задач с указанным временем"
                value={settings.taskReminderEnabled}
                onChange={v => update('taskReminderEnabled', v)}
                last={!settings.taskReminderEnabled}
              />
              {settings.taskReminderEnabled && (
                <>
                  <View style={[styles.minuteRow, { borderBottomColor: colors.borderSubtle }]}>
                    <Text style={[styles.minuteLabel, { color: colors.textMuted }]}>Первое напоминание за</Text>
                    <TextInput
                      style={[styles.minuteInput, {
                        backgroundColor: colors.background,
                        borderColor: colors.borderSubtle,
                        color: colors.textMain,
                      }]}
                      value={String(settings.taskReminderFirst)}
                      onChangeText={v => update('taskReminderFirst', parseInt(v) || 60)}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                    <Text style={[styles.minSuffix, { color: colors.textMuted }]}>мин</Text>
                  </View>
                  <View style={[styles.minuteRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.minuteLabel, { color: colors.textMuted }]}>Второе напоминание за</Text>
                    <TextInput
                      style={[styles.minuteInput, {
                        backgroundColor: colors.background,
                        borderColor: colors.borderSubtle,
                        color: colors.textMain,
                      }]}
                      value={String(settings.taskReminderSecond)}
                      onChangeText={v => update('taskReminderSecond', parseInt(v) || 10)}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                    <Text style={[styles.minSuffix, { color: colors.textMuted }]}>мин</Text>
                  </View>
                </>
              )}

            </View>
          </View>

          {/* СОБЫТИЯ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>События и дни рождения</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <SwitchRow
                emoji="🎂"
                title="ДР и события"
                sub="Кол-во дней настраивается в форме события"
                value={settings.birthdayEnabled}
                onChange={v => update('birthdayEnabled', v)}
                last
              />
            </View>
          </View>

          {/* КОНЦЕНТРАТ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Концентрация</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <SwitchRow
                emoji="✅"
                title="Конец сессии"
                sub="Уведомление по завершении таймера"
                value={settings.sessionEndEnabled}
                onChange={v => update('sessionEndEnabled', v)}
                last
              />
            </View>
          </View>

          {/* НЕДЕЛЬНЫЙ ИТОГ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Статистика</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>

              <SwitchRow
                emoji="📅"
                title="Недельный итог"
                sub="Краткая сводка по неделе"
                value={settings.weeklyEnabled}
                onChange={v => update('weeklyEnabled', v)}
              />
              {settings.weeklyEnabled && (
                <>
                  <View style={[styles.daysRow, { borderBottomColor: colors.borderSubtle }]}>
                    {DAYS.map((d, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.dayBtn,
                          {
                            backgroundColor: settings.weeklyDay === i ? colors.accent1 : colors.background,
                            borderColor: settings.weeklyDay === i ? colors.accent1 : colors.borderSubtle,
                          }
                        ]}
                        onPress={() => update('weeklyDay', i)}
                      >
                        <Text style={[
                          styles.dayText,
                          { color: settings.weeklyDay === i ? '#fff' : colors.textMuted }
                        ]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TimeRow
                    label="Время итога"
                    value={settings.weeklyTime}
                    onChange={v => update('weeklyTime', v)}
                    last
                  />
                </>
              )}

            </View>
          </View>

          {/* НЕАКТИВНОСТЬ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Мотивация</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <SwitchRow
                emoji="💪"
                title="Напоминание при неактивности"
                sub="Со 2-го дня без захода, повтор до 7 дней"
                value={settings.inactivityEnabled}
                onChange={v => update('inactivityEnabled', v)}
                last
              />
            </View>
          </View>

          <Text style={[styles.hint, { color: colors.textMuted }]}>
            ⚠️ Уведомления работают только в собранном APK. В Dev Client они недоступны.
          </Text>

        </ScrollView>
      </View>
    </Background>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  backText: { fontSize: 18 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
  },
  card: { borderRadius: 14, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  emoji: { fontSize: 20, marginRight: 12 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 13, marginTop: 2 },

  // Блок с барабаном — занимает всю ширину, TimePicker без обёртки
  timeBlock: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  timeBlockLabel: {
    fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 0,
  },

  minuteRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, gap: 8,
  },
  minuteLabel: { flex: 1, fontSize: 14 },
  minuteInput: {
    width: 60, height: 36, borderRadius: 8,
    borderWidth: 1, fontSize: 15,
    textAlign: 'center', fontWeight: '600',
  },
  minSuffix: { fontSize: 13 },
  daysRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dayBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  dayText: { fontSize: 12, fontWeight: '600' },
  hint: { fontSize: 12, paddingHorizontal: 20, marginTop: 16 },
});

export default NotificationSettingsScreen;
