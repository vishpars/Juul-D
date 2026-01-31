
import React from 'react';
import { Modal } from '../../lore/components/Modal';
import { AbilityGroup } from '../types';
import { Zap, ChevronRight, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  abilityGroups: AbilityGroup[];
  onSelect: (abilityName: string) => void;
}

export const AbilityLinkModal: React.FC<Props> = ({ isOpen, onClose, abilityGroups, onSelect }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Привязка к способности" size="md" zIndex="z-[200]">
      <div className="flex flex-col h-[60vh]">
        <div className="p-4 bg-violet-900/10 border-b border-violet-500/20 text-sm text-slate-300 italic">
          Выберите способность, активация которой запустит этот эффект.
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
          {abilityGroups.length === 0 && (
            <div className="text-center text-slate-500 py-10">
              У персонажа нет активных способностей.
            </div>
          )}

          {abilityGroups.map((group, idx) => {
            const isBasic = group.name === "Базовые Действия";
            
            return (
              <div key={idx} className="space-y-1">
                <div className={`flex items-center gap-2 px-2 py-1 text-xs font-bold uppercase tracking-widest rounded border ${
                    isBasic 
                    ? 'text-emerald-400 bg-emerald-950/20 border-emerald-800/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                    : 'text-violet-400 bg-slate-900/50 border-slate-800'
                }`}>
                  {isBasic ? <Sparkles size={12} /> : <Zap size={12} />} 
                  {group.name}
                </div>
                
                <div className={`ml-2 pl-2 border-l mt-1 space-y-1 ${isBasic ? 'border-emerald-900/30' : 'border-slate-800'}`}>
                  {group.abilities.map((ability, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={() => onSelect(ability.name)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded transition-all group border border-transparent ${
                          isBasic 
                          ? 'hover:bg-emerald-600/10 text-emerald-100/70 hover:text-white hover:border-emerald-500/20' 
                          : 'hover:bg-violet-600/20 text-slate-400 hover:text-white hover:border-violet-500/30'
                      }`}
                    >
                      <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isBasic ? 'text-emerald-500' : 'text-violet-500'}`} />
                      <span className="font-medium">{ability.name}</span>
                    </button>
                  ))}
                  {group.abilities.length === 0 && (
                    <div className="text-[10px] text-slate-600 italic px-3 py-1">Нет навыков</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
