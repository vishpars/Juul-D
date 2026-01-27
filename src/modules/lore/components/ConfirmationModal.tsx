import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  isDangerous = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" zIndex="z-[70]">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className={`p-3 rounded-full ${isDangerous ? 'bg-red-900/20 text-red-500' : 'bg-violet-900/20 text-violet-500'}`}>
          <AlertTriangle size={32} />
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          {message}
        </p>
        <div className="flex w-full gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs font-bold uppercase tracking-wider"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 px-4 py-2 rounded text-white transition-colors text-xs font-bold uppercase tracking-wider ${isDangerous ? 'bg-red-900/60 hover:bg-red-800' : 'bg-violet-700 hover:bg-violet-600'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};