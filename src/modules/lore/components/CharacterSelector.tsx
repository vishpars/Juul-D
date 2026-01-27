import React, { useState, useMemo } from 'react';
import { useCharacters } from '../hooks/useCharacters';
import { Modal } from './Modal';
import { Search, CheckSquare, Square, ChevronRight, ChevronDown, Users } from 'lucide-react';
import { Character } from '../types';

interface CharacterSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedNames: string[]) => void;
  alreadySelected: string[];
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({ isOpen, onClose, onConfirm, alreadySelected }) => {
  const { characters, loading } = useCharacters();
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(alreadySelected));
  const [expandedFactions, setExpandedFactions] = useState<Set<string>>(new Set());

  // Grouping logic
  const grouped = useMemo(() => {
    const groups: Record<string, Character[]> = {};
    characters.forEach(c => {
      const faction = c.data?.identity?.faction || c.faction || 'Uncommon';
      
      // Filter out Graveyard/Могильник (Case Insensitive)
      if (['graveyard', 'могильник'].includes(faction.toLowerCase())) return;

      // Filter by search
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return;

      if (!groups[faction]) groups[faction] = [];
      groups[faction].push(c);
    });
    return groups;
  }, [characters, searchTerm]);

  const toggleSelection = (name: string) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelected(next);
  };

  const toggleFaction = (faction: string) => {
    const next = new Set(expandedFactions);
    if (next.has(faction)) next.delete(faction);
    else next.add(faction);
    setExpandedFactions(next);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    onClose();
  };

  // Initialize expanded states when opening (expand all by default if searching)
  React.useEffect(() => {
    if (isOpen && searchTerm) {
        setExpandedFactions(new Set(Object.keys(grouped)));
    }
  }, [searchTerm, isOpen, grouped]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Список Персонажей" zIndex="z-[60]">
      <div className="flex flex-col h-[60vh]">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            className="w-full bg-slate-950 border border-slate-700 rounded pl-9 pr-4 py-2 text-white focus:border-violet-500 outline-none"
            placeholder="Поиск искателей..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tree View */}
        <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-800 rounded bg-slate-900/50 p-2 space-y-2">
            {Object.keys(grouped).length === 0 && <div className="text-center text-slate-500 py-4 italic">Активные персонажи не найдены.</div>}
            
            {Object.entries(grouped).map(([faction, chars]: [string, Character[]]) => {
                const isExpanded = expandedFactions.has(faction) || !!searchTerm;
                const selectedCountInGroup = chars.filter(c => selected.has(c.name)).length;
                const allSelected = chars.length > 0 && selectedCountInGroup === chars.length;

                return (
                    <div key={faction} className="select-none">
                        <div 
                            onClick={() => toggleFaction(faction)}
                            className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 cursor-pointer text-violet-200 font-bold text-sm uppercase tracking-wider bg-slate-950/30 border border-transparent hover:border-slate-700 transition-all"
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>{faction}</span>
                            <span className="ml-auto text-xs text-slate-500 bg-slate-900 px-2 rounded-full border border-slate-800">
                                {selectedCountInGroup} / {chars.length}
                            </span>
                        </div>
                        
                        {isExpanded && (
                            <div className="ml-4 pl-2 border-l border-slate-700 mt-1 space-y-1">
                                {chars.map(char => {
                                    const isSelected = selected.has(char.name);
                                    return (
                                        <div 
                                            key={char.id} 
                                            onClick={() => toggleSelection(char.name)}
                                            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-violet-900/30 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                                        >
                                            {isSelected 
                                                ? <CheckSquare size={16} className="text-violet-400 shrink-0" /> 
                                                : <Square size={16} className="text-slate-600 shrink-0" />
                                            }
                                            <span className="text-sm font-medium">{char.name}</span>
                                            {char.data?.identity?.level && <span className="text-[10px] text-slate-600 ml-auto font-mono">Lvl {char.data.identity.level}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
            <span className="text-sm text-slate-400">Выбрано: <span className="text-white font-bold">{selected.size}</span></span>
            <button 
                onClick={handleConfirm}
                className="bg-violet-700 hover:bg-violet-600 text-white px-6 py-2 rounded font-fantasy flex items-center gap-2"
            >
                <Users size={16} /> Подтвердить
            </button>
        </div>
      </div>
    </Modal>
  );
};