import { useState } from 'react';

interface Props {
  habitName: string;
  day: number;
  currentValue: number; // текущее значение в часах
  onSave: (value: number) => void;
  onClose: () => void;
}

export default function HoursEditModal({ habitName, day, currentValue, onSave, onClose }: Props) {
  const [value, setValue] = useState<string>(currentValue > 0 ? String(currentValue) : '');

  const parsed = parseFloat(value) || 0;

  const handleSave = () => {
    onSave(Math.max(0, parsed));
    onClose();
  };

  const handleClear = () => {
    onSave(0);
    onClose();
  };

  const handleAdjust = (delta: number) => {
    const next = Math.max(0, (parsed || 0) + delta);
    setValue(next === 0 ? '' : String(next));
  };

  return (
    <div className="hours-modal-overlay" onClick={onClose}>
      <div className="hours-modal" onClick={e => e.stopPropagation()}>
        <div className="hours-modal-header">
          <span className="hours-modal-title">⏱ {habitName}</span>
          <span className="hours-modal-day">День {day}</span>
        </div>

        <div className="hours-modal-input-row">
          <button className="hours-adj-btn" onClick={() => handleAdjust(-1)}>−</button>
          <input
            type="number"
            className="hours-input"
            value={value}
            min="0"
            step="0.5"
            placeholder="0"
            onChange={e => setValue(e.target.value)}
            autoFocus
          />
          <span className="hours-unit-label">ч</span>
          <button className="hours-adj-btn" onClick={() => handleAdjust(1)}>+</button>
        </div>

        <div className="hours-modal-actions">
          <button className="hours-btn hours-btn-clear" onClick={handleClear}>
            🗑 Очистить
          </button>
          <button className="hours-btn hours-btn-save" onClick={handleSave}>
            ✓ Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
