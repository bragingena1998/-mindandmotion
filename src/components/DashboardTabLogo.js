import React from 'react';
import Svg, { Defs, LinearGradient, Stop, G, Polygon } from 'react-native-svg';

/**
 * Только три грани (без квадратного фона) — фон задаёт родитель (градиент кнопки).
 */
const DashboardTabLogo = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 512 512">
    <Defs>
      <LinearGradient id="mmTabGold" x1="100%" y1="0%" x2="0%" y2="0%">
        <Stop offset="0%" stopColor="#FFF8E7" />
        <Stop offset="45%" stopColor="#E8C76A" />
        <Stop offset="100%" stopColor="#8B6914" />
      </LinearGradient>
    </Defs>
    <G transform="translate(256, 256)">
      <Polygon points="166.28,96 83.14,48 -83.14,48 -115,96" fill="url(#mmTabGold)" />
      <Polygon points="166.28,96 83.14,48 -83.14,48 -115,96" fill="url(#mmTabGold)" transform="rotate(120)" />
      <Polygon points="166.28,96 83.14,48 -83.14,48 -115,96" fill="url(#mmTabGold)" transform="rotate(240)" />
    </G>
  </Svg>
);

export default DashboardTabLogo;
