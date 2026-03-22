/**
 * Защита входа в приложение: PIN (хэш + соль в SecureStore), биометрия — флаг в AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { CryptoDigestAlgorithm, CryptoEncoding } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const K_ENABLED = '@mm_app_lock_enabled';
const K_BIOMETRIC = '@mm_app_lock_biometric';
const SEC_HASH = 'mm_app_pin_hash_v1';
const SEC_SALT = 'mm_app_pin_salt_v1';

const isWeb = Platform.OS === 'web';

async function secureSet(key, value) {
  if (isWeb) {
    await AsyncStorage.setItem(`secure_${key}`, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureGet(key) {
  if (isWeb) return AsyncStorage.getItem(`secure_${key}`);
  return SecureStore.getItemAsync(key);
}

async function secureDelete(key) {
  if (isWeb) {
    await AsyncStorage.removeItem(`secure_${key}`);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

async function randomSalt() {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPin(pin, salt) {
  return Crypto.digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    `${salt}::${pin}`,
    { encoding: CryptoEncoding.HEX }
  );
}

export async function isAppLockEnabled() {
  try {
    return (await AsyncStorage.getItem(K_ENABLED)) === 'true';
  } catch {
    return false;
  }
}

export async function isBiometricUnlockEnabled() {
  try {
    return (await AsyncStorage.getItem(K_BIOMETRIC)) === 'true';
  } catch {
    return false;
  }
}

export async function hasPinConfigured() {
  const h = await secureGet(SEC_HASH);
  return !!h;
}

export async function setBiometricEnabled(enabled) {
  await AsyncStorage.setItem(K_BIOMETRIC, enabled ? 'true' : 'false');
}

/** Первичная установка PIN (дважды совпадающий) */
export async function setupPin(pin) {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error('PIN: 4–6 цифр');
  }
  const salt = await randomSalt();
  const h = await hashPin(pin, salt);
  await secureSet(SEC_SALT, salt);
  await secureSet(SEC_HASH, h);
  await AsyncStorage.setItem(K_ENABLED, 'true');
}

export async function verifyPin(pin) {
  const salt = await secureGet(SEC_SALT);
  const stored = await secureGet(SEC_HASH);
  if (!salt || !stored) return false;
  const h = await hashPin(pin, salt);
  return h === stored;
}

export async function changePin(oldPin, newPin) {
  const ok = await verifyPin(oldPin);
  if (!ok) throw new Error('Неверный текущий PIN');
  if (!/^\d{4,6}$/.test(newPin)) {
    throw new Error('Новый PIN: 4–6 цифр');
  }
  const salt = await randomSalt();
  const h = await hashPin(newPin, salt);
  await secureSet(SEC_SALT, salt);
  await secureSet(SEC_HASH, h);
}

/** Отключить защиту (после проверки PIN на вызывающей стороне) */
export async function disableAppLock() {
  await secureDelete(SEC_HASH);
  await secureDelete(SEC_SALT);
  await AsyncStorage.setItem(K_ENABLED, 'false');
  await AsyncStorage.setItem(K_BIOMETRIC, 'false');
}
