import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import type { Folder, CreateTaskData, Task } from '../api/tasks';
import TimePicker from './TimePicker';
import DatePicker from './DatePicker';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskData) => void;
  folders: Folder[];
  editingTask?: Task | null;
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ФАЙЛ 3 FIX: Нормализация ISO даты в YYYY-MM-DD
function normalizeDate(raw: string): string {
  if (!raw) return '';
  // Если ISO с T — берём только дату в локальном времени
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getFolderEmoji(folderName: string): string {
  const lower = folderName.toLowerCase();
  if (lower.includes('дом')) return '🏠';
  if (lower.includes('работ')) return '💼';
  if (lower.includes('учеб')) return '📚';
  if (lower.includes('здоров')) return '💪';
  if (lower.includes('финанс')) return '💰';
  if (lower.includes('покуп')) return '🛒';
  if (lower.includes('путешеств')) return '✈️';
  return '📁';
}

const PRIORITY_OPTIONS = [
  { value: 3 as const, label: 'ВЫСОКИЙ', color: '#fb7185' },
  { value: 2 as const, label: 'СРЕДНИЙ', color: '#fbbf24' },
  { value: 1 as const, label: 'НИЗКИЙ', color: '#9ca3af' },
];

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Без повторения' },
  { value: 'daily', label: 'Каждый день' },
  { value: 'weekly', label: 'Каждую неделю' },
  { value: 'monthly', label: 'Каждый месяц' },
];

export default function TaskModal({ isOpen, onClose, onSubmit, folders, editingTask }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [time, setTime] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [folderId, setFolderId] = useState<number | undefined>(undefined);
  const [recurrence, setRecurrence] = useState('none');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load editing task data
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setComment(editingTask.comment);
      // ФАЙЛ 3 FIX: Нормализуем дату из ISO в YYYY-MM-DD
      setDate(normalizeDate(editingTask.date) || getTodayISO());
      setTime(editingTask.time || '');
      setDeadline(normalizeDate(editingTask.deadline));
      setPriority(editingTask.priority);
      setFolderId(editingTask.folderId || undefined);
      setRecurrence(editingTask.recurrence || 'none');
    } else {
      // Reset form for new task
      setTitle('');
      setComment('');
      setDate(getTodayISO());
      setTime('');
      setDeadline('');
      setPriority(2);
      setFolderId(undefined);
      setRecurrence('none');
      setShowAdvanced(false);
    }
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      comment: comment.trim(),
      date,
      time: time || undefined,
      deadline: deadline || undefined,
      priority,
      folderId: folderId || undefined,
      recurrence: recurrence !== 'none' ? recurrence : undefined
    });

    if (!editingTask) {
      // Reset form only for new tasks
      setTitle('');
      setComment('');
      setDate(getTodayISO());
      setTime('');
      setDeadline('');
      setPriority(2);
      setFolderId(undefined);
      setRecurrence('none');
      setShowAdvanced(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{editingTask ? 'Редактировать задачу' : 'Новая задача'}</h2>
          <button className="modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Название задачи *</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Введите название..."
              autoFocus
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">Дата выполнения</label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          {/* Priority buttons */}
          <div className="form-group">
            <label className="form-label">Приоритет</label>
            <div className="priority-buttons">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`priority-btn ${priority === option.value ? 'active' : ''}`}
                  style={{ '--priority-color': option.color } as React.CSSProperties}
                  onClick={() => setPriority(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Folder chips */}
          <div className="form-group">
            <label className="form-label">Папка</label>
            <div className="folder-chips-scroll form-folder-chips">
              <button
                type="button"
                className={`folder-chip ${folderId === undefined ? 'active' : ''}`}
                onClick={() => setFolderId(undefined)}
              >
                📁 Без папки
              </button>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  type="button"
                  className={`folder-chip ${folderId === folder.id ? 'active' : ''}`}
                  onClick={() => setFolderId(folder.id)}
                >
                  {getFolderEmoji(folder.name)} {folder.name}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced settings toggle */}
          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Доп. настройки
          </button>

          {/* Advanced settings */}
          {showAdvanced && (
            <div className="advanced-settings">
              {/* Time */}
              <div className="form-group">
                <label className="form-label">Точное время</label>
                <div
                  className="time-picker-trigger"
                  onClick={() => setShowTimePicker(true)}
                >
                  <Clock size={16} />
                  <span>{time || '--:--'}</span>
                </div>
              </div>

              {/* Deadline */}
              <div className="form-group">
                <label className="form-label">Дедлайн</label>
                <DatePicker value={deadline} onChange={setDeadline} />
              </div>

              {/* Recurrence */}
              <div className="form-group">
                <label className="form-label">Повторение</label>
                <div className="recurrence-buttons">
                  {RECURRENCE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`recurrence-btn ${recurrence === option.value ? 'active' : ''}`}
                      onClick={() => setRecurrence(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Comment */}
          <div className="form-group">
            <label className="form-label">Комментарий</label>
            <textarea
              className="form-textarea"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>

          <button type="submit" className="btn-primary">
            {editingTask ? 'Сохранить изменения' : 'Создать задачу'}
          </button>
        </form>
      </div>

      {/* Time Picker Modal */}
      {showTimePicker && (
        <TimePicker
          value={time}
          onChange={setTime}
          onClose={() => setShowTimePicker(false)}
        />
      )}
    </div>
  );
}
