import { useState, useEffect, useRef } from 'react';
import '../styles/tasks.css';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export default function TimePicker({ value, onChange, onClose }: TimePickerProps) {
  const [isMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : true);
  return isMobile
    ? <MobileTimePicker value={value} onChange={onChange} onClose={onClose} />
    : <DesktopTimePicker value={value} onChange={onChange} onClose={onClose} />;
}

function DesktopTimePicker({ value, onChange, onClose }: TimePickerProps) {
  const [localValue, setLocalValue] = useState(value || '12:00');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-bg)',
          borderRadius: 16,
          padding: '32px 36px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          width: 340,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 24,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{
          fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
          color: 'var(--color-text-muted)', margin: 0, textTransform: 'uppercase'
        }}>
          Выберите время
        </h3>

        <input
          type="time"
          value={localValue}
          onChange={e => setLocalValue(e.target.value)}
          autoFocus
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: 'var(--color-text)',
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            borderRadius: 12,
            padding: '10px 20px',
            outline: 'none',
            textAlign: 'center',
            width: '100%',
            cursor: 'text',
            fontFamily: 'monospace',
            letterSpacing: '0.04em',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
          onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
        />

        {/* Быстрые варианты */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['08:00','09:00','10:00','12:00','14:00','18:00','20:00','22:00'].map(t => (
            <button
              key={t}
              onClick={() => setLocalValue(t)}
              style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 13,
                border: '1px solid var(--color-border)',
                background: localValue === t ? 'var(--color-primary)' : 'var(--color-surface)',
                color: localValue === t ? '#fff' : 'var(--color-text-muted)',
                cursor: 'pointer', fontWeight: 500,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: '1.5px solid var(--color-border)',
              background: 'transparent', color: 'var(--color-text)',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: 'none',
              background: 'var(--color-primary)', color: '#fff',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
            onClick={() => { onChange(localValue); onClose(); }}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}

// MobileTimePicker — drum wheel picker for mobile
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;
const CENTER_OFFSET = ITEM_HEIGHT;

const generateNumbers = (max: number): string[] =>
  Array.from({ length: max + 1 }, (_, i) => i.toString().padStart(2, '0'));

const getTranslateY = (index: number) => -index * ITEM_HEIGHT + CENTER_OFFSET;

interface DrumColumnProps {
  items: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  max: number;
}

function DrumColumn({ items, selectedIndex, onIndexChange, max }: DrumColumnProps) {
  const tripleItems = [...items, ...items, ...items];
  const itemsCount = items.length;
  const initialIndex = itemsCount + selectedIndex;
  const [translate, setTranslate] = useState(getTranslateY(initialIndex));
  const currentIndex = useRef(initialIndex);

  useEffect(() => {
    const newIndex = itemsCount + selectedIndex;
    currentIndex.current = newIndex;
    setTranslate(getTranslateY(newIndex));
  }, [selectedIndex, itemsCount]);

  const getRealIndex = (index: number) => {
    return ((index % itemsCount) + itemsCount) % itemsCount;
  };

  const snap = (newIndex: number) => {
    const realIndex = getRealIndex(newIndex);
    if (newIndex < itemsCount * 0.5 || newIndex > itemsCount * 2.5) {
      const middleIndex = itemsCount + realIndex;
      currentIndex.current = middleIndex;
      setTranslate(getTranslateY(middleIndex));
      onIndexChange(realIndex);
    } else {
      currentIndex.current = newIndex;
      setTranslate(getTranslateY(newIndex));
      onIndexChange(realIndex);
    }
  };

  const touchStartY = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientY - touchStartY.current;
    const preview = currentIndex.current - Math.round(diff / ITEM_HEIGHT);
    setTranslate(getTranslateY(preview));
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    snap(currentIndex.current - Math.round(diff / ITEM_HEIGHT));
    touchStartY.current = e.changedTouches[0].clientY;
  };

  const mouseStartY = useRef(0);
  const dragging = useRef(false);
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    mouseStartY.current = e.clientY;
    e.preventDefault();
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const diff = e.clientY - mouseStartY.current;
    const preview = currentIndex.current - Math.round(diff / ITEM_HEIGHT);
    setTranslate(getTranslateY(preview));
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const diff = e.clientY - mouseStartY.current;
    snap(currentIndex.current - Math.round(diff / ITEM_HEIGHT));
  };
  const onMouseLeave = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const diff = e.clientY - mouseStartY.current;
    snap(currentIndex.current - Math.round(diff / ITEM_HEIGHT));
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.deltaY > 0 ? 1 : -1;
    snap(currentIndex.current + step);
  };

  return (
    <div
      className="time-picker-drum"
      style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT, overflow: 'hidden', position: 'relative', userSelect: 'none', cursor: 'grab' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onWheel={onWheel}
    >
      <div
        className="time-picker-drum-inner"
        style={{ transform: `translateY(${translate}px)`, transition: 'transform 150ms ease-out' }}
      >
        {tripleItems.map((item, idx) => (
          <div key={`${item}-${idx}`} className="time-picker-item" style={{ height: ITEM_HEIGHT }}>
            {item}
          </div>
        ))}
      </div>
      <div className="time-picker-line time-picker-line-top" />
      <div className="time-picker-line time-picker-line-bottom" />
    </div>
  );
}

function MobileTimePicker({ value, onChange, onClose }: TimePickerProps) {
  const [hours, minutes] = value ? value.split(':') : ['12', '00'];

  const hoursList = generateNumbers(23);
  const minutesList = generateNumbers(59);

  const [hourIndex, setHourIndex] = useState(parseInt(hours));
  const [minuteIndex, setMinuteIndex] = useState(parseInt(minutes));

  const handleSave = () => {
    onChange(`${hoursList[hourIndex]}:${minutesList[minuteIndex]}`);
    onClose();
  };

  return (
    <div className="time-picker-overlay" onClick={onClose}>
      <div className="time-picker-sheet" onClick={e => e.stopPropagation()}>
        <div className="time-picker-handle" />
        <h3 className="time-picker-title">ВЫБЕРИТЕ ВРЕМЯ</h3>

        <div style={{display:'flex', alignItems:'flex-end', gap:'8px', justifyContent:'center'}}>
          <div className="time-picker-column">
            <div className="time-picker-label">ЧАСЫ</div>
            <DrumColumn items={hoursList} selectedIndex={hourIndex} onIndexChange={setHourIndex} max={23} />
          </div>

          <div style={{height: 132, display:'flex', alignItems:'center', fontSize:'24px', fontWeight:'bold', color:'var(--text-primary)'}}>:</div>

          <div className="time-picker-column">
            <div className="time-picker-label">МИНУТЫ</div>
            <DrumColumn items={minutesList} selectedIndex={minuteIndex} onIndexChange={setMinuteIndex} max={59} />
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
