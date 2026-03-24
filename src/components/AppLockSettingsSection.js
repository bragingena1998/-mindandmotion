import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../contexts/ThemeContext';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import {
  isAppLockEnabled,
  isBiometricUnlockEnabled,
  setupPin,
  changePin,
  disableAppLock,
  setBiometricEnabled,
  verifyPin,
  setGracePeriod,
  getGracePeriod,
} from '../services/appLock';

const PinModalBody = ({
  title,
  error,
  onConfirm,
  onClose,
  children,
  confirmLabel,
}) => {
  const { colors } = useTheme();
  return (
    <>
      <Text style={{ color: colors.textMuted, marginBottom: 12, textAlign: 'center' }}>
        {title}
      </Text>
      {children}
      {error ? (
        <Text style={{ color: colors.danger1, marginTop: 8, textAlign: 'center' }}>{error}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Button title="Отмена" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <Button title={confirmLabel} onPress={onConfirm} style={{ flex: 1 }} />
      </View>
    </>
  );
};

const AppLockSettingsSection = () => {
  const { colors } = useTheme();
  const [lockEnabled, setLockEnabled] = useState(false);
  const [bioEnabled, setBioEnabledState] = useState(false);
  const [bioHardware, setBioHardware] = useState(false);
  const [showSetPin, setShowSetPin] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [newPin1, setNewPin1] = useState('');
  const [newPin2, setNewPin2] = useState('');
  const [disablePin, setDisablePin] = useState('');
  const [error, setError] = useState('');
  const [gracePeriod, setGracePeriodState] = useState(0);

  const refresh = useCallback(async () => {
    const [le, bio, hw, enrolled, gp] = await Promise.all([
      isAppLockEnabled(),
      isBiometricUnlockEnabled(),
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      getGracePeriod(),
    ]);
    setLockEnabled(le);
    setBioEnabledState(bio);
    setBioHardware(hw && enrolled);
    setGracePeriodState(gp);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openSetPin = () => {
    setError('');
    setPin1('');
    setPin2('');
    setShowSetPin(true);
  };

  const confirmSetPin = async () => {
    setError('');
    if (!/^\d{4,6}$/.test(pin1)) {
      setError('PIN: 4–6 цифр');
      return;
    }
    if (pin1 !== pin2) {
      setError('PIN не совпадают');
      return;
    }
    try {
      await setupPin(pin1);
      setShowSetPin(false);
      await refresh();
    } catch (e) {
      setError(e.message || 'Ошибка');
    }
  };

  const confirmChangePin = async () => {
    setError('');
    if (!/^\d{4,6}$/.test(newPin1)) {
      setError('Новый PIN: 4–6 цифр');
      return;
    }
    if (newPin1 !== newPin2) {
      setError('Новый PIN не совпадает');
      return;
    }
    try {
      await changePin(oldPin, newPin1);
      setShowChangePin(false);
      setOldPin('');
      setNewPin1('');
      setNewPin2('');
      await refresh();
    } catch (e) {
      setError(e.message || 'Ошибка');
    }
  };

  const confirmDisable = async () => {
    setError('');
    const ok = await verifyPin(disablePin);
    if (!ok) {
      setError('Неверный PIN');
      return;
    }
    await disableAppLock();
    setShowDisable(false);
    setDisablePin('');
    await refresh();
  };

  const onToggleLock = (value) => {
    setError('');
    if (value) {
      openSetPin();
    } else {
      setDisablePin('');
      setShowDisable(true);
    }
  };

  const onToggleBio = async (value) => {
    if (value) {
      const r = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Включить вход по биометрии',
        cancelLabel: 'Отмена',
      });
      if (!r.success) return;
    }
    await setBiometricEnabled(value);
    setBioEnabledState(value);
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ЗАЩИТА ПРИЛОЖЕНИЯ</Text>

      <View style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <Text style={{ fontSize: 20 }}>🔐</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.menuItemText, { color: colors.textMain }]}>PIN при входе</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
            После входа в аккаунт и при возврате из фона
          </Text>
        </View>
        <Switch
          value={lockEnabled}
          onValueChange={onToggleLock}
          trackColor={{ false: '#444', true: colors.accent1 + '99' }}
          thumbColor={lockEnabled ? colors.accent1 : '#888'}
        />
      </View>

      {lockEnabled && (
        <>
          <View style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={{ fontSize: 20 }}>👆</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemText, { color: colors.textMain }]}>Биометрия</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                Отпечаток / Face ID вместо PIN
              </Text>
            </View>
            <Switch
              value={bioEnabled}
              onValueChange={onToggleBio}
              disabled={!bioHardware}
              trackColor={{ false: '#444', true: colors.accent1 + '99' }}
              thumbColor={bioEnabled ? colors.accent1 : '#888'}
            />
          </View>

          <View style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={{ fontSize: 20 }}>⏰</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemText, { color: colors.textMain }]}>Отсрочка 5 мин</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                Не запрашивать PIN 5 минут после сворачивания
              </Text>
            </View>
            <Switch
              value={gracePeriod > 0}
              onValueChange={async (value) => {
                const minutes = value ? 5 : 0;
                await setGracePeriod(minutes);
                setGracePeriodState(minutes);
              }}
              trackColor={{ false: '#444', true: colors.accent1 + '99' }}
              thumbColor={gracePeriod > 0 ? colors.accent1 : '#888'}
            />
          </View>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
            onPress={() => {
              setError('');
              setOldPin('');
              setNewPin1('');
              setNewPin2('');
              setShowChangePin(true);
            }}
          >
            <Text style={{ fontSize: 20 }}>🔢</Text>
            <Text style={[styles.menuItemText, { color: colors.textMain }]}>Сменить PIN</Text>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>{'\u203a'}</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal visible={showSetPin} onClose={() => setShowSetPin(false)} title="Новый PIN">
        <PinModalBody
          title="Введите 4–6 цифр дважды"
          error={error}
          confirmLabel="Сохранить"
          onConfirm={confirmSetPin}
          onClose={() => setShowSetPin(false)}
        >
          <Input
            label="PIN"
            keyboardType="number-pad"
            secureTextEntry
            value={pin1}
            onChangeText={(t) => setPin1(t.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
          <Input
            label="Повтор PIN"
            keyboardType="number-pad"
            secureTextEntry
            value={pin2}
            onChangeText={(t) => setPin2(t.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            containerStyle={{ marginTop: 10 }}
          />
        </PinModalBody>
      </Modal>

      <Modal visible={showChangePin} onClose={() => setShowChangePin(false)} title="Сменить PIN">
        <PinModalBody
          title="Текущий PIN и новый (4–6 цифр)"
          error={error}
          confirmLabel="Сменить"
          onConfirm={confirmChangePin}
          onClose={() => setShowChangePin(false)}
        >
          <Input
            label="Текущий PIN"
            keyboardType="number-pad"
            secureTextEntry
            value={oldPin}
            onChangeText={(t) => setOldPin(t.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
          <Input
            label="Новый PIN"
            keyboardType="number-pad"
            secureTextEntry
            value={newPin1}
            onChangeText={(t) => setNewPin1(t.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            containerStyle={{ marginTop: 10 }}
          />
          <Input
            label="Повтор нового PIN"
            keyboardType="number-pad"
            secureTextEntry
            value={newPin2}
            onChangeText={(t) => setNewPin2(t.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            containerStyle={{ marginTop: 10 }}
          />
        </PinModalBody>
      </Modal>

      <Modal visible={showDisable} onClose={() => setShowDisable(false)} title="Отключить PIN?">
        <PinModalBody
          title="Введите PIN для подтверждения"
          error={error}
          confirmLabel="Отключить"
          onConfirm={confirmDisable}
          onClose={() => setShowDisable(false)}
        >
          <Input
            label="PIN"
            keyboardType="number-pad"
            secureTextEntry
            value={disablePin}
            onChangeText={(t) => setDisablePin(t.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
        </PinModalBody>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
  },
  menuItemText: { flex: 1, fontSize: 16, fontWeight: '500' },
});

export default AppLockSettingsSection;
