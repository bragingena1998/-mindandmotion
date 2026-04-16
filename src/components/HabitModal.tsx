// ========================================
// Модалка создания/редактирования привычки
// ========================================

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Habit, createHabit, updateHabit } from '../api/habits';
import DatePicker from './DatePicker';

interface HabitModalProps {
  habit: Habit | null; // null = создание, объект = редактирование
  year: number;
  month: number;
  isMobile: boolean;
  onClose: () => void;
  onSave: () => void;
}

const UNIT_OPTIONS = ['Дни', 'Часы', 'Кол-во'];
const DAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0]; // 0 = Вс

export default function HabitModal({
  habit,
  year,
  month,
  isMobile,
  onClose,
  onSave,
}: HabitModalProps) {
  // ── Form State ───────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Дни');
  const [customUnit, setCustomUnit] = useState('');
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [plan, setPlan] = useState(1);
  const [targetType, setTargetType] = useState<'daily' | 'monthly' | 'period'>('monthly');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // ── UI State ─────────────────────────────────────────────────────────────
  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Initialize form ──────────────────────────────────────────────────────
  useEffect(() => {
    if (habit) {
      // Редактирование — заполняем из habit
      setName(habit.name);
      const isPresetUnit = UNIT_OPTIONS.includes(habit.unit);
      setUnit(isPresetUnit ? habit.unit : 'custom');
      setCustomUnit(isPresetUnit ? '' : habit.unit);
      setShowCustomUnit(!isPresetUnit);
      setPlan(habit.plan || 1);
      setTargetType(habit.targetType || 'monthly');
      setDaysOfWeek(habit.daysOfWeek || []);
      setStartDate(habit.startDate ? habit.startDate.substring(0, 10) : '');
      setEndDate(habit.endDate ? habit.endDate.substring(0, 10) : '');
    } else {
      // Создание — дефолты
      setName('');
      setUnit('Дни');
      setCustomUnit('');
      setShowCustomUnit(false);
      setPlan(1);
      setTargetType('monthly');
      setDaysOfWeek([]);
      setStartDate('');
      setEndDate('');
    }
    setNameError('');
    setError('');
  }, [habit]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleUnitSelect = (u: string) => {
    if (u === 'custom') {
      setShowCustomUnit(true);
      setUnit('custom');
    } else {
      setShowCustomUnit(false);
      setUnit(u);
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      setNameError('Введите название');
      return;
    }
    setNameError('');

    const finalUnit = showCustomUnit ? customUnit.trim() || 'раз' : unit;

    try {
      setSaving(true);
      setError('');

      if (habit) {
        // Редактирование — передать ВСЕ поля
        await updateHabit(habit.id, {
          name: name.trim(),
          unit: finalUnit,
          plan,
          targetType,
          daysOfWeek,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }, year, month);
      } else {
        // Создание
        await createHabit({
          name: name.trim(),
          unit: finalUnit,
          plan,
          targetType,
          daysOfWeek,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          orderIndex: 0,
          year,
          month,
        });
      }
      onSave();
    } catch (err) {
      setError('Ошибка сохранения');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className={`modal-content habit-modal ${isMobile ? 'mobile' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{habit ? 'Редактировать привычку' : 'Новая привычка'}</h2>
          <button className="modal-close" onClick={handleClose} disabled={saving}>
            <X size={20} />
          </button>
        </div>

        <div className="habit-form">
          {/* Name */}
          <div className="form-group">
            <label className="form-label">Название *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setNameError('');
              }}
              placeholder="Например: Чтение"
              disabled={saving}
            />
            {nameError && <span className="form-error">{nameError}</span>}
          </div>

          {/* Unit */}
          <div className="form-group">
            <label className="form-label">Единица измерения</label>
            <div className="unit-buttons">
              {UNIT_OPTIONS.map(u => (
                <button
                  key={u}
                  type="button"
                  className={`unit-btn ${unit === u && !showCustomUnit ? 'active' : ''}`}
                  onClick={() => handleUnitSelect(u)}
                  disabled={saving}
                >
                  {u}
                </button>
              ))}
              <button
                type="button"
                className={`unit-btn ${showCustomUnit ? 'active' : ''}`}
                onClick={() => handleUnitSelect('custom')}
                disabled={saving}
              >
                Другое...
              </button>
            </div>
            {showCustomUnit && (
              <input
                type="text"
                className="form-input custom-unit-input"
                value={customUnit}
                onChange={e => setCustomUnit(e.target.value)}
                placeholder="Своя единица"
                disabled={saving}
              />
            )}
          </div>

          {/* Plan */}
          <div className="form-group">
            <label className="form-label">План (количество)</label>
            <input
              type="number"
              className="form-input"
              value={plan}
              onChange={e => setPlan(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              disabled={saving}
            />
          </div>

          {/* Target Type */}
          <div className="form-group">
            <label className="form-label">Тип цели</label>
            <div className="target-type-buttons">
              {[
                { value: 'daily', label: 'В день' },
                { value: 'monthly', label: 'В месяц' },
                { value: 'period', label: 'За период' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`target-type-btn ${targetType === option.value ? 'active' : ''}`}
                  onClick={() => setTargetType(option.value as typeof targetType)}
                  disabled={saving}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Days of Week */}
          <div className="form-group">
            <label className="form-label">Дни недели (необязательно)</label>
            <div className="days-selector">
              {DAY_LABELS.map((label, idx) => {
                const value = DAY_VALUES[idx];
                const isSelected = daysOfWeek.includes(value);
                return (
                  <button
                    key={label}
                    type="button"
                    className={`day-circle ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleDayOfWeek(value)}
                    disabled={saving}
                    title={label}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          <div className="form-group dates-row">
            <div className="date-field">
              <label className="form-label">Начало</label>
              <DatePicker
                value={startDate}
                onChange={(val) => setStartDate(val)}
              />
            </div>
            <div className="date-field">
              <label className="form-label">Конец</label>
              <DatePicker
                value={endDate}
                onChange={(val) => setEndDate(val)}
              />
            </div>
          </div>

          {/* Error */}
          {error && <div className="form-error-message">{error}</div>}

          {/* Actions */}
          <div className="form-actions">
            <button className="btn-secondary" onClick={handleClose} disabled={saving}>
              Отмена
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : habit ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
