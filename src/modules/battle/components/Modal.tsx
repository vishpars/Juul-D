
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Container wrapper for the clip-path border effect */}
      <div className="relative w-full max-w-md group">
        
        {/* Glowing Border Background */}
        <div 
            className="absolute -inset-[1px] bg-gradient-to-br from-violet-600 via-indigo-900 to-violet-900 opacity-70 group-hover:opacity-100 transition-opacity duration-500 blur-sm"
            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
        ></div>

        {/* Main Content */}
        <div 
            className="relative bg-[#050b14] shadow-2xl overflow-hidden"
            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-violet-900/30 bg-gradient-to-r from-violet-950/40 to-transparent">
              {/* Removed drop-shadow-md to fix 'black square' text artifact */}
              <h3 className="text-xl font-rune font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 tracking-widest uppercase">
                  {title}
              </h3>
              <button 
                onClick={onClose} 
                className="text-slate-500 hover:text-violet-400 transition-colors p-1 rounded hover:bg-white/5"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 text-slate-300 font-sans">
                {children}
            </div>

            {/* Footer */}
            {footer && (
                <div className="p-4 border-t border-violet-900/30 bg-[#020408]/50 flex justify-end gap-3">
                    {footer}
                </div>
            )}
            
            {/* Decorative Corner Accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-violet-500/50 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-violet-500/50 pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};
