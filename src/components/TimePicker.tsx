import { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/tasks.css';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;

// Generate array 00-23 or 00-59
const generateNumbers = (max: number): string[] => {
  return Array.from({ length: max + 1 }, (_, i) => i.toString().padStart(2, '0'));
};

// Mobile drum picker component — ФАЙЛ 4 FIX: 3 строки, selected в центре
function MobileDrumPicker({ value, onChange, onClose }: TimePickerProps) {
  const [hours, minutes] = value ? value.split(':') : ['12', '00'];
  const [selectedHour, setSelectedHour] = useState(hours);
  const [selectedMinute, setSelectedMinute] = useState(minutes);

  const hoursList = generateNumbers(23);
  const minutesList = generateNumbers(59);

  const CENTER_OFFSET = ITEM_HEIGHT; // 44px — смещение чтобы selected был в центре (вторая строка)

  // Правильная формула: translateY = -selectedIndex * 44 + 44
  const getTranslateY = (index: number) => -index * ITEM_HEIGHT + CENTER_OFFSET;

  // Touch handling for hours column
  const hoursStartY = useRef<number>(0);
  const hoursCurrentIndex = useRef<number>(parseInt(hours));
  const [hoursTranslate, setHoursTranslate] = useState(getTranslateY(parseInt(hours)));

  const handleHoursTouchStart = (e: React.TouchEvent) => {
    hoursStartY.current = e.touches[0].clientY;
  };

  const handleHoursTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - hoursStartY.current;
    // Предпросмотр без snap
    const newIndex = Math.max(0, Math.min(23, hoursCurrentIndex.current - Math.round(diff / ITEM_HEIGHT)));
    setHoursTranslate(getTranslateY(newIndex));
  };

  const handleHoursTouchEnd = (e: React.TouchEvent) => {
    const currentY = e.changedTouches[0].clientY;
    const diff = currentY - hoursStartY.current;
    // Snap к ближайшему
    const newIndex = Math.max(0, Math.min(23, hoursCurrentIndex.current - Math.round(diff / ITEM_HEIGHT)));
    hoursCurrentIndex.current = newIndex;
    setHoursTranslate(getTranslateY(newIndex));
    setSelectedHour(hoursList[newIndex]);
  };

  // Touch handling for minutes column
  const minutesStartY = useRef<number>(0);
  const minutesCurrentIndex = useRef<number>(parseInt(minutes));
  const [minutesTranslate, setMinutesTranslate] = useState(getTranslateY(parseInt(minutes)));

  const handleMinutesTouchStart = (e: React.TouchEvent) => {
    minutesStartY.current = e.touches[0].clientY;
  };

  const handleMinutesTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - minutesStartY.current;
    const newIndex = Math.max(0, Math.min(59, minutesCurrentIndex.current - Math.round(diff / ITEM_HEIGHT)));
    setMinutesTranslate(getTranslateY(newIndex));
  };

  const handleMinutesTouchEnd = (e: React.TouchEvent) => {
    const currentY = e.changedTouches[0].clientY;
    const diff = currentY - minutesStartY.current;
    const newIndex = Math.max(0, Math.min(59, minutesCurrentIndex.current - Math.round(diff / ITEM_HEIGHT)));
    minutesCurrentIndex.current = newIndex;
    setMinutesTranslate(getTranslateY(newIndex));
    setSelectedMinute(minutesList[newIndex]);
  };

  const handleSave = () => {
    onChange(`${selectedHour}:${selectedMinute}`);
    onClose();
  };

  return (
    <div className="time-picker-overlay" onClick={onClose}>
      <div className="time-picker-sheet" onClick={e => e.stopPropagation()}>
        <div className="time-picker-handle" />
        <h3 className="time-picker-title">ВЫБЕРИТЕ ВРЕМЯ</h3>

        <div className="time-picker-columns">
          {/* Hours column */}
          <div className="time-picker-column">
            <div className="time-picker-label">ЧАСЫ</div>
            <div
              className="time-picker-drum"
              style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT, overflow: 'hidden', position: 'relative' }}
            >
              <div
                className="time-picker-drum-inner"
                style={{
                  transform: `translateY(${hoursTranslate}px)`,
                  transition: 'transform 150ms ease-out',
                }}
              >
                {hoursList.map((hour) => (
                  <div
                    key={hour}
                    className="time-picker-item"
                    style={{ height: ITEM_HEIGHT }}
                  >
                    {hour}
                  </div>
                ))}
              </div>
              {/* Линии разделители — до и после центральной строки */}
              <div className="time-picker-line time-picker-line-top" />
              <div className="time-picker-line time-picker-line-bottom" />
            </div>
          </div>

          {/* Divider */}
          <div className="time-picker-divider">:</div>

          {/* Minutes column */}
          <div className="time-picker-column">
            <div className="time-picker-label">МИНУТЫ</div>
            <div
              className="time-picker-drum"
              style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT, overflow: 'hidden', position: 'relative' }}
            >
              <div
                className="time-picker-drum-inner"
                style={{
                  transform: `translateY(${minutesTranslate}px)`,
                  transition: 'transform 150ms ease-out',
                }}
              >
                {minutesList.map((minute) => (
                  <div
                    key={minute}
                    className="time-picker-item"
                    style={{ height: ITEM_HEIGHT }}
                  >
                    {minute}
                  </div>
                ))}
              </div>
              {/* Линии разделители */}
              <div className="time-picker-line time-picker-line-top" />
              <div className="time-picker-line time-picker-line-bottom" />
            </div>
          </div>
        </div>

        <div className="time-picker-actions">
          <button className="time-picker-btn time-picker-btn-primary" onClick={handleSave}>
            СОХРАНИТЬ
          </button>
          <button className="time-picker-btn time-picker-btn-ghost" onClick={onClose}>
            ОТМЕНА
          </button>
        </div>
      </div>
    </div>
  );
}

// Desktop styled input
function DesktopTimeInput({ value, onChange, onClose }: TimePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="time-picker-overlay" onClick={onClose}>
      <div className="time-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="time-picker-modal-header">
          <h3 className="time-picker-title">ВЫБЕРИТЕ ВРЕМЯ</h3>
          <button className="time-picker-close" onClick={onClose}>✕</button>
        </div>

        <div className="time-picker-input-wrapper">
          <input
            type="time"
            className="time-picker-desktop-input"
            value={value}
            onChange={handleChange}
            autoFocus
          />
        </div>

        <div className="time-picker-actions">
          <button className="time-picker-btn time-picker-btn-primary" onClick={onClose}>
            ГОТОВО
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component with responsive behavior
export default function TimePicker(props: TimePickerProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when picker is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return isMobile ? <MobileDrumPicker {...props} /> : <DesktopTimeInput {...props} />;
}
