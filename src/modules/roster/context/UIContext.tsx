
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';

interface UIContextType {
  showAlert: (message: string, title?: string) => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<{ isOpen: boolean; message: string; title: string }>({
    isOpen: false, message: '', title: ''
  });
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; message: string; title: string; onConfirm: () => void }>({
    isOpen: false, message: '', title: '', onConfirm: () => {}
  });

  const showAlert = useCallback((message: string, title: string = 'Внимание') => {
    setAlertState({ isOpen: true, message, title });
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void, title: string = 'Подтверждение') => {
    setConfirmState({ isOpen: true, message, title, onConfirm });
  }, []);

  const closeAlert = () => setAlertState(prev => ({ ...prev, isOpen: false }));
  const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

  const handleConfirm = () => {
    confirmState.onConfirm();
    closeConfirm();
  };

  return (
    <UIContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {/* Alert Modal */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="relative w-full max-w-md bg-[#0b0d12] border border-violet-500/30 rounded-lg shadow-[0_0_50px_-10px_rgba(139,92,246,0.15)] overflow-hidden">
                
                {/* Header */}
                <div className="relative z-10 flex items-center justify-between p-4 border-b border-violet-500/20">
                     <div className="flex items-center gap-2 text-violet-200 font-serif tracking-widest text-lg">
                        <Sparkles size={18} className="text-violet-400" />
                        <span className="uppercase">{alertState.title}</span>
                     </div>
                     <button onClick={closeAlert} className="text-violet-500 hover:text-white transition-colors"><X size={20}/></button>
                </div>

                {/* Body */}
                <div className="relative z-10 p-6">
                    <p className="text-gray-300 text-sm leading-relaxed font-sans text-center">
                        {alertState.message}
                    </p>
                </div>

                {/* Footer */}
                <div className="relative z-10 p-4 border-t border-violet-500/20">
                     <button onClick={closeAlert} className="w-full py-3 border border-violet-500/40 bg-violet-900/20 hover:bg-violet-900/40 text-violet-100 font-serif tracking-widest uppercase text-sm transition-all shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                        ПРИНЯТО
                     </button>
                </div>
            </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
           <div className="relative w-full max-w-md bg-[#0b0d12] border border-red-500/30 rounded-lg shadow-[0_0_50px_-10px_rgba(220,38,38,0.15)] overflow-hidden">
                
                {/* Header */}
                <div className="relative z-10 flex items-center justify-between p-4 border-b border-red-500/20">
                     <div className="flex items-center gap-2 text-red-200 font-serif tracking-widest text-lg">
                        <Sparkles size={18} className="text-red-400" />
                        <span className="uppercase">{confirmState.title}</span>
                     </div>
                     <button onClick={closeConfirm} className="text-red-500 hover:text-white transition-colors"><X size={20}/></button>
                </div>

                {/* Body */}
                <div className="relative z-10 p-6">
                    <p className="text-gray-300 text-sm leading-relaxed font-sans text-center">
                        {confirmState.message}
                    </p>
                </div>

                {/* Footer */}
                <div className="relative z-10 p-4 border-t border-red-500/20 flex gap-4">
                     <button onClick={closeConfirm} className="flex-1 py-3 border border-gray-700 bg-transparent hover:bg-gray-800 text-gray-400 font-serif tracking-widest uppercase text-sm transition-all">
                        ОТМЕНА
                     </button>
                     <button onClick={handleConfirm} className="flex-1 py-3 border border-red-500/40 bg-red-900/20 hover:bg-red-900/40 text-red-100 font-serif tracking-widest uppercase text-sm transition-all shadow-[0_0_15px_rgba(220,38,38,0.1)]">
                        ПОДТВЕРДИТЬ
                     </button>
                </div>
            </div>
        </div>
      )}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
};
