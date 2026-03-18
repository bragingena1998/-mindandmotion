import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import AlertModal from '../components/AlertModal';
import DatePickerModal from '../components/DatePickerModal';
import Background from '../components/Background';
import NotificationSettingsScreen from './NotificationSettingsScreen';

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const [y, m, d] = cleanDate.split('-');
  return `${d}.${m}.${y}`;
};

const SettingsScreen = ({ onBack, user: initialUser, onUserUpdate }) => {
  const { colors } = useTheme();
  const [user, setUser] = useState(initialUser || {});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'success' });
  const [showNotifications, setShowNotifications] = useState(false);

  const showAlert = (title, message, type = 'success') =>
    setAlertConfig({ visible: true, title, message, type });

  if (showNotifications) {
    return <NotificationSettingsScreen onBack={() => setShowNotifications(false)} />;
  }

  const handleUpdateProfile = async (updates) => {
    try {
      const res = await api.put('/user/profile', updates);
      setUser(res.data);
      onUserUpdate?.(res.data);
    } catch {
      showAlert('Ошибка', 'Не удалось обновить профиль', 'error');
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm)
      return showAlert('Ошибка', 'Пароли не совпадают', 'error');
    if (passwordData.new.length < 6)
      return showAlert('Ошибка', 'Минимум 6 символов', 'error');
    try {
      await api.put('/user/password', {
        currentPassword: passwordData.current,
        newPassword: passwordData.new,
      });
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
      showAlert('Готово', 'Пароль изменён');
    } catch (error) {
      showAlert('Ошибка', error.response?.data?.error || 'Не удалось сменить пароль', 'error');
    }
  };

  return (
    <Background>
      <View style={styles.container}>

        {/* ШАПКА */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            onPress={onBack}
          >
            <Text style={[styles.backText, { color: colors.textMain }]}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textMain }]}>Настройки</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* ПРОФИЛЬ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ПРОФИЛЬ</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>

              {/* Имя */}
              <View style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.rowLabel, { color: colors.textMain }]}>Имя</Text>
                <View style={{ width: 160 }}>
                  <Input
                    value={user?.name || ''}
                    onChangeText={(text) => setUser({ ...user, name: text })}
                    onEndEditing={(e) => handleUpdateProfile({ name: e.nativeEvent.text })}
                    containerStyle={{ marginBottom: 0 }}
                    style={{ height: 40, paddingVertical: 0 }}
                  />
                </View>
              </View>

              {/* Дата рождения */}
              <View style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.rowLabel, { color: colors.textMain }]}>Дата рождения</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={[
                    styles.dateBtn,
                    { backgroundColor: colors.background, borderColor: colors.borderSubtle }
                  ]}
                >
                  <Text style={{ color: user?.birthdate ? colors.textMain : colors.textMuted, fontSize: 15 }}>
                    {user?.birthdate ? formatDateDisplay(user.birthdate) : 'Выбрать'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Пол */}
              <View style={[styles.rowLast]}>
                <Text style={[styles.rowLabel, { color: colors.textMain }]}>Пол</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[{ key: 'male', label: 'М' }, { key: 'female', label: 'Ж' }].map(g => (
                    <TouchableOpacity
                      key={g.key}
                      onPress={() => handleUpdateProfile({ gender: g.key })}
                      style={[
                        styles.genderBtn,
                        {
                          backgroundColor: user?.gender === g.key ? colors.accent1 : colors.surface,
                          borderColor: user?.gender === g.key ? colors.accent1 : colors.borderSubtle,
                        }
                      ]}
                    >
                      <Text style={{ color: user?.gender === g.key ? '#FFF' : colors.textMuted, fontWeight: 'bold' }}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

            </View>
          </View>

          {/* УВЕДОМЛЕНИЯ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>УВЕДОМЛЕНИЯ</Text>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={() => setShowNotifications(true)}
            >
              <Text style={{ fontSize: 20 }}>🔔</Text>
              <Text style={[styles.menuItemText, { color: colors.textMain }]}>Настройка уведомлений</Text>
              <Text style={{ color: colors.textMuted, fontSize: 18 }}>{'\u203a'}</Text>
            </TouchableOpacity>
          </View>

          {/* БЕЗОПАСНОСТЬ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>БЕЗОПАСНОСТЬ</Text>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={() => setShowPasswordModal(true)}
            >
              <Text style={{ fontSize: 20 }}>🔒</Text>
              <Text style={[styles.menuItemText, { color: colors.textMain }]}>Сменить пароль</Text>
              <Text style={{ color: colors.textMuted, fontSize: 18 }}>{'\u203a'}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* МОДАЛКИ */}
        <Modal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Смена пароля">
          <Input label="Текущий пароль" secureTextEntry value={passwordData.current} onChangeText={t => setPasswordData({ ...passwordData, current: t })} />
          <Input label="Новый пароль" secureTextEntry value={passwordData.new} onChangeText={t => setPasswordData({ ...passwordData, new: t })} style={{ marginTop: 10 }} />
          <Input label="Повторите пароль" secureTextEntry value={passwordData.confirm} onChangeText={t => setPasswordData({ ...passwordData, confirm: t })} style={{ marginTop: 10 }} />
          <Button title="Сохранить" onPress={handleChangePassword} style={{ marginTop: 20 }} />
        </Modal>

        <DatePickerModal
          visible={showDatePicker}
          initialDate={user?.birthdate ? user.birthdate.split('T')[0] : ''}
          onClose={() => setShowDatePicker(false)}
          onSelect={(date) => handleUpdateProfile({ birthdate: date })}
        />
        <AlertModal
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
        />
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
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 12,
  },
  card: { borderRadius: 14, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowLast: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  dateBtn: {
    width: 130, height: 40, borderRadius: 10,
    borderWidth: 1, justifyContent: 'center',
    paddingHorizontal: 12,
  },
  genderBtn: {
    width: 44, height: 44, borderRadius: 8,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 14,
    borderWidth: 1, gap: 12,
    marginBottom: 10,
  },
  menuItemText: { flex: 1, fontSize: 16, fontWeight: '500' },
});

export default SettingsScreen;
