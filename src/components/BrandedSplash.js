import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import DashboardTabLogo from './DashboardTabLogo';

const { width } = Dimensions.get('window');

/** Как иконка и splash в app.json — чистый чёрный. */
const BG = '#000000';

/**
 * Стартовый / загрузочный экран: крупный логотип + блик.
 */
const BrandedSplash = () => {
  const { colors } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.6, width * 0.6],
  });

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <View style={[styles.logoWrap, { borderColor: colors.accent1 }]}>
        <LinearGradient
          colors={['#FFF8E7', colors.accent1, '#9A7B2E']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.logoGradient}
        >
          <DashboardTabLogo size={128} />
        </LinearGradient>
        <Animated.View
          style={[styles.shimmerMask, { transform: [{ translateX }] }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shimmerGrad}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmerMask: {
    ...StyleSheet.absoluteFillObject,
    width: 120,
    left: '50%',
    marginLeft: -60,
  },
  shimmerGrad: {
    flex: 1,
    width: '100%',
  },
});

export default BrandedSplash;
