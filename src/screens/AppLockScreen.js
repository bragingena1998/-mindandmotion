import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../contexts/ThemeContext';
import Background from '../components/Background';
import {
  verifyPin,
  isBiometricUnlockEnabled,
  secureGet,
} from '../services/appLock';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['bio', '0', 'back'],
];

const AppLockScreen = ({ onUnlock }) => {
  const { colors } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [pinLength, setPinLength] = useState(4); // Длина настроенного PIN

  const triedAutoBio = useRef(false);

  useEffect(() => {
    checkBiometric();
    loadPinLength();
  }, []);

  const loadPinLength = async () => {
    // Определяем длину PIN по хэшу (упрощенный подход)
    try {
      const hash = await secureGet('mm_app_pin_hash_v1');
      if (hash) {
        // В реальном приложении нужно хранить длину PIN отдельно
        // Пока будем использовать максимальную длину 6
        setPinLength(6);
      }
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [hardware, enrolled, bioFlag] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        isBiometricUnlockEnabled(),
      ]);
      if (!cancelled) {
        setBioAvailable(hardware && enrolled);
        setBioEnabled(bioFlag);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tryBiometric = useCallback(async () => {
    setError('');
    try {
      const r = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Вход в Mind&Motion',
        cancelLabel: 'Отмена',
        disableDeviceFallback: false,
      });
      if (r.success) onUnlock();
      else setError('Не удалось подтвердить');
    } catch {
      setError('Биометрия недоступна');
    }
  }, [onUnlock]);

  useEffect(() => {
    if (!bioAvailable || !bioEnabled || triedAutoBio.current) return;
    triedAutoBio.current = true;
    tryBiometric();
  }, [bioAvailable, bioEnabled, tryBiometric]);

  const submit = async (value) => {
    setError('');
    const ok = await verifyPin(value);
    if (ok) {
      setPin('');
      onUnlock();
    } else {
      if (Platform.OS !== 'web') Vibration.vibrate(80);
      setError('Неверный PIN');
      setPin('');
    }
  };

  const onKey = (key) => {
    if (key === 'back') {
      setPin((p) => p.slice(0, -1));
      setError('');
      return;
    }
    if (key === 'bio') {
      tryBiometric();
      return;
    }
    if (pin.length >= pinLength) return;
    const next = pin + key;
    setPin(next);
    setError('');
    // Автоматическая проверка при достижении нужной длины
    if (next.length >= 4 && next.length <= 6) {
      submit(next);
    }
  };

  return (
    <Background>
      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.textMain }]}>Mind&Motion</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Введите PIN-код
        </Text>

        <View style={styles.dots}>
          {Array.from({ length: pinLength }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < pin.length ? colors.accent1 : colors.borderSubtle,
                },
              ]}
            />
          ))}
        </View>

        {error ? (
          <Text style={[styles.err, { color: colors.danger1 }]}>{error}</Text>
        ) : (
          <View style={{ height: 22 }} />
        )}

        <View style={styles.pad}>
          {KEYS.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((k) => {
                if (k === 'bio') {
                  return (
                    <TouchableOpacity
                      key={k}
                      style={[styles.key, { borderColor: colors.borderSubtle }]}
                      onPress={() => onKey('bio')}
                      disabled={!bioAvailable || !bioEnabled}
                    >
                      <Text style={{ fontSize: 22 }}>
                        {bioAvailable && bioEnabled ? '👆' : ' '}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                if (k === 'back') {
                  return (
                    <TouchableOpacity
                      key={k}
                      style={[styles.key, { borderColor: colors.borderSubtle }]}
                      onPress={() => onKey('back')}
                    >
                      <Text style={[styles.keyText, { color: colors.textMain }]}>
                        ⌫
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={k}
                    style={[styles.key, { borderColor: colors.borderSubtle }]}
                    onPress={() => onKey(k)}
                  >
                    <Text style={[styles.keyText, { color: colors.textMain }]}>
                      {k}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {bioAvailable && bioEnabled && (
          <TouchableOpacity onPress={tryBiometric} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.accent1, fontWeight: '600' }}>
              🔐 Войти по отпечатку / Face ID
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Background>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  sub: { marginTop: 8, fontSize: 15 },
  dots: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
    marginBottom: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  err: { fontSize: 14, marginBottom: 4 },
  enterBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  enterBtnText: { color: '#020617', fontWeight: '700', fontSize: 16 },
  pad: { marginTop: 12, width: '100%', maxWidth: 320 },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 14,
  },
  key: {
    width: 72,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  keyText: { fontSize: 22, fontWeight: '600' },
});

export default AppLockScreen;
