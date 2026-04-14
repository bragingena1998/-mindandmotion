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
            onChange={e => onChange(e.target.value)}
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
