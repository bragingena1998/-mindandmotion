// src/theme/shadows.js
// Тени для карточек и кнопок

export const shadows = {
  // Мягкая большая тень (для модалок)
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.95,
    shadowRadius: 60,
    elevation: 24, // для Android
  },

  // Лёгкая тень (для кнопок)
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  // Свечение акцента (для кнопок с градиентом)
  accent: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  }),
};

