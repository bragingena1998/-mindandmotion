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

// Mobile drum picker component
function MobileDrumPicker({ value, onChange, onClose }: TimePickerProps) {
  const [hours, minutes] = value ? value.split(':') : ['12', '00'];
  const [selectedHour, setSelectedHour] = useState(hours);
  const [selectedMinute, setSelectedMinute] = useState(minutes);

  const hoursList = generateNumbers(23);
  const minutesList = generateNumbers(59);

  // Touch handling for hours column
  const hoursContainerRef = useRef<HTMLDivElement>(null);
  const hoursStartY = useRef<number>(0);
  const hoursCurrentTranslate = useRef<number>(-parseInt(hours) * ITEM_HEIGHT);
  const hoursPrevTranslate = useRef<number>(-parseInt(hours) * ITEM_HEIGHT);
  const [hoursTranslate, setHoursTranslate] = useState(-parseInt(hours) * ITEM_HEIGHT);

  const constrainHours = useCallback((translate: number) => {
    const min = -(hoursList.length - 1) * ITEM_HEIGHT;
    const max = 0;
    return Math.max(min, Math.min(max, translate));
  }, [hoursList.length]);

  const handleHoursTouchStart = (e: React.TouchEvent) => {
    hoursStartY.current = e.touches[0].clientY;
    hoursPrevTranslate.current = hoursCurrentTranslate.current;
  };

  const handleHoursTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - hoursStartY.current;
    const newTranslate = constrainHours(hoursPrevTranslate.current + diff);
    hoursCurrentTranslate.current = newTranslate;
    setHoursTranslate(newTranslate);
  };

  const handleHoursTouchEnd = () => {
    // Snap to nearest item
    const index = Math.round(-hoursCurrentTranslate.current / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(hoursList.length - 1, index));
    const snapTranslate = -clampedIndex * ITEM_HEIGHT;
    hoursCurrentTranslate.current = snapTranslate;
    setHoursTranslate(snapTranslate);
    setSelectedHour(hoursList[clampedIndex]);
  };

  // Touch handling for minutes column
  const minutesContainerRef = useRef<HTMLDivElement>(null);
  const minutesStartY = useRef<number>(0);
  const minutesCurrentTranslate = useRef<number>(-parseInt(minutes) * ITEM_HEIGHT);
  const minutesPrevTranslate = useRef<number>(-parseInt(minutes) * ITEM_HEIGHT);
  const [minutesTranslate, setMinutesTranslate] = useState(-parseInt(minutes) * ITEM_HEIGHT);

  const constrainMinutes = useCallback((translate: number) => {
    const min = -(minutesList.length - 1) * ITEM_HEIGHT;
    const max = 0;
    return Math.max(min, Math.min(max, translate));
  }, [minutesList.length]);

  const handleMinutesTouchStart = (e: React.TouchEvent) => {
    minutesStartY.current = e.touches[0].clientY;
    minutesPrevTranslate.current = minutesCurrentTranslate.current;
  };

  const handleMinutesTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - minutesStartY.current;
    const newTranslate = constrainMinutes(minutesPrevTranslate.current + diff);
    minutesCurrentTranslate.current = newTranslate;
    setMinutesTranslate(newTranslate);
  };

  const handleMinutesTouchEnd = () => {
    const index = Math.round(-minutesCurrentTranslate.current / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(minutesList.length - 1, index));
    const snapTranslate = -clampedIndex * ITEM_HEIGHT;
    minutesCurrentTranslate.current = snapTranslate;
    setMinutesTranslate(snapTranslate);
    setSelectedMinute(minutesList[clampedIndex]);
  };

  const handleSave = () => {
    onChange(`${selectedHour}:${selectedMinute}`);
    onClose();
  };

  // Calculate opacity based on distance from center
  const getItemStyle = (index: number, translate: number) => {
    const itemCenter = -index * ITEM_HEIGHT - translate;
    const distance = Math.abs(itemCenter);
    const isCenter = distance < ITEM_HEIGHT / 2;
    const isAdjacent = distance < ITEM_HEIGHT * 1.5 && !isCenter;

    return {
      opacity: isCenter ? 1 : isAdjacent ? 0.4 : 0,
      transform: `scale(${isCenter ? 1 : isAdjacent ? 0.9 : 0.8})`,
      fontSize: isCenter ? '20px' : '16px',
      fontWeight: isCenter ? 600 : 400,
    };
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
              ref={hoursContainerRef}
              className="time-picker-drum"
              onTouchStart={handleHoursTouchStart}
              onTouchMove={handleHoursTouchMove}
              onTouchEnd={handleHoursTouchEnd}
              style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}
            >
              <div
                className="time-picker-drum-inner"
                style={{ transform: `translateY(${hoursTranslate}px)` }}
              >
                {hoursList.map((hour, index) => (
                  <div
                    key={hour}
                    className="time-picker-item"
                    style={{
                      height: ITEM_HEIGHT,
                      ...getItemStyle(index, hoursTranslate),
                    }}
                  >
                    {hour}
                  </div>
                ))}
              </div>
              {/* Center highlight line */}
              <div className="time-picker-center-line" />
            </div>
          </div>

          {/* Divider */}
          <div className="time-picker-divider">:</div>

          {/* Minutes column */}
          <div className="time-picker-column">
            <div className="time-picker-label">МИНУТЫ</div>
            <div
              ref={minutesContainerRef}
              className="time-picker-drum"
              onTouchStart={handleMinutesTouchStart}
              onTouchMove={handleMinutesTouchMove}
              onTouchEnd={handleMinutesTouchEnd}
              style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}
            >
              <div
                className="time-picker-drum-inner"
                style={{ transform: `translateY(${minutesTranslate}px)` }}
              >
                {minutesList.map((minute, index) => (
                  <div
                    key={minute}
                    className="time-picker-item"
                    style={{
                      height: ITEM_HEIGHT,
                      ...getItemStyle(index, minutesTranslate),
                    }}
                  >
                    {minute}
                  </div>
                ))}
              </div>
              {/* Center highlight line */}
              <div className="time-picker-center-line" />
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
