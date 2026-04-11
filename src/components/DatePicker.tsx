import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import '../styles/tasks.css';

interface DatePickerProps {
  value: string; // "YYYY-MM-DD" или ""
  onChange: (date: string) => void;
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0, Sunday = 6
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or use today
  const today = new Date();
  const currentDate = value ? new Date(value) : today;
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth());

  const selectedDate = value ? new Date(value) : null;
  const todayStr = today.toISOString().slice(0, 10);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Update view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDateSelect = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  // Generate calendar days
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const days: (number | null)[] = [];

  // Empty cells for days before the first day of month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const displayValue = formatDateForDisplay(value);

  return (
    <div ref={containerRef} className="date-picker-container">
      {/* Input field */}
      <div
        className={`date-picker-input ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar size={16} className="date-picker-icon" />
        <span className={displayValue ? '' : 'placeholder'}>
          {displayValue || 'Выберите дату'}
        </span>
      </div>

      {/* Dropdown calendar */}
      {isOpen && (
        <div className="date-picker-dropdown">
          {/* Header with month/year and navigation */}
          <div className="date-picker-header">
            <button
              className="date-picker-nav-btn"
              onClick={handlePrevMonth}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="date-picker-month-year">
              {MONTHS[viewMonth]} {viewYear}
            </div>

            <button
              className="date-picker-nav-btn"
              onClick={handleNextMonth}
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="date-picker-weekdays">
            {WEEKDAYS.map(day => (
              <div key={day} className="date-picker-weekday">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="date-picker-days">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="date-picker-day empty" />;
              }

              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getFullYear() === viewYear;
              const isToday = dateStr === todayStr;
              const dateObj = new Date(viewYear, viewMonth, day);
              const isPast = dateObj < new Date(todayStr);

              return (
                <button
                  key={day}
                  type="button"
                  className={`date-picker-day ${
                    isSelected ? 'selected' : ''
                  } ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}
                  onClick={() => handleDateSelect(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <div className="date-picker-footer">
            <button
              type="button"
              className="date-picker-today-btn"
              onClick={() => {
                const todayStr = new Date().toISOString().slice(0, 10);
                onChange(todayStr);
                setIsOpen(false);
              }}
            >
              Сегодня
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
