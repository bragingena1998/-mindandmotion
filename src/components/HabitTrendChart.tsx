// ========================================
// SVG-график тенденции выполнения привычек
// ========================================

import { useMemo } from 'react';

interface TrendPoint {
  day: number;
  pct: number;
  hasPlan: boolean;
}

interface Props {
  data: TrendPoint[];
  month: number;
  year: number;
}

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export default function HabitTrendChart({ data, month, year }: Props) {
  const W = 600;
  const H = 160;
  const PAD = { top: 20, right: 16, bottom: 20, left: 16 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const points = useMemo(() => {
    if (data.length < 2) return [];
    return data.map((d, i) => ({
      x: PAD.left + (i / (data.length - 1)) * chartW,
      y: PAD.top + chartH - (d.pct / 100) * chartH,
      pct: d.pct,
      day: d.day,
      hasPlan: d.hasPlan,
    }));
  }, [data]);

  if (points.length < 2) return null;

  // Построить SVG path для линии
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Область под графиком (для gradient fill)
  const areaPath = [
    `M ${points[0].x.toFixed(1)} ${(PAD.top + chartH).toFixed(1)}`,
    ...points.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${points[points.length - 1].x.toFixed(1)} ${(PAD.top + chartH).toFixed(1)}`,
    'Z'
  ].join(' ');

  // Найти максимальный и текущий день
  const maxPoint = points.reduce((a, b) => a.pct > b.pct ? a : b);
  const lastPoint = points[points.length - 1];

  return (
    <div className="habit-trend-wrap">
      <div className="habit-trend-header">
        <span className="habit-trend-title">Тенденция выполнения</span>
        <span className="habit-trend-subtitle">{MONTH_NAMES[month - 1]} {year}</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="habit-trend-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Градиент заливки */}
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-1, #f97316)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-1, #f97316)" stopOpacity="0.02" />
          </linearGradient>
          {/* Градиент линии */}
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-2, #ec4899)" />
            <stop offset="100%" stopColor="var(--accent-1, #f97316)" />
          </linearGradient>
          {/* Свечение */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Clip path */}
          <clipPath id="chartClip">
            <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} />
          </clipPath>
        </defs>

        {/* Горизонтальные направляющие */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = PAD.top + chartH - (pct / 100) * chartH;
          return (
            <line
              key={pct}
              x1={PAD.left} y1={y}
              x2={PAD.left + chartW} y2={y}
              stroke="var(--border-subtle, rgba(148,163,184,0.15))"
              strokeWidth="1"
              strokeDasharray="3 6"
            />
          );
        })}

        {/* Заливка под графиком */}
        <path
          d={areaPath}
          fill="url(#trendGrad)"
          clipPath="url(#chartClip)"
        />

        {/* Линия графика */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          clipPath="url(#chartClip)"
        />

        {/* Точка максимума */}
        {maxPoint.pct > 0 && (
          <circle
            cx={maxPoint.x} cy={maxPoint.y} r="4"
            fill="var(--accent-1, #f97316)"
            stroke="var(--color-bg, #020617)"
            strokeWidth="2"
          />
        )}

        {/* Последняя точка (живая) */}
        <circle
          cx={lastPoint.x} cy={lastPoint.y} r="5"
          fill="var(--accent-2, #ec4899)"
          stroke="var(--color-bg, #020617)"
          strokeWidth="2"
        />
        {/* Пульсирующий круг на последней точке */}
        <circle
          cx={lastPoint.x} cy={lastPoint.y} r="5"
          fill="none"
          stroke="var(--accent-2, #ec4899)"
          strokeWidth="1.5"
          opacity="0.5"
        >
          <animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* % на последней точке */}
        {lastPoint.pct > 0 && (
          <text
            x={Math.min(lastPoint.x + 8, W - 40)}
            y={lastPoint.y - 8}
            fontSize="11"
            fontWeight="700"
            fill="var(--accent-2, #ec4899)"
          >
            {lastPoint.pct}%
          </text>
        )}
      </svg>
    </div>
  );
}
