import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, TextInput
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../services/settingsStorage';
import Background from '../components/Background';

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

  const s = StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
      borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: colors.surface,
      justifyContent: 'center', alignItems: 'center',
      marginRight: 14,
    },
    backText: { color: colors.textMain, fontSize: 18 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textMain },
    section: { marginTop: 28, paddingHorizontal: 20 },
    sectionTitle: {
      fontSize: 11, fontWeight: '700', color: colors.textMuted,
      letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14, overflow: 'hidden',
    },
    row: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
    },
    rowLast: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    emoji: { fontSize: 20, marginRight: 12 },
    rowTitle: { fontSize: 16, fontWeight: '500', color: colors.textMain },
    rowSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    timeRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
    },
    timeLabel: { fontSize: 14, color: colors.textMuted, flex: 1 },
    timeInput: {
      width: 70, height: 36,
      backgroundColor: colors.background,
      borderRadius: 8, borderWidth: 1,
      borderColor: colors.borderSubtle,
      color: colors.textMain, fontSize: 15,
      textAlign: 'center', fontWeight: '600',
    },
    minuteRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
      gap: 8,
    },
    minuteLabel: { fontSize: 14, color: colors.textMuted, flex: 1 },
    minuteInput: {
      width: 60, height: 36,
      backgroundColor: colors.background,
      borderRadius: 8, borderWidth: 1,
      borderColor: colors.borderSubtle,
      color: colors.textMain, fontSize: 15,
      textAlign: 'center', fontWeight: '600',
    },
    daysRow: {
      flexDirection: 'row', justifyContent: 'space-around',
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
    },
    dayBtn: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1,
    },
    dayText: { fontSize: 12, fontWeight: '600' },
    hint: {
      fontSize: 12, color: colors.textMuted,
      paddingHorizontal: 20, marginTop: 8,
    },
  });

  const SwitchRow = ({ emoji, title, sub, value, onChange, last }) => (
    <View style={last ? s.rowLast : s.row}>
      <View style={s.rowLeft}>
        <Text style={s.emoji}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle}>{title}</Text>
          {!!sub && <Text style={s.rowSub}>{sub}</Text>}
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

  return (
    <Background>
      <View style={s.container}>
        {/* ШАПКА */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={onBack}>
            <Text style={s.backText}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Уведомления</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* УТРО И ВЕЧЕР */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Напоминания дня</Text>
            <View style={s.card}>
              <SwitchRow
                emoji="🌅"
                title="Утреннее"
                sub="Сводка задач и дедлайнов на сегодня"
                value={settings.morningEnabled}
                onChange={v => update('morningEnabled', v)}
              />
              {settings.morningEnabled && (
                <View style={s.timeRow}>
                  <Text style={s.timeLabel}>Время</Text>
                  <TextInput
                    style={s.timeInput}
                    value={settings.morningTime}
                    onChangeText={v => update('morningTime', v)}
                    placeholder="08:00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              )}
              <SwitchRow
                emoji="🌙"
                title="Вечернее"
                sub="Напоминание внести отметки за день"
                value={settings.eveningEnabled}
                onChange={v => update('eveningEnabled', v)}
              />
              {settings.eveningEnabled && (
                <View style={[s.timeRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.timeLabel}>Время</Text>
                  <TextInput
                    style={s.timeInput}
                    value={settings.eveningTime}
                    onChangeText={v => update('eveningTime', v)}
                    placeholder="20:00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              )}
            </View>
          </View>

          {/* ДО ЗАДАЧИ */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Задачи</Text>
            <View style={s.card}>
              <SwitchRow
                emoji="⏰"
                title="Напоминание до задачи"
                sub="Только для задач с указанным временем"
                value={settings.taskReminderEnabled}
                onChange={v => update('taskReminderEnabled', v)}
              />
              {settings.taskReminderEnabled && (
                <>
                  <View style={s.minuteRow}>
                    <Text style={s.minuteLabel}>Первое напоминание за</Text>
                    <TextInput
                      style={s.minuteInput}
                      value={String(settings.taskReminderFirst)}
                      onChangeText={v => update('taskReminderFirst', parseInt(v) || 60)}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>мин</Text>
                  </View>
                  <View style={[s.minuteRow, { borderBottomWidth: 0 }]}>
                    <Text style={s.minuteLabel}>Второе напоминание за</Text>
                    <TextInput
                      style={s.minuteInput}
                      value={String(settings.taskReminderSecond)}
                      onChangeText={v => update('taskReminderSecond', parseInt(v) || 10)}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>мин</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* СОБЫТИЯ */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>События и дни рождения</Text>
            <View style={s.card}>
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
          <View style={s.section}>
            <Text style={s.sectionTitle}>Концентрация</Text>
            <View style={s.card}>
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
          <View style={s.section}>
            <Text style={s.sectionTitle}>Статистика</Text>
            <View style={s.card}>
              <SwitchRow
                emoji="📅"
                title="Недельный итог"
                sub="Краткая сводка по неделе"
                value={settings.weeklyEnabled}
                onChange={v => update('weeklyEnabled', v)}
              />
              {settings.weeklyEnabled && (
                <>
                  <View style={s.daysRow}>
                    {DAYS.map((d, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          s.dayBtn,
                          {
                            backgroundColor: settings.weeklyDay === i ? colors.accent1 : colors.background,
                            borderColor: settings.weeklyDay === i ? colors.accent1 : colors.borderSubtle,
                          }
                        ]}
                        onPress={() => update('weeklyDay', i)}
                      >
                        <Text style={[s.dayText, { color: settings.weeklyDay === i ? '#fff' : colors.textMuted }]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={[s.timeRow, { borderBottomWidth: 0 }]}>
                    <Text style={s.timeLabel}>Время</Text>
                    <TextInput
                      style={s.timeInput}
                      value={settings.weeklyTime}
                      onChangeText={v => update('weeklyTime', v)}
                      placeholder="20:00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                </>
              )}
            </View>
          </View>

          {/* НЕАКТИВНОСТЬ */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Мотивация</Text>
            <View style={s.card}>
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

          <Text style={s.hint}>
            ⚠️ Уведомления работают только в собранном APK.
            В Dev Client они недоступны.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Background>
  );
};

export default NotificationSettingsScreen;
