
import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, User, Activity, Clock, Zap, Layers, Shield, Trash2, HeartCrack, PlusCircle, Skull, X, Edit2, Save, Sword, Wand2, Crown } from 'lucide-react';
import { BattleParticipant, JsonAbility, JsonItem, Cooldown, ActiveEffect } from '../types';
import { formatCooldown, formatDuration, TRAUMA_DEFINITIONS } from '../constants';

interface TooltipProps {
    title: string;
    desc?: string;
    mech?: string;
    tags?: string[];
}

const Tooltip: React.FC<TooltipProps> = ({ title, desc, mech, tags }) => (
    <div className="absolute left-0 bottom-full mb-2 w-56 bg-black/95 text-white text-[10px] p-2 rounded shadow-glow border border-violet-900/50 opacity-0 group-hover/chip:opacity-100 transition-opacity pointer-events-none z-[9999] backdrop-blur-sm">
        <div className="font-bold mb-1 border-b border-violet-900 pb-1 text-yellow-500 font-rune tracking-wide">{title}</div>
        {mech && <div className="mb-1 text-cyan-300 font-mono">{mech}</div>}
        {desc && <div className="italic text-slate-400 mb-1 leading-tight font-serif">{desc}</div>}
        {tags && tags.length > 0 && (
            <div className="mt-1 text-xs text-slate-500 border-t border-gray-800 pt-1 font-mono uppercase">
                {tags.join(', ')}
            </div>
        )}
    </div>
);

// Helper to determine color classes based on ability properties
const getAbilityClasses = (ability: JsonAbility, variant: string = 'default') => {
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

    let baseClass = 'bg-slate-800 border-slate-600 text-slate-300'; // Default

    // Priority: Form > Buff > Mix > Single
    if (tags.some(t => t === 'form' || t === 'форма')) {
        baseClass = 'bg-yellow-900/30 border-yellow-600/50 text-yellow-100';
    } else if (tags.some(t => t === 'buff' || t === 'бафф')) {
        baseClass = 'bg-emerald-900/30 border-emerald-600/50 text-emerald-100';
    } else {
        const hasPhys = stats.has('phys');
        const hasMag = stats.has('mag');
        const hasUniq = stats.has('uniq');

        if (hasPhys && hasMag && hasUniq) {
            baseClass = 'bg-[linear-gradient(135deg,rgba(127,29,29,0.4)_0%,rgba(30,58,138,0.4)_50%,rgba(88,28,135,0.4)_100%)] border-slate-500/50 text-white';
        } else if (hasPhys && hasMag) {
            baseClass = 'bg-gradient-to-br from-red-900/40 to-blue-900/40 border-purple-500/30 text-white';
        } else if (hasPhys && hasUniq) {
            baseClass = 'bg-gradient-to-br from-red-900/40 to-purple-900/30 border-pink-500/30 text-white';
        } else if (hasMag && hasUniq) {
            baseClass = 'bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-indigo-500/30 text-white';
        } else if (hasPhys) {
            baseClass = 'bg-red-950/40 border-red-800/40 text-red-100';
        } else if (hasMag) {
            baseClass = 'bg-blue-950/40 border-blue-800/40 text-blue-100';
        } else if (hasUniq) {
            baseClass = 'bg-purple-950/40 border-purple-800/40 text-purple-100';
        }
    }

    if (variant === 'cooldown') {
        // Removed opacity from here to handle it in component
        return `${baseClass} cursor-not-allowed border-opacity-20`;
    }
    
    // Active and Default are full brightness
    return `${baseClass} hover:brightness-125 cursor-grab active:cursor-grabbing shadow-sm border hover:shadow-glow transition-all duration-300`;
};

// Helper for Participant Card Styles
const getFactionStyle = (faction: string) => {
    const f = (faction || '').toLowerCase();
    if (['светлые', 'light', 'свет'].includes(f)) return 'border-amber-500/40 bg-gradient-to-r from-amber-900/10 to-transparent';
    if (['тёмные', 'dark', 'темные', 'тьма'].includes(f)) return 'border-indigo-500/40 bg-gradient-to-r from-indigo-950/30 to-transparent';
    if (['npc', 'нпс', 'бестиарий'].includes(f)) return 'border-red-900/50 bg-gradient-to-r from-red-950/20 to-transparent';
    return 'border-violet-900/30 bg-panel';
};

