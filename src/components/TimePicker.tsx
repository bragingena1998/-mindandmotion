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
  const [hours, setHours] = useState(() => value ? value.split(':')[0] : '12');
  const [minutes, setMinutes] = useState(() => value ? value.split(':')[1] : '00');
  const [inputMode, setInputMode] = useState<'quick' | 'manual'>('quick');
  const [manualValue, setManualValue] = useState(value || '12:00');

  const QUICK_TIMES = ['07:00','08:00','09:00','10:00','12:00','13:00',
                       '14:00','15:00','18:00','19:00','20:00','22:00'];

  const currentTime = inputMode === 'manual' ? manualValue : `${hours}:${minutes}`;

  const handleQuickSelect = (t: string) => {
    const [h, m] = t.split(':');
    setHours(h);
    setMinutes(m);
    setManualValue(t);
  };

  const adjustHours = (delta: number) => {
    const n = ((parseInt(hours) + delta + 24) % 24);
    setHours(String(n).padStart(2, '0'));
  };

  const adjustMinutes = (delta: number) => {
    const n = ((parseInt(minutes) + delta + 60) % 60);
    setMinutes(String(n).padStart(2, '0'));
  };

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.75)',
               display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}
    >
      <div
        style={{ background:'var(--color-bg)', borderRadius:16, padding:'28px 32px',
                 boxShadow:'0 20px 60px rgba(0,0,0,0.5)', width:360,
                 display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Заголовок + переключатель режима */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
          <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em',
                         color:'var(--color-text-muted)', textTransform:'uppercase' }}>
            Выберите время
          </span>
          <button
            onClick={() => setInputMode(inputMode === 'quick' ? 'manual' : 'quick')}
            style={{ fontSize:11, color:'var(--color-primary)', background:'none',
                     border:'none', cursor:'pointer', fontWeight:600, padding:'2px 6px',
                     borderRadius:6, border:'1px solid var(--color-primary)' }}
          >
            {inputMode === 'quick' ? '⌨ Ввод' : '⚡ Быстрый'}
          </button>
        </div>

        {inputMode === 'quick' ? (
          <>
            {/* Барабан часы:минуты */}
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {/* Часы */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <button onClick={() => adjustHours(1)}
                  style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)',
                           borderRadius:8, width:52, height:32, fontSize:18, cursor:'pointer',
                           color:'var(--color-text)' }}>▲</button>
                <div style={{ fontSize:52, fontWeight:700, color:'var(--color-text)',
                              fontFamily:'monospace', lineHeight:1, width:72, textAlign:'center' }}>
                  {hours}
                </div>
                <button onClick={() => adjustHours(-1)}
                  style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)',
                           borderRadius:8, width:52, height:32, fontSize:18, cursor:'pointer',
                           color:'var(--color-text)' }}>▼</button>
              </div>

              <div style={{ fontSize:48, fontWeight:700, color:'var(--color-text-muted)',
                            fontFamily:'monospace', lineHeight:1, paddingBottom:4 }}>:</div>

              {/* Минуты */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <button onClick={() => adjustMinutes(5)}
                  style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)',
                           borderRadius:8, width:52, height:32, fontSize:18, cursor:'pointer',
                           color:'var(--color-text)' }}>▲</button>
                <div style={{ fontSize:52, fontWeight:700, color:'var(--color-text)',
                              fontFamily:'monospace', lineHeight:1, width:72, textAlign:'center' }}>
                  {minutes}
                </div>
                <button onClick={() => adjustMinutes(-5)}
                  style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)',
                           borderRadius:8, width:52, height:32, fontSize:18, cursor:'pointer',
                           color:'var(--color-text)' }}>▼</button>
              </div>
            </div>

            {/* Быстрые варианты */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, width:'100%' }}>
              {QUICK_TIMES.map(t => (
                <button key={t} onClick={() => handleQuickSelect(t)}
                  style={{ padding:'6px 0', borderRadius:8, fontSize:13, fontWeight:500,
                           border:'1px solid var(--color-border)', cursor:'pointer',
                           background: currentTime === t ? 'var(--color-primary)' : 'var(--color-surface)',
                           color: currentTime === t ? '#fff' : 'var(--color-text-muted)' }}>
                  {t}
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Режим ручного ввода */
          <input
            type="time"
            value={manualValue}
            onChange={e => { setManualValue(e.target.value);
                             const [h,m] = e.target.value.split(':');
                             if(h) setHours(h); if(m) setMinutes(m); }}
            autoFocus
            style={{ fontSize:52, fontWeight:700, color:'var(--color-text)',
                     background:'var(--color-surface)', border:'2px solid var(--color-border)',
                     borderRadius:12, padding:'10px 20px', outline:'none',
                     textAlign:'center', width:'100%', cursor:'text',
                     fontFamily:'monospace', letterSpacing:'0.04em' }}
            onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
            onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
          />
        )}

        <div style={{ display:'flex', gap:10, width:'100%' }}>
          <button
            style={{ flex:1, padding:'11px', borderRadius:10, cursor:'pointer',
                     border:'1.5px solid var(--color-border)', background:'transparent',
                     color:'var(--color-text)', fontWeight:600, fontSize:14 }}
            onClick={onClose}
          >Отмена</button>
          <button
            style={{ flex:1, padding:'11px', borderRadius:10, border:'none',
                     background:'var(--color-primary)', color:'#fff',
                     fontWeight:700, fontSize:14, cursor:'pointer' }}
            onClick={() => { onChange(currentTime); onClose(); }}
          >Готово</button>
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
