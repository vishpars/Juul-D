
import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SequenceNode, BattleParticipant, JsonAbility } from '../types';
import { Trash2, GripVertical, Plus, Split, Zap, Box, Minus, Settings, Sword, CheckSquare, Square, Play } from 'lucide-react';
import { getMatchingFactors } from '../engine/calculator';

interface CanvasNodeProps {
  node: SequenceNode;
  participants: BattleParticipant[];
  onRemove: (id: string) => void;
  onUpdateData: (id: string, data: any) => void;
  isInsideHorizontalContainer?: boolean;
  index?: number;
  onAddBranch?: (nodeId: string) => void;
}

const Tooltip: React.FC<{ title: string; desc?: string; mech?: string; tags?: string[] }> = ({ title, desc, mech, tags }) => (
    <div className="absolute left-0 bottom-full mb-2 w-64 bg-[#050b14]/95 text-white text-[10px] p-2 rounded shadow-glow border border-violet-900/50 opacity-0 group-hover/mod:opacity-100 transition-opacity pointer-events-none z-[9999] backdrop-blur-sm">
        <div className="font-bold mb-1 border-b border-violet-900 pb-1 text-yellow-500 font-rune tracking-wide">{title}</div>
        {mech && <div className="mb-1 text-cyan-300 font-mono text-xs">{mech}</div>}
        {desc && <div className="italic text-slate-400 mb-1 leading-tight font-serif">{desc}</div>}
        {tags && tags.length > 0 && (
            <div className="mt-1 text-xs text-slate-500 border-t border-gray-800 pt-1 font-mono uppercase">
                {tags.join(', ')}
            </div>
        )}
    </div>
);

// Helper duplicated from SourcePanel to match colors. 
const getAbilityCardStyles = (ability: JsonAbility) => {
    const tags = (ability.tags || []).map(t => t.toLowerCase());
    const stats = new Set<string>();

    if (tags.some(t => t.includes('phys') || t.includes('физ') || t === 'melee' || t === 'ranged')) stats.add('phys');
    if (tags.some(t => t.includes('magic') || t.includes('mag') || t.includes('маг') || t === 'spell')) stats.add('mag');
    if (tags.some(t => t.includes('unique') || t.includes('uniq') || t.includes('уник'))) stats.add('uniq');
    
    (ability.bonuses || []).forEach(b => {
        if (b.stat === 'phys') stats.add('phys');
        if (b.stat === 'magic') stats.add('mag');
        if (b.stat === 'unique') stats.add('uniq');
    });

    let baseClass = 'bg-panel border-slate-700/50'; // Default Canvas Card

    // Priority: Form > Buff > Mix > Single
    if (tags.some(t => t === 'form' || t === 'форма')) {
        baseClass = 'bg-yellow-900/20 border-yellow-600/40 text-yellow-100';
    } else if (tags.some(t => t === 'buff' || t === 'бафф')) {
        baseClass = 'bg-emerald-900/20 border-emerald-600/40 text-emerald-100';
    } else {
        const hasPhys = stats.has('phys');
        const hasMag = stats.has('mag');
        const hasUniq = stats.has('uniq');

        if (hasPhys && hasMag && hasUniq) {
            baseClass = 'bg-[linear-gradient(135deg,rgba(127,29,29,0.3)_0%,rgba(30,58,138,0.3)_50%,rgba(88,28,135,0.3)_100%)] border-slate-500/40 text-white';
        } else if (hasPhys && hasMag) {
            baseClass = 'bg-gradient-to-br from-red-900/30 to-blue-900/30 border-purple-500/30 text-white';
        } else if (hasPhys && hasUniq) {
            baseClass = 'bg-gradient-to-br from-red-900/30 to-purple-900/30 border-pink-500/30 text-white';
        } else if (hasMag && hasUniq) {
            baseClass = 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-indigo-500/30 text-white';
        } else if (hasPhys) {
            baseClass = 'bg-red-950/30 border-red-800/30 text-red-100';
        } else if (hasMag) {
            baseClass = 'bg-blue-950/30 border-blue-800/30 text-blue-100';
        } else if (hasUniq) {
            baseClass = 'bg-purple-950/30 border-purple-800/30 text-purple-100';
        }
    }
    
    const isDebuff = ability.bonuses.some(b => b.val < 0);
    if (isDebuff && !tags.some(t => t === 'form' || t === 'форма')) {
         baseClass = 'bg-rose-950/30 border-rose-800/40 text-rose-100';
    }

    return baseClass;
};


