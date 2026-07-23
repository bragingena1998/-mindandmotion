import { useState, useEffect, useRef } from 'react';
import { Trash2, Pencil, Plus, Check, X } from 'lucide-react';
import type { Task, Folder, Subtask } from '../api/tasks';
import { fetchSubtasks, createSubtask, updateSubtask, deleteSubtask, updateTask, addFocusSession } from '../api/tasks';
import FocusModal from './FocusModal';

interface TaskCardProps {
  task: Task;
  folder?: Folder | null;
  onToggle: (id: number, done: boolean) => void;
  onDelete: (task: Task) => void;
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

// Приоритет: 1=высокий, 2=средний, 3=низкий — совпадает с mobile (см. vault/09-Проблемы/Web-Приоритет-задач-инвертирован.md)
function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 1: return 'ВЫСОКИЙ';
    case 2: return 'СРЕДНИЙ';
    case 3: return 'НИЗКИЙ';
    default: return 'СРЕДНИЙ';
  }
}

function getPriorityClass(priority: number): string {
  switch (priority) {
    case 1: return 'high';
    case 2: return 'medium';
    case 3: return 'low';
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

  // ── Comment editing state ─────────────────────────────────────────────────
  const [editingComment, setEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(task.comment || '');

  // ── Long press / Focus state ──────────────────────────────────────────────
  const [showFocus, setShowFocus] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isLongPress = useRef(false);

  // ── Confirmation modal state ────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<'task' | 'subtask' | null>(null);
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<number | null>(null);

  // ── Mobile detection ────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : true);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const handlePointerDown = () => {
    if (!isMobile) return;
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

  const handleFocusSave = async () => {
    try {
      // Атомарный инкремент на бэкенде — не updateTask(), чтобы не затереть остальные поля задачи
      await addFocusSession(task.id);
      // Обновляем локальное значение для отображения
      task.focusSessions += 1;
    } catch {
      console.error('Failed to update focus sessions');
    }
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
    onDelete(task);
  };

  const confirmDeleteActual = async () => {
    if (confirmDelete === 'subtask' && deletingSubtaskId !== null) {
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
        onClick={() => setExpanded(true)}
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
              {!isMobile && (
                <button
                  className="task-action-btn task-action-focus"
                  onClick={(e) => { e.stopPropagation(); setShowFocus(true); }}
                  title="Фокус-сессия"
                >
                  🎯
                </button>
              )}
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

          {/* Комментарий: текст в ПК, иконка в мобиле */}
          {task.comment && !isMobile && (
            <p style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              margin: '2px 0 4px',
              lineHeight: 1.4,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {task.comment}
            </p>
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
            {task.focusSessions > 0 && (
              <span
                title={`Фокус-сессий выполнено: ${task.focusSessions}`}
                style={{
                  fontSize: 11, fontWeight: 600,
                  color: '#4fc3f7',
                  background: 'rgba(79,195,247,0.12)',
                  borderRadius: 4, padding: '1px 5px',
                  letterSpacing: '0.04em',
                }}
              >
                🎯 {task.focusSessions}
              </span>
            )}
            {task.subtasksCount > 0 && (
              <span className="meta-subtasks">
                ☰ {task.subtasksCount}
              </span>
            )}
            {task.comment && isMobile && (
              <span title={task.comment} style={{ cursor: 'default' }}>💬</span>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Focus Modal - delegates to GlobalTimerBanner */}
      {showFocus && (
        <FocusModal
          task={task}
          onClose={() => setShowFocus(false)}
          onSave={handleFocusSave}
        />
      )}

      {/* Subtasks Bottom Sheet */}
      {expanded && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.75)'
            }}
            onClick={() => setExpanded(false)}
          />
          {/* Subtasks panel */}
          <div
            style={isMobile ? {
              position: 'fixed',
              bottom: 0,
              left: 0, right: 0,
              zIndex: 201,
              background: 'var(--color-bg)',
              borderRadius: '20px 20px 0 0',
              padding: '12px 16px',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
              maxHeight: '72vh',
              overflowY: 'auto',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.5)'
            } : {
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 500, maxHeight: '80vh', overflowY: 'auto',
              zIndex: 201,
              background: 'var(--color-bg)', borderRadius: 16,
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{
              width: 40, height: 4,
              background: 'var(--color-border)',
              borderRadius: 2, margin: '0 auto 12px'
            }} />

            {/* ── Комментарий: клик = редактирование ── */}
            <div style={{ marginBottom: 14 }}>
              {editingComment ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    value={commentDraft}
                    onChange={e => setCommentDraft(e.target.value)}
                    autoFocus
                    rows={3}
                    placeholder="Введите комментарий..."
                    style={{
                      width: '100%',
                      background: 'var(--color-surface)',
                      border: '1.5px solid var(--color-primary)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: 13,
                      color: 'var(--color-text)',
                      resize: 'none',
                      outline: 'none',
                      lineHeight: 1.5,
                      fontFamily: 'inherit',
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Escape') setEditingComment(false);
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={async () => {
                        try {
                          await updateTask(task.id, { comment: commentDraft } as Partial<Task>);
                          task.comment = commentDraft;
                          setEditingComment(false);
                        } catch {
                          alert('Не удалось сохранить комментарий');
                        }
                      }}
                      style={{
                        flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                        background: 'var(--color-primary)', color: '#fff',
                        fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={() => { setCommentDraft(task.comment || ''); setEditingComment(false); }}
                      style={{
                        flex: 1, padding: '9px', borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        background: 'transparent', color: 'var(--color-text)',
                        fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : task.comment ? (
                /* Есть комментарий — клик для редактирования */
                <div
                  onClick={() => { setCommentDraft(task.comment || ''); setEditingComment(true); }}
                  title="Нажмите для редактирования"
                  style={{
                    background: 'var(--color-surface)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.5,
                    borderLeft: '3px solid var(--color-primary)',
                    cursor: 'text',
                    userSelect: 'none',
                  }}
                >
                  💬 {task.comment}
                </div>
              ) : (
                /* Нет комментария — клик для добавления */
                <div
                  onClick={() => { setCommentDraft(''); setEditingComment(true); }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px dashed var(--color-border)',
                    fontSize: 13,
                    color: 'var(--color-text-faint)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    userSelect: 'none',
                  }}
                >
                  + Добавить комментарий
                </div>
              )}
            </div>

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
            style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.75)' }}
            onClick={() => setConfirmDelete(null)}
          />
          <div style={isMobile ? {
            position: 'fixed',
            zIndex: 301,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: 480,
            background: 'var(--color-bg)',
            borderRadius: '20px 20px 0 0',
            padding: '28px 24px',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          } : {
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 420, zIndex: 301,
            background: 'var(--color-bg)', borderRadius: 16,
            padding: '32px 28px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Иконка удаления */}
            <div style={{
              width: 52, height: 52,
              borderRadius: '50%',
              background: 'rgba(161, 44, 123, 0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', fontSize: 24,
            }}>
              🗑️
            </div>

            <p style={{ fontSize: 17, fontWeight: 700, textAlign: 'center', marginBottom: 6, color: 'var(--color-text)' }}>
              {confirmDelete === 'task' ? 'Удалить задачу?' : 'Удалить подзадачу?'}
            </p>

            <p style={{
              fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center',
              marginBottom: 24, maxWidth: '32ch', margin: '0 auto 24px', lineHeight: 1.5,
            }}>
              {confirmDelete === 'task'
                ? `«${task.title}» будет удалена без возможности восстановления`
                : `Подзадача будет удалена`
              }
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 12,
                  border: '1.5px solid var(--color-border)',
                  background: 'transparent', color: 'var(--color-text)',
                  fontWeight: 600, fontSize: 15, cursor: 'pointer',
                }}
                onClick={() => setConfirmDelete(null)}
              >
                Отмена
              </button>
              <button
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 12,
                  border: 'none',
                  background: 'var(--color-error)', color: '#fff',
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
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
