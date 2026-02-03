// src/theme/themes.js
// Объединение всех тем в один объект

import {
  defaultTheme,
  stormTheme,
  iceTheme,
  bloodTheme,
  toxicTheme,
  glitchTheme,
} from './colors';

// Экспортируем все темы
export const themes = {
  default: defaultTheme,
  storm: stormTheme,
  ice: iceTheme,
  blood: bloodTheme,
  toxic: toxicTheme,
  glitch: glitchTheme,
};

// Названия тем для UI (переключатель)
export const themeNames = {
  default: 'Default',
  storm: 'Acid Storm',
  ice: 'Night Subway',
  blood: 'Riot Sunset',
  toxic: 'Toxic Terminal',
  glitch: 'Glitch Violet',
};

