import { useState, useEffect, useRef } from 'react';
import '../styles/tasks.css';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;
const CENTER_OFFSET = ITEM_HEIGHT; // selected row = middle of 3 visible

const generateNumbers = (max: number): string[] =>
  Array.from({ length: max + 1 }, (_, i) => i.toString().padStart(2, '0'));

const getTranslateY = (index: number) => -index * ITEM_HEIGHT + CENTER_OFFSET;

// ─── Reusable drum column (INFINITE LOOP) ────────────────────────────────────
interface DrumColumnProps {
  items: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  max: number;
}

function DrumColumn({ items, selectedIndex, onIndexChange, max }: DrumColumnProps) {
  // Triple the items for infinite scroll illusion
  const tripleItems = [...items, ...items, ...items];
  const itemsCount = items.length;
  
  // Start in the middle third
  const initialIndex = itemsCount + selectedIndex;
  const [translate, setTranslate] = useState(getTranslateY(initialIndex));
  const currentIndex = useRef(initialIndex);

  // sync when parent resets
  useEffect(() => {
    const newIndex = itemsCount + selectedIndex;
    currentIndex.current = newIndex;
    setTranslate(getTranslateY(newIndex));
  }, [selectedIndex, itemsCount]);

  // ── helpers ──────────────────────────────────────────────────────────────
  const getRealIndex = (index: number) => {
    // Modulo to get actual value index (0 to items.length-1)
    return ((index % itemsCount) + itemsCount) % itemsCount;
  };

  const snap = (newIndex: number) => {
    const realIndex = getRealIndex(newIndex);
    
    // Check if we need to silently jump back to middle
    if (newIndex < itemsCount * 0.5 || newIndex > itemsCount * 2.5) {
      // Jump to middle third with same value
      const middleIndex = itemsCount + realIndex;
      currentIndex.current = middleIndex;
      // Jump without animation
      setTranslate(getTranslateY(middleIndex));
      onIndexChange(realIndex);
    } else {
      currentIndex.current = newIndex;
      setTranslate(getTranslateY(newIndex));
      onIndexChange(realIndex);
    }
  };

  // ── touch ────────────────────────────────────────────────────────────────
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

  // ── mouse drag ───────────────────────────────────────────────────────────
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

  // ── wheel ────────────────────────────────────────────────────────────────
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

// ─── Mobile drum sheet ───────────────────────────────────────────────────────
function MobileDrumPicker({ value, onChange, onClose }: TimePickerProps) {
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

        {/* columns + colon aligned to drum centre */}
        <div style={{display:'flex', alignItems:'flex-end', gap:'8px', justifyContent:'center'}}>
          <div className="time-picker-column">
            <div className="time-picker-label">ЧАСЫ</div>
            <DrumColumn items={hoursList} selectedIndex={hourIndex} onIndexChange={setHourIndex} max={23} />
          </div>

          {/* colon: sits at the level of the drum, centred vertically (132px = 3×44px) */}
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

// ─── Desktop input ───────────────────────────────────────────────────────────
function DesktopTimeInput({ value, onChange, onClose }: TimePickerProps) {
  const [localValue, setLocalValue] = useState(value || '');

  return (
    <div
      className="time-picker-overlay"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-bg)',
          borderRadius: 16,
          padding: '32px 36px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          minWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-text-muted)', margin: 0 }}>
          ВЫБЕРИТЕ ВРЕМЯ
        </h3>

        {/* Большое поле ввода */}
        <input
          type="time"
          value={localValue}
          onChange={e => setLocalValue(e.target.value)}
          autoFocus
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: 'var(--color-text)',
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            borderRadius: 12,
            padding: '12px 20px',
            outline: 'none',
            letterSpacing: '0.05em',
            textAlign: 'center',
            width: '100%',
            cursor: 'text',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
          onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
        />

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
              flex: 1, padding: '11px', borderRadius: 10,
              border: 'none',
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

// ─── Main export ─────────────────────────────────────────────────────────────
export default function TimePicker(props: TimePickerProps) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : true
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return isMobile ? <MobileDrumPicker {...props} /> : <DesktopTimeInput {...props} />;
}
