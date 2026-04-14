import { useState, useEffect, useRef } from 'react';
import { Trash2, Pencil, Plus, Check, X } from 'lucide-react';
import type { Task, Folder, Subtask } from '../api/tasks';
import { fetchSubtasks, createSubtask, updateSubtask, deleteSubtask, updateTask } from '../api/tasks';
import FocusModal from './FocusModal';

interface TaskCardProps {
  task: Task;
  folder?: Folder | null;
  onToggle: (id: number, done: boolean) => void;
  onDelete: (id: number) => void;
  onEdit?: (task: Task) => void;
}

function formatTaskDateRange(date: string, deadline?: string | null): string {
  const parseDate = (d: string) => {
    const [year, month, day] = d.split('-');
    return { day: parseInt(day), month: parseInt(month), year: parseInt(year) };
  };
  const fmt2 = (n: number) => String(n).padStart(2, '0');
  const d = parseDate(date);

  if (!deadline) {
    return `${fmt2(d.day)}.${fmt2(d.month)}.${String(d.year).slice(2)}`;
  }

  const dl = parseDate(deadline);

  if (d.month === dl.month && d.year === dl.year) {
    // Одинаковый месяц: 13-15.03.26
    return `${fmt2(d.day)}-${fmt2(dl.day)}.${fmt2(d.month)}.${String(d.year).slice(2)}`;
  } else {
    // Разные месяцы: 13.04-14.05.26
    return `${fmt2(d.day)}.${fmt2(d.month)}-${fmt2(dl.day)}.${fmt2(dl.month)}.${String(dl.year).slice(2)}`;
  }
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
  // ── Subtasks state ────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');

  // ── Long press / Focus state ──────────────────────────────────────────────
  const [showFocus, setShowFocus] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isLongPress = useRef(false);

  // ── Timer minimize state ─────────────────────────────────────────────────
  const [timerMinimized, setTimerMinimized] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTimeLeft, setTimerTimeLeft] = useState(0);
  const [timerTaskTitle, setTimerTaskTitle] = useState('');

  // ── Confirmation modal state ────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<'task' | 'subtask' | null>(null);
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<number | null>(null);

  const handlePointerDown = () => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowFocus(true);
    }, 600);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
    // Prevent click if it was a long press
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  };

  const handleFocusSave = async (minutes: number) => {
    try {
      await updateTask(task.id, {
        focusSessions: task.focusSessions + 1,
      } as Partial<Task>);
      // Обновляем локальное значение для отображения
      task.focusSessions += 1;
    } catch {
      console.error('Failed to update focus sessions');
    }
  };

  const handleTimerMinimize = () => {
    setTimerMinimized(true);
    // Не скрываем модалку полностью — она остаётся в DOM для работы таймера
    setTimerTaskTitle(task.title);
  };

  const handleTimerSave = async () => {
    if (timerTimeLeft > 0) {
      const elapsedMinutes = Math.floor(timerTimeLeft / 60);
      if (elapsedMinutes > 0) {
        await handleFocusSave(elapsedMinutes);
      }
    }
    setTimerMinimized(false);
    setTimerRunning(false);
    setTimerTimeLeft(0);
  };

  const handleTimerStop = () => {
    setTimerMinimized(false);
    setTimerRunning(false);
    setTimerTimeLeft(0);
  };

  const formatTimerDisplay = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ── Load subtasks when expanded ───────────────────────────────────────────
  useEffect(() => {
    if (expanded && task.subtasksCount > 0) {
      setLoadingSubtasks(true);
      fetchSubtasks(task.id)
        .then(setSubtasks)
        .catch(() => setSubtasks([]))
        .finally(() => setLoadingSubtasks(false));
    }
  }, [expanded, task.id, task.subtasksCount]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(task.id, !task.done);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete('task');
  };

  const confirmDeleteActual = async () => {
    if (confirmDelete === 'task') {
      onDelete(task.id);
    } else if (confirmDelete === 'subtask' && deletingSubtaskId !== null) {
      try {
        await deleteSubtask(task.id, deletingSubtaskId);
        setSubtasks(subtasks.filter(s => s.id !== deletingSubtaskId));
        task.subtasksCount = subtasks.length - 1;
      } catch {
        // silent fail
      }
    }
    setConfirmDelete(null);
    setDeletingSubtaskId(null);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(task);
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // ── Subtask handlers ────────────────────────────────────────────────────
  const handleAddSubtask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      const subtask = await createSubtask(task.id, newSubtaskTitle.trim());
      setSubtasks([...subtasks, subtask]);
      // Обновляем счётчик локально
      task.subtasksCount = subtasks.length + 1;
      setNewSubtaskTitle('');
    } catch {
      alert('Не удалось создать подзадачу');
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    try {
      const updated = await updateSubtask(task.id, subtask.id, { done: !subtask.done });
      setSubtasks(subtasks.map(s => s.id === updated.id ? updated : s));
    } catch {
      alert('Не удалось обновить подзадачу');
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    setDeletingSubtaskId(subtaskId);
    setConfirmDelete('subtask');
  };

  const startEditSubtask = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  };

  const saveEditSubtask = async () => {
    if (!editingSubtaskTitle.trim() || editingSubtaskId === null) {
      setEditingSubtaskId(null);
      return;
    }
    try {
      const updated = await updateSubtask(task.id, editingSubtaskId, { title: editingSubtaskTitle.trim() });
      setSubtasks(subtasks.map(s => s.id === updated.id ? updated : s));
    } catch {
      alert('Не удалось обновить подзадачу');
    } finally {
      setEditingSubtaskId(null);
    }
  };

  const cancelEditSubtask = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const dateStr = formatTaskDateRange(task.date, task.deadline);
  const isOverdue = !task.done && task.date && task.date.substring(0, 10) < todayStr;
  const status = getTaskStatus(task, todayStr);

  const hasRecurrence = (task.recurrence && task.recurrence !== 'none') ||
                       (task.recurrenceType && task.recurrenceType !== 'none');

  const completedSubtasks = subtasks.filter(s => s.done).length;

  return (
    <>
      <div
        className={`task-card-compact ${task.done ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}
        onClick={() => { if (task.subtasksCount > 0) setExpanded(true); }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
      >
      <div className="task-card-main">
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

          {/* Row 3: Meta info */}
          <div className="task-meta-compact">
            {task.deadline && (() => {
              const today = new Date();
              const todayStr = today.toISOString().split('T')[0];
              const dl = task.deadline.substring(0, 10);
              const [y, m, d] = dl.split('-');
              const isOverdueDeadline = dl < todayStr;
              return (
                <span className="meta-deadline" style={{
                  color: isOverdueDeadline ? '#f97316' : '#fb7185',
                  fontWeight: 600, fontSize: '12px'
                }}>
                  {isOverdueDeadline ? '⚠ до ' : 'до '}{d}.{m}
                </span>
              );
            })()}
            {task.time && <span className="meta-time">{formatTime(task.time)}</span>}
            {folder && (
              <span className="meta-folder">
                {folder.icon || getFolderEmoji(folder.name)} {folder.name}
              </span>
            )}
            <span className={`meta-priority ${getPriorityClass(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>
            {hasRecurrence && (
              <span className="meta-recurrence" title="Повторяющаяся задача">↻</span>
            )}
            {task.subtasksCount > 0 && (
              <span className="meta-subtasks">
                ☰ {task.subtasksCount}
              </span>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Focus Modal - always render when showFocus, control visibility via isMinimized */}
      {showFocus && (
        <FocusModal
          task={task}
          isMinimized={timerMinimized}
          onClose={() => { setShowFocus(false); setTimerMinimized(false); }}
          onSave={handleFocusSave}
          onMinimize={() => setTimerMinimized(true)}
          onTimeUpdate={setTimerTimeLeft}
        />
      )}

      {/* Timer banner - only when minimized */}
      {showFocus && timerMinimized && (
        <div className="timer-banner" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          background: '#1a1a2e', color: '#4fc3f7',
          padding: '10px 16px', display: 'flex', alignItems: 'center',
          gap: 12, fontSize: 14, fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
        }}>
          <span>🎯 {task.title}</span>
          <span style={{flex:1}}>
            {String(Math.floor(timerTimeLeft/60)).padStart(2,'0')}:
            {String(timerTimeLeft%60).padStart(2,'0')}
          </span>
          <button onClick={() => setTimerMinimized(false)}>▶ Развернуть</button>
          <button onClick={handleTimerStop}>✕</button>
        </div>
      )}

      {/* Subtasks Bottom Sheet */}
      {expanded && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.5)'
            }}
            onClick={() => setExpanded(false)}
          />
          {/* Bottom Sheet */}
          <div
            style={{
              position: 'fixed',
              bottom: 'var(--nav-height, 64px)',
              left: 0, right: 0,
              zIndex: 201,
              background: 'var(--color-surface)',
              borderRadius: '16px 16px 0 0',
              padding: '16px 16px 20px',
              maxHeight: 'calc(70vh - 64px)',
              overflowY: 'auto',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
              maxWidth: 600,
              margin: '0 auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{
              width: 40, height: 4,
              background: 'var(--color-border)',
              borderRadius: 2, margin: '0 auto 12px'
            }} />

            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--color-text)' }}>
              Подзадачи · {task.title}
            </h3>

            {loadingSubtasks ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Загрузка...</div>
            ) : (
              <>
                <div className="subtasks-list">
                  {subtasks.length === 0 && (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 8 }}>
                      Нет подзадач
                    </div>
                  )}
                  {subtasks.map(subtask => (
                    <div key={subtask.id} className={`subtask-item ${subtask.done ? 'done' : ''}`}>
                      <div
                        className={`subtask-checkbox ${subtask.done ? 'checked' : ''}`}
                        onClick={() => handleToggleSubtask(subtask)}
                      />
                      {editingSubtaskId === subtask.id ? (
                        <div className="subtask-edit">
                          <input
                            type="text"
                            value={editingSubtaskTitle}
                            onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditSubtask();
                              if (e.key === 'Escape') cancelEditSubtask();
                            }}
                            autoFocus
                          />
                          <button onClick={saveEditSubtask}><Check size={14} /></button>
                          <button onClick={cancelEditSubtask}><X size={14} /></button>
                        </div>
                      ) : (
                        <span className="subtask-title" onClick={() => startEditSubtask(subtask)}>
                          {subtask.title}
                        </span>
                      )}
                      <button className="subtask-delete" onClick={() => handleDeleteSubtask(subtask.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <form className="subtask-add" onSubmit={handleAddSubtask} style={{ marginTop: 12, paddingBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Новая подзадача..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                  />
                  <button type="submit" disabled={!newSubtaskTitle.trim()}>
                    <Plus size={16} />
                  </button>
                </form>
              </>
            )}
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {confirmDelete && (
        <>
          <div
            style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)' }}
            onClick={() => setConfirmDelete(null)}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
            background: 'var(--color-surface)',
            borderRadius: '16px 16px 0 0',
            padding: '24px 20px 32px',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.3)'
          }}>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--color-text)' }}>
              {confirmDelete === 'task' ? 'Удалить задачу?' : 'Удалить подзадачу?'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              {confirmDelete === 'task' ? task.title : subtasks.find(s=>s.id===deletingSubtaskId)?.title}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                style={{
                  flex:1, padding:'12px', borderRadius:8, border:'none',
                  background:'var(--color-surface-offset)', color:'var(--color-text)',
                  fontWeight:600, fontSize:15
                }}
                onClick={() => setConfirmDelete(null)}
              >
                Отмена
              </button>
              <button
                style={{
                  flex:1, padding:'12px', borderRadius:8, border:'none',
                  background:'var(--color-error)', color:'#fff',
                  fontWeight:600, fontSize:15
                }}
                onClick={confirmDeleteActual}
              >
                Удалить
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
