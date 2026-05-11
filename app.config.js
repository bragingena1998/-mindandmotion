const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? 'M&M Dev' : 'Mind & Motion',
    slug: 'mindandmotion-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#000000',
          androidMode: 'default',
          androidCollapsedTitle: IS_DEV ? 'M&M Dev' : 'Mind & Motion',
        },
      ],
      'expo-secure-store',
      'expo-localization',
      'expo-sqlite',
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV
        ? 'com.bragin22.mindandmotionmobile.dev'
        : 'com.bragin22.mindandmotionmobile',
      infoPlist: {
        NSFaceIDUsageDescription:
          'Mind&Motion использует Face ID для входа в приложение.',
      },
    },
    android: {
      package: IS_DEV
        ? 'com.bragin22.mindandmotionmobile.dev'
        : 'com.bragin22.mindandmotionmobile',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: 'efa67276-4a28-4c36-94e4-73220f0e5bd0',
      },
    },
  },
};
