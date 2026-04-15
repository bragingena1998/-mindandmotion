// ========================================
// FocusModal — делегирует всё GlobalTimerBanner
// ========================================

import { useEffect } from 'react';
import { useBanner } from '../context/BannerContext';
import type { Task } from '../api/tasks';

interface FocusModalProps {
  task: Task;
  onClose: () => void;
  onSave: (minutes: number) => void;
}

export default function FocusModal({ task, onClose, onSave }: FocusModalProps) {
  const { showBanner } = useBanner();

  useEffect(() => {
    showBanner({
      type: 'focus-session',
      taskName: task.title,
      plannedMinutes: 25, // дефолт
      onSave: (minutes) => {
        onSave(minutes);
      },
      onClose: () => {
        onClose();
      },
    });
    // Закрываем сам компонент — баннер взял управление
    onClose();
  }, []); // eslint-disable-line

  return null; // рендерит баннер через контекст
}
