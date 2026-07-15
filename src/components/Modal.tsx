import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  onSecondaryAction?: () => void;
  confirmText?: string;
  cancelText?: string;
  isAlert?: boolean;
}

export function Modal({ isOpen, title, message, onClose, onConfirm, onSecondaryAction, confirmText = 'Aceptar', cancelText = 'Cancelar', isAlert = false }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          {!isAlert && (
            <button className="btn-secondary" onClick={onSecondaryAction || onClose}>
              {cancelText}
            </button>
          )}
          <button className="btn-primary" onClick={() => {
            if (onConfirm) onConfirm();
            else onClose();
          }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