const CanvasNode: React.FC<CanvasNodeProps> = ({ node, participants, onRemove, onUpdateData, isInsideHorizontalContainer, index, onAddBranch }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    data: { type: 'NODE', node }
  });

  // Local state for toggling settings within the card
  const [showSettings, setShowSettings] = useState(false);

  const isComboFull = node.type === 'combo' && node.children.length >= 2;

  const { setNodeRef: setDroppableRef, isOver: isDroppableOver } = useDroppable({
    id: `container-${node.id}`,
    data: { type: 'CONTAINER', nodeId: node.id, nodeType: node.type },
    disabled: node.type === 'action' || node.type === 'divider' || isComboFull
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : 1,
  };

  if (node.type === 'logic_chain') {
      return (
          <div ref={setNodeRef} style={style} className="shrink-0 w-full mb-3">
              <div className={`
                    bg-panel/90 border border-amber-700/50 rounded-lg overflow-hidden shadow-lg flex flex-col transition-all
                    ${isDroppableOver ? 'ring-2 ring-amber-500 shadow-glow-gold' : ''}
                 `}
              >
                  <div className="bg-amber-900/20 p-2 border-b border-amber-800/50 flex items-center justify-between shrink-0">
                     <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase font-rune tracking-wider">
                         <div {...attributes} {...listeners} className="cursor-grab hover:text-white">
                            <Split size={14} />
                         </div>
                         Логический Блок
                     </div>
                     <button onClick={() => onRemove(node.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={12} /></button>
                  </div>

                  <div ref={setDroppableRef} className="flex flex-col gap-1 p-2">
                       <SortableContext items={node.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            {node.children.map((child, idx) => (
                                <CanvasNode 
                                    key={child.id} node={child} participants={participants} onRemove={onRemove} onUpdateData={onUpdateData}
                                    index={idx}
                                />
                            ))}
                       </SortableContext>
                  </div>

                  <div className="p-2 border-t border-amber-800/30 bg-amber-900/10 text-center">
                     {onAddBranch && (
                         <button onClick={() => onAddBranch(node.children[node.children.length - 1]?.id || node.id)} className="text-[10px] bg-amber-900/30 text-amber-400 px-3 py-1 rounded hover:bg-amber-800/50 border border-amber-800/40 uppercase font-bold tracking-wider w-full font-rune">
                            + Добавить Ветвь
                         </button>
                     )}
                  </div>
              </div>
          </div>
      );
  }

  if (node.type === 'divider') {
      return (
          <div ref={setNodeRef} style={style} className="w-full py-2 flex items-center justify-center group relative mb-2">
              <div {...attributes} {...listeners} className="absolute left-0 top-1/2 -translate-y-1/2 p-2 cursor-grab text-slate-600 hover:text-white z-10">
                 <GripVertical size={14} />
              </div>
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-violet-900/50 to-transparent group-hover:via-violet-500 transition-all"></div>
              <div className="absolute bg-[#050b14] px-2 text-[10px] uppercase font-bold text-slate-600 border border-slate-800 rounded group-hover:border-violet-500 group-hover:text-violet-400 z-10 font-rune transition-colors">
                  Разделитель
              </div>
              <button onClick={() => onRemove(node.id)} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-red-400 z-10">
                  <Trash2 size={12} />
              </button>
          </div>
      );
  }

  if (node.type === 'condition') {
      return (
        <div ref={setNodeRef} style={style} className="flex items-start gap-2 mb-2 w-full">
            <div className={`flex-1 border border-violet-900/40 rounded bg-slate-900/50 p-2 flex flex-col gap-2 transition-all ${isDroppableOver ? 'bg-violet-900/20 ring-1 ring-violet-500' : ''}`}>
                 <div className="flex items-center gap-2 mb-1">
                      <div {...attributes} {...listeners} className="cursor-grab text-slate-500 hover:text-white"><GripVertical size={14} /></div>
                      <input 
                        className="bg-transparent border-b border-slate-700 text-xs text-white w-full outline-none focus:border-violet-500 placeholder-slate-600 font-mono"
                        placeholder="Условие (напр. Если увернулся)..."
                        value={node.data?.conditionText || ''}
                        onChange={(e) => onUpdateData(node.id, { conditionText: e.target.value })}
                      />
                 </div>
                 
                 <div ref={setDroppableRef} className="min-h-[40px] border border-dashed border-slate-800 rounded p-1 bg-black/20">
                     {node.children.length === 0 && <div className="text-[10px] text-slate-600 text-center py-2">Перетащите действие сюда</div>}
                     <SortableContext items={node.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {node.children.map((child, idx) => (
                            <CanvasNode key={child.id} node={child} participants={participants} onRemove={onRemove} onUpdateData={onUpdateData} index={idx} />
                        ))}
                     </SortableContext>
                 </div>
            </div>
            <button onClick={() => onRemove(node.id)} className="mt-2 text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
        </div>
      );
  }

  if (node.type === 'combo') {
      return (
        <div ref={setNodeRef} style={style} className="mb-3 w-full">
            <div className={`border border-blue-900/30 rounded-lg p-2 bg-gradient-to-r from-blue-950/20 to-transparent transition-all ${isDroppableOver ? 'ring-1 ring-blue-500 bg-blue-900/20' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div {...attributes} {...listeners} className="cursor-grab text-slate-500 hover:text-blue-400"><GripVertical size={14} /></div>
                        <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider font-rune">Комбо-связка</span>
                    </div>
                    <button onClick={() => onRemove(node.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
                
                <div ref={setDroppableRef} className="flex gap-2 min-h-[50px] items-center overflow-x-auto pb-1">
                    {node.children.length === 0 && <div className="text-[10px] text-slate-600 italic w-full text-center">Перетащите до 2 действий</div>}
                    <SortableContext items={node.children.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                        {node.children.map((child, idx) => (
                            <div key={child.id} className="flex-1 min-w-[150px]">
                                <CanvasNode node={child} participants={participants} onRemove={onRemove} onUpdateData={onUpdateData} isInsideHorizontalContainer index={idx} />
                            </div>
                        ))}
                    </SortableContext>
                </div>
            </div>
        </div>
      );
  }

  if (node.type === 'action') {
      const charId = node.data?.charId;
      const abilityId = node.data?.abilityId;
      const actor = participants.find(p => p.instance_id === charId);
      
      let ability = actor?.flat_abilities?.find(a => a._id === abilityId);
      // Fallback
      if (!ability && actor?.ability_groups) {
          actor.ability_groups.forEach(g => {
             const found = g.abilities.find(a => a._id === abilityId);
             if(found) ability = found;
          });
      }

      if (!ability || !actor) {
           return <div ref={setNodeRef} style={style} className="p-2 bg-red-900/20 border border-red-500/50 text-red-300 rounded text-xs">Unknown Action <button onClick={()=>onRemove(node.id)}>x</button></div>;
      }

      const cardStyle = getAbilityCardStyles(ability);

      // --- SETTINGS LOGIC ---
      const matchingFactors = getMatchingFactors(actor, ability.tags, ability.name);
      const excluded = node.data?.excludedModifiers || [];

      const toggleModifier = (modName: string) => {
          const newExcluded = excluded.includes(modName) 
            ? excluded.filter(m => m !== modName)
            : [...excluded, modName];
          onUpdateData(node.id, { excludedModifiers: newExcluded });
      };

      return (
          <div ref={setNodeRef} style={style} className={`relative group p-2 rounded border shadow-sm transition-all ${cardStyle} ${isInsideHorizontalContainer ? 'h-full flex flex-col justify-between' : 'mb-2'}`}>
              <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                       <div {...attributes} {...listeners} className="cursor-grab opacity-50 hover:opacity-100"><GripVertical size={12} /></div>
                       <div>
                           <div className="font-bold text-xs leading-tight">{ability.name}</div>
                           <div className="text-[9px] opacity-70">{actor.profile.name}</div>
                       </div>
                  </div>
                  
                  {/* Controls */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setShowSettings(!showSettings)} 
                        className={`p-0.5 rounded hover:bg-white/10 ${showSettings ? 'text-white' : 'text-slate-400'}`}
                      >
                         <Settings size={12} />
                      </button>
                      <button 
                        onClick={() => onRemove(node.id)} 
                        className="text-red-400 hover:bg-white/10 rounded p-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                  </div>
              </div>
              
              <div className="mt-2 text-[9px] flex flex-wrap gap-1">
                  {ability.tags.slice(0, 3).map(t => <span key={t} className="px-1 bg-black/20 rounded border border-white/10">{t}</span>)}
              </div>

              {/* SETTINGS AREA (Expanded) */}
              {showSettings && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-[10px] space-y-2 animate-in slide-in-from-top-1 bg-black/20 -mx-2 px-2 pb-1 rounded-b">
                      {/* Weapon Selector */}
                      {actor.equipment.usable.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Sword size={10} className="text-slate-500 shrink-0" />
                            <select 
                                value={node.data?.weaponId || ''} 
                                onChange={(e) => onUpdateData(node.id, { weaponId: e.target.value })}
                                className="bg-black/30 border border-white/10 rounded px-1 py-0.5 w-full outline-none text-[9px] text-slate-300"
                                onClick={(e) => e.stopPropagation()} // Prevent drag start
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <option value="" className="bg-[#0b0d10]">Без оружия</option>
                                {actor.equipment.usable.map(w => <option key={w._id} value={w._id} className="bg-[#0b0d10]">{w.name}</option>)}
                            </select>
                        </div>
                      )}

                      {/* Modifiers List */}
                      {matchingFactors.length > 0 ? (
                          <div className="space-y-1">
                              <div className="font-bold text-slate-500 uppercase tracking-wider text-[8px] mb-1">Модификаторы</div>
                              {matchingFactors.map(f => {
                                  const isActive = !excluded.includes(f.name);
                                  return (
                                      <button 
                                        key={f.name}
                                        onClick={(e) => { e.stopPropagation(); toggleModifier(f.name); }}
                                        className={`w-full flex items-center justify-between px-1.5 py-1 rounded border transition-all ${isActive ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-200' : 'bg-black/20 border-transparent text-slate-600'}`}
                                        onPointerDown={(e) => e.stopPropagation()}
                                      >
                                          <div className="flex items-center gap-1 overflow-hidden">
                                              {isActive ? <CheckSquare size={10} /> : <Square size={10} />}
                                              <span className={`truncate text-[9px] ${!isActive && 'line-through opacity-70'}`}>{f.name}</span>
                                          </div>
                                          <span className="font-mono text-[9px]">{f.bonus > 0 ? `+${f.bonus}` : f.bonus}</span>
                                          <Tooltip title={f.name} desc={f.desc} mech={f.mech} tags={f.tags} />
                                      </button>
                                  )
                              })}
                          </div>
                      ) : (
                          <div className="text-[8px] text-slate-600 italic text-center">Нет доступных модификаторов</div>
                      )}
                  </div>
              )}
              
              {/* Tooltip */}
              <Tooltip title={ability.name} desc={ability.desc_lore} mech={ability.desc_mech} tags={ability.tags} />
          </div>
      );
  }

  return null;
};