interface DraggableAbilityProps {
  charId: string;
  ability: JsonAbility;
  variant?: 'default' | 'cooldown' | 'active';
  cooldownInfo?: Cooldown;
  activeInfo?: { val: number, unit: string };
  onRemove?: () => void;
}

const DraggableAbility: React.FC<DraggableAbilityProps> = ({ charId, ability, variant = 'default', cooldownInfo, activeInfo, onRemove }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `source-${charId}-${ability._id}`,
    data: {
      type: 'SOURCE_ABILITY',
      charId,
      abilityId: ability._id
    },
    disabled: variant === 'cooldown' || variant === 'active' // Disable drag for cooldowns and actives
  });

  const colorClasses = getAbilityClasses(ability, variant);
  const isDimmed = variant === 'cooldown';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        group/chip relative rounded-sm pl-2 py-1 text-xs mb-1 inline-flex items-center select-none z-10 transition-all font-sans tracking-tight
        ${onRemove ? 'pr-0 gap-0' : 'pr-2 gap-1'} 
        ${colorClasses}
        ${isDragging ? 'opacity-0' : ''}
      `}
    >
      {/* Wrapper to apply opacity/grayscale without affecting Tooltip */}
      <div className={`flex items-center gap-1 ${isDimmed ? 'opacity-50 grayscale' : ''}`}>
          <span>{ability.name}</span>
          
          {/* Cooldown Display */}
          {cooldownInfo && (
              <span className="text-[9px] text-red-200 font-bold bg-black/60 px-1 rounded border border-red-500/30 shadow-sm font-mono ml-1">
                  {formatCooldown(cooldownInfo.name, cooldownInfo.val, cooldownInfo.unit)}
              </span>
          )}

          {/* Active Duration Display */}
          {activeInfo && (
              <span className="text-[9px] text-emerald-200 font-bold bg-black/60 px-1 rounded border border-emerald-500/30 shadow-sm font-mono ml-1">
                  {formatDuration(activeInfo.val, activeInfo.unit)}
              </span>
          )}
      </div>
      
      {/* Remove Button Integrated */}
      {onRemove && (
          <button 
            type="button"
            onClick={(e) => {
                e.stopPropagation(); // Prevent drag start
                onRemove();
            }}
            className="ml-2 pl-2 pr-2 border-l border-white/20 hover:text-red-300 hover:bg-white/10 transition-colors h-full flex items-center justify-center cursor-pointer pointer-events-auto"
            title={variant === 'cooldown' ? 'Сбросить КД' : 'Удалить эффект'}
          >
              <X size={10} strokeWidth={3} />
          </button>
      )}

      <Tooltip title={ability.name} mech={ability.desc_mech} desc={ability.desc_lore} tags={ability.tags} />
    </div>
  );
};

const ItemChip: React.FC<{ item: JsonItem, isEquipped?: boolean, onToggle?: () => void }> = ({ item, isEquipped, onToggle }) => (
    <div className="group/chip relative flex items-center justify-between text-xs bg-[#0b0d12] p-1.5 rounded border border-violet-900/20 mb-1 hover:border-violet-500/40 transition-colors">
        <span className={isEquipped ? 'text-violet-300 shadow-glow' : 'text-slate-500'}>{item.name}</span>
        {onToggle && (
            <button 
            type="button"
            onClick={onToggle}
            className={`ml-2 px-1.5 py-0.5 rounded-sm text-[9px] uppercase font-bold transition-all font-mono tracking-wider ${isEquipped ? 'bg-violet-600 text-white shadow-glow' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
            >
                {isEquipped ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
        )}
        <Tooltip title={item.name} mech={item.desc_mech} desc={item.desc_lore} tags={item.tags} />
    </div>
  );


