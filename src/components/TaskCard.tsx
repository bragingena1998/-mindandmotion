import { Trash2, Pencil, RefreshCw } from 'lucide-react';
import type { Task, Folder } from '../api/tasks';

interface TaskCardProps {
  task: Task;
  folder?: Folder | null;
  onToggle: (id: number, done: boolean) => void;
  onDelete: (id: number) => void;
  onEdit?: (task: Task) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // Берём только дату без времени
  const datePart = dateStr.substring(0, 10);
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return '';
  return `${day}.${month}`;
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  // Если ISO datetime — извлекаем время в локальном timezone
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }
  return timeStr.slice(0, 5); // HH:MM
}

function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 1: return 'НИЗКИЙ';
    case 2: return 'СРЕДНИЙ';
    case 3: return 'ВЫСОКИЙ';
    default: return 'СРЕДНИЙ';
  }
}

function getPriorityClass(priority: number): string {
  switch (priority) {
    case 1: return 'low';
    case 2: return 'medium';
    case 3: return 'high';
    default: return 'medium';
  }
}

function getFolderEmoji(folderName?: string): string {
  if (!folderName) return '📁';
  const lower = folderName.toLowerCase();
  if (lower.includes('дом')) return '🏠';
  if (lower.includes('работ')) return '💼';
  if (lower.includes('учеб')) return '📚';
  if (lower.includes('здоров')) return '💪';
  if (lower.includes('финанс')) return '💰';
  if (lower.includes('покуп')) return '🛒';
  if (lower.includes('путешеств')) return '✈️';
  if (lower.includes('семь')) return '❤️';
  return '📁';
}

function getTaskStatus(task: Task, todayStr: string): { label: string; className: string } {
  if (task.done) return { label: '', className: '' };

  if (task.date) {
    const taskDate = task.date.substring(0, 10);
    // Сравниваем строки YYYY-MM-DD
    if (taskDate < todayStr) return { label: '🔥 ПРОСРОЧЕНО', className: 'status-overdue' };
    if (taskDate === todayStr) return { label: '⚡ СЕГОДНЯ', className: 'status-today' };
  }

  return { label: '', className: '' };
}

export default function TaskCard({ task, folder, onToggle, onDelete, onEdit }: TaskCardProps) {
  const handleToggle = () => {
    onToggle(task.id, !task.done);
  };

  const handleDelete = () => {
    if (confirm('Удалить задачу?')) {
      onDelete(task.id);
    }
  };

  const handleEdit = () => {
    onEdit?.(task);
  };

  // Получаем сегодняшнюю дату как строку YYYY-MM-DD
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const dateStr = formatDate(task.date);
  const isOverdue = !task.done && task.date && task.date.substring(0, 10) < todayStr;
  const status = getTaskStatus(task, todayStr);

  // Проверяем оба поля для recurrence
  const hasRecurrence = (task.recurrence && task.recurrence !== 'none') ||
                       (task.recurrenceType && task.recurrenceType !== 'none');

  return (
    <div className={`task-card-compact ${task.done ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}>
      {/* Checkbox */}
      <div
        className={`task-checkbox ${task.done ? 'checked' : ''}`}
        onClick={handleToggle}
      />

      {/* Content */}
      <div className="task-content-compact">
        {/* Row 1: Title + Actions */}
        <div className="task-header-compact">
          <h3 className="task-title-compact">{task.title}</h3>
          <div className="task-actions-compact">
            {onEdit && (
              <button className="task-action-btn" onClick={handleEdit}>
                <Pencil size={12} />
              </button>
            )}
            <button className="task-action-btn" onClick={handleDelete}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Row 2: Status (if not empty) */}
        {status.label && (
          <div className="task-status-compact">
            <span className={`task-status-badge ${status.className}`}>{status.label}</span>
          </div>
        )}

        {/* Row 3: Meta info — всё в одной строке */}
        <div className="task-meta-compact">
          {dateStr && <span className="meta-date">{dateStr}</span>}
          {task.time && <span className="meta-time">{formatTime(task.time)}</span>}
          {folder && (
            <span className="meta-folder">
              {/* ФАЙЛ 6: используем folder.icon из API, или fallback на emoji по названию */}
              {folder.icon || getFolderEmoji(folder.name)} {folder.name}
            </span>
          )}
          <span className={`meta-priority ${getPriorityClass(task.priority)}`}>
            {getPriorityLabel(task.priority)}
          </span>
          {hasRecurrence && (
            <span className="meta-recurrence" title="Повторяющаяся задача">
              ↻
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
