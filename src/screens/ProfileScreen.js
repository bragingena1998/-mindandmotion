import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { getUserId, removeToken } from '../services/storage';
import AlertModal from '../components/AlertModal';
import Modal from '../components/Modal';
import Button from '../components/Button';
import SettingsScreen from './SettingsScreen';

const ProfileScreen = ({ onLogout }) => {
  const { colors, theme, changeTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'success' });
  const [showDeleteDemoModal, setShowDeleteDemoModal] = useState(false);
  const [deletingDemo, setDeletingDemo] = useState(false);
  const [hideDeleteDemoButton, setHideDeleteDemoButton] = useState(false);

  const showAlert = (title, message, type = 'success') =>
    setAlertConfig({ visible: true, title, message, type });

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    const syncDeleteDemoButtonState = async () => {
      try {
        const uid = await getUserId();
        if (!uid) return;
        const hidden = await AsyncStorage.getItem(`@mm_demo_data_deleted_${uid}`);
        setHideDeleteDemoButton(hidden === 'true');
      } catch (error) {
        console.error('Ошибка проверки состояния кнопки демо-данных:', error);
      }
    };
    syncDeleteDemoButtonState();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      setUser(response.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await removeToken();
    onLogout();
  };

  const handleDeleteDemoData = async () => {
    try {
      setDeletingDemo(true);
      const response = await api.delete('/user/demo-data');
      const uid = await getUserId();
      if (uid) {
        await AsyncStorage.setItem(`@mm_demo_data_deleted_${uid}`, 'true');
      }
      setHideDeleteDemoButton(true);
      setShowDeleteDemoModal(false);
      const { tasks = 0, habits = 0, events = 0 } = response.data || {};
      showAlert('Готово', `Демо-данные удалены.\nЗадачи: ${tasks}\nПривычки: ${habits}\nСобытия: ${events}`);
    } catch (error) {
      showAlert('Ошибка', error?.response?.data?.error || 'Не удалось удалить демо-данные', 'error');
    } finally {
      setDeletingDemo(false);
    }
  };

  const themes = [
    { key: 'default', emoji: '🌑', name: 'Default' },
    { key: 'storm',   emoji: '⚡',    name: 'Storm' },
    { key: 'ice',     emoji: '🧊',    name: 'Ice' },
    { key: 'blood',   emoji: '🔥',    name: 'Blood' },
    { key: 'toxic',   emoji: '☢️',    name: 'Toxic' },
    { key: 'glitch',  emoji: '👾',    name: 'Glitch' },
    { key: 'sunset',  emoji: '🌅',    name: 'Sunset' },
    { key: 'ocean',   emoji: '🌊',    name: 'Ocean' },
    { key: 'forest',  emoji: '🌲',    name: 'Forest' },
  ];

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.accent1} />
    </View>
  );

  if (showSettings) {
    return (
      <SettingsScreen
        onBack={() => setShowSettings(false)}
        user={user}
        onUserUpdate={(updated) => setUser(updated)}
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ШАПКА */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>

        {/* Кнопка настроек */}
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
          onPress={() => setShowSettings(true)}
        >
          <Text style={{ fontSize: 18 }}>{'\u2699\uFE0F'}</Text>
        </TouchableOpacity>

        <View style={[styles.avatarContainer, { backgroundColor: colors.surface, borderColor: colors.accent1, shadowColor: colors.accent1 }]}>
          <Text style={[styles.avatarText, { color: colors.accent1 }]}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.textMain }]}>{user?.name || 'Пользователь'}</Text>
        <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email}</Text>
        <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.badgeText, { color: colors.textMain }]}>
            В ПУТИ С {user?.created_at ? new Date(user.created_at).getFullYear() : '2026'} ГОДА
          </Text>
        </View>
      </View>

      {/* ОФОРМЛЕНИЕ */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ОФОРМЛЕНИЕ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {themes.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.themeCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: theme === t.key ? colors.accent1 : colors.borderSubtle,
                }
              ]}
              onPress={() => changeTheme(t.key)}
            >
              <Text style={{ fontSize: 24 }}>{t.emoji}</Text>
              <Text style={{ color: colors.textMain, fontSize: 12, marginTop: 4, fontWeight: '600' }}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* АККАУНТ */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>АККАУНТ</Text>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
          onPress={() => setShowSettings(true)}
        >
          <Text style={[styles.actionText, { color: colors.textMain }]}>⚙️ Настройки</Text>
        </TouchableOpacity>
        {!hideDeleteDemoButton && (
          <TouchableOpacity
            style={[styles.actionButton, { marginTop: 12, backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
            onPress={() => setShowDeleteDemoModal(true)}
          >
            <Text style={[styles.actionText, { color: colors.textMuted }]}>🧹 Удалить демо-данные</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, { marginTop: 12, borderColor: colors.danger1, borderWidth: 1, backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}
          onPress={handleLogout}
        >
          <Text style={[styles.actionText, { color: colors.danger1 }]}>🚶 Выйти</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />

      <Modal
        visible={showDeleteDemoModal}
        onClose={() => !deletingDemo && setShowDeleteDemoModal(false)}
        title="Удалить демо-данные?"
      >
        <Text style={{ color: colors.textMain, textAlign: 'center', marginBottom: 12 }}>
          Будут удалены только базовые демо-задачи, демо-привычки и демо-события.
        </Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: 20 }}>
          Это действие нельзя отменить.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title="Отмена"
            variant="outline"
            onPress={() => setShowDeleteDemoModal(false)}
            style={{ flex: 1 }}
            disabled={deletingDemo}
          />
          <Button
            title={deletingDemo ? 'Удаляю...' : 'Удалить'}
            variant="danger"
            noBorder
            onPress={handleDeleteDemoData}
            style={{ flex: 1 }}
            disabled={deletingDemo}
          />
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingVertical: 40, borderBottomWidth: 1, position: 'relative' },
  settingsBtn: {
    position: 'absolute', top: 16, right: 20,
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  avatarContainer: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, elevation: 5,
  },
  avatarText: { fontSize: 36, fontWeight: 'bold' },
  userName: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  userEmail: { fontSize: 14, marginBottom: 16 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { marginTop: 32, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
  },
  themeCard: {
    width: 80, height: 80, borderRadius: 12,
    borderWidth: 2, justifyContent: 'center',
    alignItems: 'center', marginRight: 10,
  },
  actionButton: { padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  actionText: { fontSize: 16, fontWeight: '600' },
});

export default ProfileScreen;
