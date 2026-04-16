import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';

interface DeleteModalProps {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteModal({ itemName, onConfirm, onCancel }: DeleteModalProps) {
  return createPortal(
    <div className="delete-modal-overlay" onClick={onCancel}>
      <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <Trash2 className="delete-modal-icon" size={40} strokeWidth={1.5} />
        <p className="delete-modal-text">«{itemName}»</p>
        <div className="delete-modal-actions">
          <button className="delete-modal-btn-cancel" onClick={onCancel}>Отмена</button>
          <button className="delete-modal-btn-confirm" onClick={onConfirm}>Удалить</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