interface AccordionSectionProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    isEmpty?: boolean;
    titleColor?: string;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, icon, children, defaultOpen = false, isEmpty, titleColor = "text-slate-500" }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    if (isEmpty) return null;

    return (
        <div className="border-l border-violet-900/20 ml-1 pl-2 mb-2 hover:border-violet-500/40 transition-colors">
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1 ${titleColor} text-[10px] uppercase font-bold tracking-widest mb-1 hover:text-white transition-all w-full text-left outline-none focus:text-white font-rune`}
            >
                {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                {icon}
                {title}
            </button>
            {isOpen && <div className="pl-1 animate-in slide-in-from-top-1 duration-200">{children}</div>}
        </div>
    );
};

interface DebuffFormState {
    name: string;
    mod: string;
    stat: string;
    tag: string;
    dur: string;
    unit: string;
}

interface Props {
  participants: BattleParticipant[];
  onToggleEquip: (participantId: string, itemId: string) => void;
  onRemoveParticipant: (participantId: string) => void;
  onAddInjury: (participantId: string, templateId: string) => void;
  onRemoveInjury: (participantId: string, index: number) => void;
  onAddDebuff: (participantId: string, name: string, tag: string, val: number, dur: number, unit: string, extraTags?: string) => void;
  onRemoveEffect?: (participantId: string, effectId: string) => void;
  onRemoveCooldown?: (participantId: string, cooldownId: string) => void;
  onUpdateParticipant?: (id: string, updates: any) => void;
}

const SourcePanel: React.FC<Props> = ({ participants, onToggleEquip, onRemoveParticipant, onAddInjury, onRemoveInjury, onAddDebuff, onRemoveEffect, onRemoveCooldown, onUpdateParticipant }) => {
  const [openParticipants, setOpenParticipants] = useState<Record<string, boolean>>({});
  const [selectedTrauma, setSelectedTrauma] = useState<string>(Object.keys(TRAUMA_DEFINITIONS)[0]);
  const [editMode, setEditMode] = useState<string | null>(null); // Participant ID currently being edited
  
  // Custom Debuff State
  const [debuffState, setDebuffState] = useState<DebuffFormState>({ name: '', mod: '-5', stat: 'phys', tag: '', dur: '2', unit: 'turn' });

  const toggleParticipant = (id: string) => {
      setOpenParticipants(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isCombatReady = (tags: string[] = []) => {
      return !tags.some(t => t.toLowerCase() === 'no_war');
  };

  const handleCreateDebuff = (participantId: string) => {
      if (!debuffState.name) return;
      const val = parseInt(debuffState.mod) || 0;
      const dur = parseInt(debuffState.dur) || 1;
      
      const primaryTag = debuffState.stat; 
      onAddDebuff(participantId, debuffState.name, primaryTag, val, dur, debuffState.unit, debuffState.tag);
      setDebuffState({ ...debuffState, name: '' });
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-10 custom-scrollbar">
      {participants.map(p => {
        const isOpen = openParticipants[p.instance_id] ?? true;
        const isEditing = editMode === p.instance_id;

        const activeNames = new Set(p.active_effects.map(e => e.name));
        const cooldownMap = new Map<string, Cooldown>();
        p.cooldowns.forEach(cd => cooldownMap.set(cd.name, cd));

        const activeAbilities: { ability: JsonAbility, effect: ActiveEffect }[] = [];
        const cooldownAbilities: { ability: JsonAbility, cooldown: Cooldown }[] = [];
        const isUnavailable = (name: string) => activeNames.has(name) || cooldownMap.has(name);

        p.active_effects.forEach(eff => {
            const original = p.flat_abilities.find(a => a.name === eff.name);
            // Hydrate description from original if possible, active effects need this for tooltip
            const descMech = original?.desc_mech || `Effect: ${eff.name}`;
            const descLore = original?.desc_lore || '';
            const abilityObj = original || { _id: eff.id, name: eff.name, tags: eff.tags || [], bonuses: eff.bonuses, cd: 0, cd_unit: '', dur: 0, dur_unit: '', desc_mech: descMech, desc_lore: descLore };
            activeAbilities.push({ ability: abilityObj, effect: eff });
        });

        p.cooldowns.forEach(cd => {
             const original = p.flat_abilities.find(a => a.name === cd.name);
             const descMech = original?.desc_mech || 'On Cooldown';
             const descLore = original?.desc_lore || '';
             const abilityObj = original || { _id: cd.id, name: cd.name, tags: [], bonuses: [], cd: 0, cd_unit: '', dur: 0, dur_unit: '', desc_mech: descMech, desc_lore: descLore };
             cooldownAbilities.push({ ability: abilityObj, cooldown: cd });
        });

        const cardStyle = getFactionStyle(p.profile.faction);

        return (
          <div key={p.instance_id} className={`rounded border shadow-md overflow-hidden transition-all duration-300 hover:shadow-glow ${cardStyle}`}>
            <div 
                className={`p-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all ${isOpen ? 'bg-black/20' : ''}`}
                onClick={() => toggleParticipant(p.instance_id)}
            >
                <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={14} className="text-violet-400" /> : <ChevronRight size={14} className="text-slate-500" />}
                    <User size={14} className="text-violet-500" />
                    <span className="font-bold text-sm text-slate-200 font-rune tracking-wide">
                      {p.profile.name} <span className="text-xs text-slate-500 font-mono tracking-normal opacity-70">{p.profile.level} ур.</span>
                    </span>
                </div>
                <div className="flex items-center gap-3">
                     <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemoveParticipant(p.instance_id); }}
                        className="text-slate-600 hover:text-red-500 transition-colors"
                     >
                         <Trash2 size={12} />
                     </button>
                </div>
            </div>

            {isOpen && (
                <div className="p-2 space-y-1 bg-black/10">
                    
                    {/* EDIT MODE TOGGLE */}
                    <div className="flex justify-end mb-2">
                        {isEditing ? (
                            <button 
                                onClick={() => setEditMode(null)} 
                                className="flex items-center gap-1 text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded border border-emerald-500/30 hover:bg-emerald-800/50"
                            >
                                <Save size={10} /> Сохранить
                            </button>
                        ) : (
                            <button 
                                onClick={() => setEditMode(p.instance_id)} 
                                className="flex items-center gap-1 text-[10px] bg-slate-900/50 text-slate-400 px-2 py-1 rounded border border-slate-700 hover:text-white"
                            >
                                <Edit2 size={10} /> Ред.
                            </button>
                        )}
                    </div>

                    {/* STATS & NAME EDITOR */}
                    {isEditing && onUpdateParticipant && (
                        <div className="bg-[#0b0d12] p-2 rounded border border-violet-900/30 mb-2 space-y-2">
                            <input 
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                value={p.profile.name}
                                onChange={(e) => onUpdateParticipant(p.instance_id, { profile: { ...p.profile, name: e.target.value } })}
                                placeholder="Имя"
                            />
                            <div className="flex gap-2">
                                <div className="flex-1 flex items-center gap-1 bg-red-900/10 p-1 rounded border border-red-900/20">
                                    <Sword size={10} className="text-red-500" />
                                    <input 
                                        type="number" 
                                        className="w-full bg-transparent text-xs text-center text-red-200 outline-none"
                                        value={p.stats.phys}
                                        onChange={(e) => onUpdateParticipant(p.instance_id, { stats: { ...p.stats, phys: parseInt(e.target.value) } })}
                                    />
                                </div>
                                <div className="flex-1 flex items-center gap-1 bg-blue-900/10 p-1 rounded border border-blue-900/20">
                                    <Wand2 size={10} className="text-blue-500" />
                                    <input 
                                        type="number" 
                                        className="w-full bg-transparent text-xs text-center text-blue-200 outline-none"
                                        value={p.stats.magic}
                                        onChange={(e) => onUpdateParticipant(p.instance_id, { stats: { ...p.stats, magic: parseInt(e.target.value) } })}
                                    />
                                </div>
                                <div className="flex-1 flex items-center gap-1 bg-purple-900/10 p-1 rounded border border-purple-900/20">
                                    <Crown size={10} className="text-purple-500" />
                                    <input 
                                        type="number" 
                                        className="w-full bg-transparent text-xs text-center text-purple-200 outline-none"
                                        value={p.stats.unique}
                                        onChange={(e) => onUpdateParticipant(p.instance_id, { stats: { ...p.stats, unique: parseInt(e.target.value) } })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <AccordionSection title="Травмы" icon={<HeartCrack size={10}/>} defaultOpen={false} titleColor="text-red-400">
                        <div className="flex flex-col gap-2 bg-[#0b0d12]/50 p-2 rounded border border-red-900/20">
                            {p.medcard.injuries.length > 0 ? (
                                <div className="space-y-1">
                                    {p.medcard.injuries.map((inj, idx) => {
                                        const def = TRAUMA_DEFINITIONS[inj.template_id];
                                        return (
                                            <div key={idx} className="flex justify-between items-center bg-red-900/10 px-2 py-1 rounded border border-red-900/30">
                                                <span className="text-[10px] text-red-200 font-mono">
                                                    {def ? def.label : inj.template_id} {inj.count > 1 ? `(x${inj.count})` : ''}
                                                </span>
                                                <button onClick={() => onRemoveInjury(p.instance_id, idx)} className="text-red-500 hover:text-red-300">
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-[10px] text-slate-600 italic font-mono">Нет активных травм</div>
                            )}

                            <div className="flex gap-1 mt-1 border-t border-violet-900/20 pt-2">
                                <select 
                                    className="flex-1 bg-[#0b0d12] text-[10px] text-white border border-violet-900/30 rounded px-1 outline-none focus:border-red-500"
                                    value={selectedTrauma}
                                    onChange={(e) => setSelectedTrauma(e.target.value)}
                                >
                                    {Object.entries(TRAUMA_DEFINITIONS).map(([key, def]) => (
                                        <option key={key} value={key} className="bg-[#0b0d12] text-white">{def.label} ({def.value})</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={() => onAddInjury(p.instance_id, selectedTrauma)}
                                    className="px-2 py-1 bg-red-900/40 hover:bg-red-800 text-red-100 rounded border border-red-700/50 text-[10px]"
                                >
                                    <PlusCircle size={12} />
                                </button>
                            </div>
                        </div>
                    </AccordionSection>
                    
                    {/* CUSTOM DEBUFFS SECTION */}
                    <AccordionSection title="Ручные Эффекты" icon={<Skull size={10}/>} defaultOpen={false} titleColor="text-fuchsia-400">
                         <div className="bg-[#0b0d12]/50 p-2 rounded border border-fuchsia-900/20 space-y-2">
                             <div className="flex flex-col gap-1">
                                 <input 
                                    type="text" 
                                    placeholder="Название эффекта..." 
                                    className="text-[10px] bg-[#0b0d12] border border-violet-900/30 rounded px-1 py-1 text-white placeholder-slate-600 focus:border-fuchsia-500 outline-none"
                                    value={debuffState.name}
                                    onChange={(e) => setDebuffState({...debuffState, name: e.target.value})}
                                 />
                                 
                                 <input 
                                    type="text" 
                                    placeholder="Доп. тег (напр. огонь)" 
                                    className="text-[10px] bg-[#0b0d12] border border-violet-900/30 rounded px-1 py-1 text-white placeholder-slate-600 focus:border-fuchsia-500 outline-none"
                                    value={debuffState.tag}
                                    onChange={(e) => setDebuffState({...debuffState, tag: e.target.value})}
                                 />

                                 <div className="flex gap-1 items-center">
                                     <input 
                                        type="number" 
                                        className="w-12 text-[10px] bg-[#0b0d12] border border-violet-900/30 rounded px-1 py-1 text-white text-center"
                                        value={debuffState.mod}
                                        onChange={(e) => setDebuffState({...debuffState, mod: e.target.value})}
                                     />
                                     <select 
                                        className="w-16 text-[10px] bg-[#0b0d12] border border-violet-900/30 rounded px-1 py-1 text-white"
                                        value={debuffState.stat}
                                        onChange={(e) => setDebuffState({...debuffState, stat: e.target.value})}
                                     >
                                         <option value="phys" className="bg-[#0b0d12]">ФИЗ</option>
                                         <option value="mag" className="bg-[#0b0d12]">МАГ</option>
                                         <option value="uniq" className="bg-[#0b0d12]">УНИК</option>
                                         <option value="none" className="bg-[#0b0d12]">ОБЩ</option>
                                     </select>
                                     
                                     <input 
                                        type="number"
                                        className="w-10 text-[10px] bg-[#0b0d12] border border-violet-900/30 rounded px-1 py-1 text-white text-center"
                                        value={debuffState.dur}
                                        onChange={(e) => setDebuffState({...debuffState, dur: e.target.value})}
                                     />

                                     <select 
                                        className="flex-1 text-[10px] bg-[#0b0d12] border border-violet-900/30 rounded px-1 py-1 text-white"
                                        value={debuffState.unit}
                                        onChange={(e) => setDebuffState({...debuffState, unit: e.target.value})}
                                     >
                                         <option value="turn" className="bg-[#0b0d12]">Ход</option>
                                         <option value="action" className="bg-[#0b0d12]">Дейст</option>
                                         <option value="scene" className="bg-[#0b0d12]">Сцена</option>
                                     </select>
                                 </div>
                                 <button 
                                    onClick={() => handleCreateDebuff(p.instance_id)}
                                    className="w-full text-[10px] uppercase font-bold bg-fuchsia-900/20 hover:bg-fuchsia-800/40 text-fuchsia-300 border border-fuchsia-800/30 rounded py-1 transition-colors tracking-wider"
                                 >
                                     Применить
                                 </button>
                             </div>
                         </div>
                    </AccordionSection>

                    <AccordionSection title="Активные Эффекты" icon={<Activity size={10}/>} defaultOpen={true} isEmpty={activeAbilities.length === 0} titleColor="text-emerald-400">
                        <div className="flex flex-wrap">
                            {activeAbilities.map(({ ability, effect }) => (
                                <DraggableAbility 
                                    key={`active-${ability._id}`} 
                                    charId={p.instance_id} 
                                    ability={ability} 
                                    variant="active" 
                                    activeInfo={{ val: effect.duration_left, unit: effect.unit }}
                                    onRemove={onRemoveEffect ? () => onRemoveEffect(p.instance_id, effect.id) : undefined}
                                />
                            ))}
                        </div>
                    </AccordionSection>

                    <AccordionSection title="Перезарядка" icon={<Clock size={10}/>} defaultOpen={true} isEmpty={cooldownAbilities.length === 0} titleColor="text-slate-400">
                        <div className="flex flex-wrap">
                            {cooldownAbilities.map(({ ability, cooldown }) => {
                                return (
                                    <DraggableAbility 
                                        key={`cd-${ability._id}`} 
                                        charId={p.instance_id} 
                                        ability={ability} 
                                        variant="cooldown" 
                                        cooldownInfo={cooldown}
                                        onRemove={onRemoveCooldown ? () => onRemoveCooldown(p.instance_id, cooldown.id) : undefined}
                                    />
                                );
                            })}
                        </div>
                    </AccordionSection>
                    
                    {p.ability_groups.map(group => {
                        const availableAbilities = (group.abilities || []).filter(ab => !isUnavailable(ab.name) && isCombatReady(ab.tags));
                        if (availableAbilities.length === 0) return null;
                        
                        return (
                            <AccordionSection key={group.name} title={group.name} icon={<Layers size={10}/>}>
                                <div className="flex flex-wrap">
                                    {availableAbilities.map(ability => <DraggableAbility key={ability._id} charId={p.instance_id} ability={ability} />)}
                                </div>
                            </AccordionSection>
                        );
                    })}

                    <AccordionSection title="Предметы" icon={<Zap size={10}/>} isEmpty={p.equipment.usable.length === 0}>
                        <div className="flex flex-wrap">
                            {p.equipment.usable.filter(i => isCombatReady(i.tags)).map(item => <DraggableAbility key={item._id} charId={p.instance_id} ability={item as unknown as JsonAbility} />)}
                        </div>
                    </AccordionSection>

                    <AccordionSection title="Экипировка" icon={<Shield size={10}/>} defaultOpen={false} isEmpty={p.equipment.wearable.length === 0}>
                         <div className="flex flex-col gap-1">
                             {p.equipment.wearable.map(item => (
                                 <ItemChip key={item._id} item={item} isEquipped={item.is_equipped} onToggle={() => onToggleEquip(p.instance_id, item._id)} />
                             ))}
                         </div>
                    </AccordionSection>

                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SourcePanel;