interface Props {
  tree: SequenceNode[];
  participants: BattleParticipant[];
  onRemove: (id: string) => void;
  onUpdateData: (id: string, data: any) => void;
  onAddCombo: () => void;
  onAddCondition: () => void;
  onAddDivider: () => void;
  onClear: () => void;
  onAddLogicSibling: (nodeId: string) => void;
  onCommit: () => void;
}

const SequenceCanvas: React.FC<Props> = ({ tree, participants, onRemove, onUpdateData, onAddCombo, onAddCondition, onAddDivider, onClear, onAddLogicSibling, onCommit }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'root-canvas',
        data: { type: 'CONTAINER', nodeId: 'root' }
    });

    return (
        <div className="flex flex-col h-full bg-transparent rounded-lg overflow-hidden border border-violet-900/30 shadow-inner">
             {/* Toolbar */}
             <div className="p-2 bg-[#020408]/50 border-b border-violet-900/20 flex items-center gap-2 overflow-x-auto shrink-0 backdrop-blur-sm">
                 <button onClick={onAddCombo} className="flex items-center gap-1 px-2 py-1 bg-blue-900/20 text-blue-400 border border-blue-800/50 rounded hover:bg-blue-900/40 text-[10px] uppercase font-bold tracking-wider transition-all whitespace-nowrap">
                    <Box size={12} /> Комбо
                 </button>
                 <button onClick={onAddCondition} className="flex items-center gap-1 px-2 py-1 bg-amber-900/20 text-amber-400 border border-amber-800/50 rounded hover:bg-amber-900/40 text-[10px] uppercase font-bold tracking-wider transition-all whitespace-nowrap">
                    <Split size={12} /> Логика
                 </button>
                 <button onClick={onAddDivider} className="flex items-center gap-1 px-2 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded hover:bg-slate-700 text-[10px] uppercase font-bold tracking-wider transition-all whitespace-nowrap">
                    <Minus size={12} /> Разд.
                 </button>
                 <div className="h-4 w-px bg-white/10 mx-1"></div>
                 <button onClick={onClear} className="flex items-center gap-1 px-2 py-1 text-red-400 hover:text-red-300 text-[10px] uppercase font-bold tracking-wider transition-all whitespace-nowrap">
                    <Trash2 size={12} /> Очистить
                 </button>
             </div>

             {/* Canvas Area */}
             <div className="flex-1 overflow-y-auto custom-scrollbar p-3 relative bg-[#020617]/40">
                 <div ref={setNodeRef} className={`min-h-full flex flex-col pb-20 transition-colors ${isOver ? 'bg-violet-900/5' : ''}`}>
                     {tree.length === 0 && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 pointer-events-none opacity-50">
                             <div className="text-4xl mb-2 font-rune">†</div>
                             <p className="text-xs font-serif italic">Перетащите способности сюда...</p>
                         </div>
                     )}
                     
                     <SortableContext items={tree.map(n => n.id)} strategy={verticalListSortingStrategy}>
                        {tree.map((node, idx) => (
                            <CanvasNode 
                                key={node.id} 
                                node={node} 
                                participants={participants} 
                                onRemove={onRemove} 
                                onUpdateData={onUpdateData}
                                onAddBranch={onAddLogicSibling}
                                index={idx}
                            />
                        ))}
                     </SortableContext>
                 </div>
             </div>

             {/* Footer Actions */}
             <div className="p-3 border-t border-violet-900/30 bg-[#020408]/80 backdrop-blur shrink-0">
                 <button 
                    onClick={onCommit}
                    className="w-full bg-violet-700 hover:bg-violet-600 text-white font-bold py-3 rounded uppercase tracking-[0.2em] font-rune flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:scale-[1.01]"
                 >
                     <Play size={16} fill="currentColor" /> Воплотить
                 </button>
             </div>
        </div>
    );
};

export default SequenceCanvas;
