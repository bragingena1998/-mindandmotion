import { Trash2, Pencil, Repeat } from 'lucide-react';
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
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskDate = new Date(dateStr);
  taskDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Завтра';
  if (diffDays === -1) return 'Вчера';

  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
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

function getTaskStatus(task: Task): { label: string; className: string } {
  if (task.done) return { label: '✓ Выполнено', className: 'status-done' };

  if (task.date) {
    const taskDate = new Date(task.date);
    taskDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: '🔥 ПРОСРОЧЕНО', className: 'status-overdue' };
    if (diffDays === 0) return { label: '⚡ СЕГОДНЯ', className: 'status-today' };
    if (diffDays === 1) return { label: '📅 ЗАВТРА', className: 'status-tomorrow' };
  }

  return { label: '📅 В ПЛАНЕ', className: 'status-planned' };
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

  const dateStr = formatDate(task.date);
  const isOverdue = !task.done && task.date && new Date(task.date) < new Date();
  const status = getTaskStatus(task);
  const hasRecurrence = task.recurrence && task.recurrence !== 'none';

  return (
    <div className={`task-card ${task.done ? 'completed' : ''} ${isOverdue ? 'task-card--overdue' : ''}`}>
      {/* Left: Checkbox */}
      <div
        className={`task-checkbox ${task.done ? 'checked' : ''}`}
        onClick={handleToggle}
      />

      {/* Center: Content */}
      <div className="task-content">
        {/* Row 1: Title + Actions */}
        <div className="task-header-row">
          <h3 className="task-title">{task.title}</h3>
          <div className="task-actions">
            {onEdit && (
              <button className="task-edit" onClick={handleEdit}>
                <Pencil size={14} />
              </button>
            )}
            <button className="task-delete" onClick={handleDelete}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Row 2: Status badge */}
        <div className="task-status-row">
          <span className={`task-status ${status.className}`}>{status.label}</span>
        </div>

        {/* Row 3: Meta info */}
        <div className="task-meta">
          <span className={`task-date ${isOverdue ? 'overdue' : ''}`}>
            {dateStr}
          </span>
          {task.time && (
            <span className="task-time">
              {formatTime(task.time)}
            </span>
          )}
          {folder && (
            <span className="task-folder">
              {getFolderEmoji(folder.name)} {folder.name}
            </span>
          )}
          {hasRecurrence && (
            <span className="task-recurrence" title="Повторяющаяся задача">
              <Repeat size={12} />
            </span>
          )}
          {task.subtasksCount > 0 && (
            <span className="task-subtasks">
              📋 {task.subtasksCount}
            </span>
          )}
        </div>

        {/* Row 4: Priority badge */}
        <div className="task-priority-row">
          <span className={`task-priority ${getPriorityClass(task.priority)}`}>
            {getPriorityLabel(task.priority)}
          </span>
        </div>
      </div>
    </div>
  );
}
