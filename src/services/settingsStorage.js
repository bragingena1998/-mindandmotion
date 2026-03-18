import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@mm_notification_settings';

export const DEFAULT_SETTINGS = {
  morningEnabled: true,
  morningTime: '08:00',
  eveningEnabled: true,
  eveningTime: '20:00',
  taskReminderEnabled: true,
  taskReminderFirst: 60,
  taskReminderSecond: 10,
  birthdayEnabled: true,
  sessionEndEnabled: true,
  weeklyEnabled: true,
  weeklyDay: 0,
  weeklyTime: '20:00',
  inactivityEnabled: true,
};

export const loadSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('settingsStorage: save error', e);
  }
};

export const updateSetting = async (key, value) => {
  const current = await loadSettings();
  const updated = { ...current, [key]: value };
  await saveSettings(updated);
  return updated;
};
