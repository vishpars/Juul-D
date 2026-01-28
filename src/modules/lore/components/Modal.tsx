
import React from 'react';
import { X, Sparkles } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  zIndex?: string; 
  customBg?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'; 
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, zIndex = 'z-50', customBg, size = 'md' }) => {
  if (!isOpen) return null;

  const widthClass = {
      sm: 'max-w-sm',
      md: 'max-w-lg',
      lg: 'max-w-4xl',
      xl: 'max-w-6xl',
      '2xl': 'max-w-7xl',
      full: 'w-full h-full max-w-none'
  }[size];

  // 24px cut size
  const clipPathValue = size === 'full' ? 'none' : 'polygon(0 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 24px 100%, 0 calc(100% - 24px))';

  return (
    <div className={`fixed left-0 right-0 bottom-0 top-12 md:top-0 ${zIndex} flex items-center justify-center bg-black/95 backdrop-blur-sm p-0 md:p-4 animate-fadeIn`}>
      <div 
        className={`
            relative flex flex-col 
            ${size === 'full' ? 'h-full' : 'max-h-[90vh]'}
            w-full ${widthClass}
            ${customBg ? customBg : 'bg-[#050b14]'}
        `}
        style={{ clipPath: clipPathValue }}
      >
        {/* --- Custom Border Frame (Simulating the border along the clip-path) --- */}
        {size !== 'full' && (
            <div className="absolute inset-0 pointer-events-none z-0">
                {/* Top Border */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-violet-900/50"></div>
                {/* Left Border (stops before cut) */}
                <div className="absolute top-0 bottom-[24px] left-0 w-[2px] bg-violet-900/50"></div>
                {/* Right Border (stops before cut) */}
                <div className="absolute top-0 bottom-[24px] right-0 w-[2px] bg-violet-900/50"></div>
                {/* Bottom Border (stops before cuts) */}
                <div className="absolute bottom-0 left-[24px] right-[24px] h-[2px] bg-violet-900/50"></div>
                
                {/* Diagonal Bottom Left */}
                <div className="absolute bottom-[8px] left-[-4px] w-[34px] h-[2px] bg-violet-500 origin-center -rotate-45 shadow-[0_0_10px_#8b5cf6]"></div>
                {/* Diagonal Bottom Right */}
                <div className="absolute bottom-[8px] right-[-4px] w-[34px] h-[2px] bg-violet-500 origin-center rotate-45 shadow-[0_0_10px_#8b5cf6]"></div>

                {/* Corner Accents (Bright Lines) */}
                {/* Top Left */}
                <div className="absolute top-0 left-0 w-6 h-[2px] bg-violet-400 shadow-[0_0_8px_#a78bfa]"></div>
                <div className="absolute top-0 left-0 w-[2px] h-6 bg-violet-400 shadow-[0_0_8px_#a78bfa]"></div>
                
                {/* Top Right */}
                <div className="absolute top-0 right-0 w-6 h-[2px] bg-violet-400 shadow-[0_0_8px_#a78bfa]"></div>
                <div className="absolute top-0 right-0 w-[2px] h-6 bg-violet-400 shadow-[0_0_8px_#a78bfa]"></div>

                {/* Inner Glow Border */}
                <div className="absolute inset-[1px] border border-violet-500/10 pointer-events-none" style={{clipPath: clipPathValue}}></div>
            </div>
        )}

        {/* Background Noise/Runes */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px'}}>
        </div>

        {/* Header */}
        <div className="relative p-5 border-b border-violet-500/20 flex justify-between items-center shrink-0 bg-gradient-to-r from-violet-950/20 via-violet-900/10 to-violet-950/20 z-10">
          <div className="flex items-center gap-2">
              <Sparkles className="text-violet-500 animate-pulse" size={16} />
              <h3 className="text-xl font-fantasy text-transparent bg-clip-text bg-gradient-to-r from-violet-100 to-fuchsia-200 drop-shadow-[0_0_5px_rgba(167,139,250,0.5)] tracking-[0.1em] uppercase">
                {title}
              </h3>
          </div>
          <button onClick={onClose} className="text-violet-500/50 hover:text-violet-200 hover:rotate-90 transition-all duration-500">
            <X size={24} />
          </button>
          
          {/* Glowing Line under header */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent box-shadow-[0_0_10px_violet]"></div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar relative z-10 text-slate-300 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
