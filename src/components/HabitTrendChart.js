import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText, Rect } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');
const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

const HabitTrendChart = ({ data, month, year, colors }) => {
  const W = screenWidth - 32;
  const H = 140;
  const PAD = { top: 16, right: 16, bottom: 16, left: 16 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  if (!data || data.length === 0) return null;

  // Построение точек
  const points = data.map((d, i) => {
    const x = PAD.left + (i / (data.length - 1)) * chartW;
    const y = PAD.top + chartH - (d.pct / 100) * chartH;
    return { x, y, ...d };
  });

  // Построение пути для area
  const areaPath = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    return `${path} L ${point.x} ${point.y}`;
  }, '');

  // Замыкаем area path до нижней границы
  const closedAreaPath = `${areaPath} L ${points[points.length - 1].x} ${PAD.top + chartH} L ${points[0].x} ${PAD.top + chartH} Z`;

  // Находим максимум для круга
  const maxPoint = points.reduce((max, point) => point.pct > max.pct ? point : max, points[0]);
  const lastPoint = points[points.length - 1];

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, padding: 12, marginTop: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMain }}>Тенденция выполнения</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>{MONTH_NAMES[month - 1]} {year}</Text>
      </View>
      
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="trendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.accent1 || '#f97316'} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={colors.accent1 || '#f97316'} stopOpacity={0.02} />
          </LinearGradient>
          <LinearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#ec4899" />
            <Stop offset="100%" stopColor={colors.accent1 || '#f97316'} />
          </LinearGradient>
        </Defs>

        {/* Горизонтальные пунктирные линии */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = PAD.top + chartH - (pct / 100) * chartH;
          return (
            <Line
              key={pct}
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke="rgba(148,163,184,0.15)"
              strokeWidth={1}
              strokeDasharray="3,6"
            />
          );
        })}

        {/* Area заливка */}
        <Path
          d={closedAreaPath}
          fill="url(#trendGrad)"
        />

        {/* Line */}
        <Path
          d={areaPath}
          stroke="url(#lineGrad)"
          strokeWidth={2.5}
          fill="none"
        />

        {/* Круг на максимуме */}
        <Circle
          cx={maxPoint.x}
          cy={maxPoint.y}
          r={4}
          fill={colors.accent1 || '#f97316'}
        />

        {/* Круг на последней точке */}
        <Circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={5}
          fill="#ec4899"
        />

        {/* Текст на последней точке */}
        <SvgText
          x={lastPoint.x}
          y={lastPoint.y - 10}
          fontSize={11}
          fontWeight="700"
          fill="#ec4899"
          textAnchor="middle"
        >
          {lastPoint.pct}%
        </SvgText>
      </Svg>
    </View>
  );
};

export default HabitTrendChart;
