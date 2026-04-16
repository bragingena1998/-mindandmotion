import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message?: string;
  warning?: string; // доп. текст мелким шрифтом
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDanger?: boolean; // true = кнопка подтверждения красная
  onConfirm: () => void;
  onCancel: () => void;
  icon?: ReactNode;
}

export default function ConfirmModal({
  title, message, warning, confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена', confirmDanger = false,
  onConfirm, onCancel, icon
}: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}><X size={20} /></button>
        {icon && <div className="confirm-modal-icon">{icon}</div>}
        <h3 className="confirm-modal-title">{title}</h3>
        {message && <p className="confirm-modal-message">{message}</p>}
        {warning && <p className="confirm-modal-warning">{warning}</p>}
        <div className="confirm-modal-actions">
          <button className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button 
            className={confirmDanger ? 'btn-danger' : 'btn-primary'} 
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
