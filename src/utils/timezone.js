// src/utils/timezone.js
import * as Localization from 'expo-localization';

/**
 * Возвращает timezone устройства (например 'Asia/Tashkent')
 */
export const getUserTimezone = () => {
  return Localization.getLocales?.()?.[0]?.timezone || Localization.timezone || 'UTC';
};

/**
 * Конвертирует UTC time string 'HH:mm' или 'HH:mm:ss' в локальное время устройства
 * Принимает task.time из API (считается UTC)
 * Возвращает строку 'HH:mm' в локальном TZ
 */
export const utcTimeToLocal = (timeStr, dateStr) => {
  if (!timeStr) return null;
  try {
    const moment = require('moment-timezone');
    const tz = getUserTimezone();
    // Собираем ISO строку даты + времени в UTC
    const date = dateStr ? dateStr.split('T')[0] : new Date().toISOString().split('T')[0];
    const utcStr = `${date}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}Z`;
    return moment.utc(utcStr).tz(tz).format('HH:mm');
  } catch {
    return timeStr;
  }
};

/**
 * Конвертирует локальное время 'HH:mm' в UTC 'HH:mm' для отправки на сервер
 */
export const localTimeToUtc = (timeStr, dateStr) => {
  if (!timeStr) return null;
  try {
    const moment = require('moment-timezone');
    const tz = getUserTimezone();
    const date = dateStr ? dateStr.split('T')[0] : new Date().toISOString().split('T')[0];
    const localStr = `${date}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}`;
    return moment.tz(localStr, tz).utc().format('HH:mm');
  } catch {
    return timeStr;
  }
};
