
import React from 'react';
import { CharacterData, Faction, StatType } from '../types';
import { NPC_VOLUMES } from '../constants';
import { Card, StyledInput, StyledTextarea, StyledSelect, StatIcons, StatColors, StatBg } from './Shared';
import { Coins, Heart, Link as LinkIcon, Shield } from 'lucide-react';

interface Props {
  character: CharacterData;
  isEditMode: boolean;
  onChange: (u: Partial<CharacterData>) => void;
}

const SheetHeader: React.FC<Props> = ({ character, isEditMode, onChange }) => {

  const updateProfile = (field: keyof CharacterData['profile'], val: any) => {
    onChange({ profile: { ...character.profile, [field]: val } });
  };
  
  const updateMeta = (field: keyof CharacterData['meta'], val: any) => {
    onChange({ meta: { ...character.meta, [field]: val } });
  };
  
  const updateStats = (field: keyof CharacterData['stats'], val: any) => {
    onChange({ stats: { ...character.stats, [field]: val } });
  };
  
  const updateResources = (idx: number, field: string, val: any) => {
    const next = [...character.resources];
    next[idx] = { ...next[idx], [field]: val };
    onChange({ resources: next });
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Top Bar: Level, Currency, Link, Save */}
      <Card className="flex flex-wrap items-center justify-between gap-4 py-3 bg-gray-900/80 sticky top-0 z-20 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center gap-4">
           {/* Level */}
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-700 text-cyan-200 font-bold text-sm shadow-[0_0_10px_rgba(8,145,178,0.3)]">
               {character.profile.level}
             </div>
             {isEditMode && (
               <select 
                 value={character.profile.level}
                 onChange={(e) => updateProfile('level', parseInt(e.target.value))}
                 className="bg-gray-800 text-xs rounded border border-gray-700 p-1"
               >
                 {[1,2,3,4,5].map(l => (
                   <option key={l} value={l} disabled={l === 5 && character.profile.faction !== Faction.NPC}>{l}</option>
                 ))}
               </select>
             )}
           </div>
           
           <div className="h-6 w-px bg-gray-700 mx-2"></div>

           {/* Currency */}
           <div className="flex items-center gap-4 text-sm font-medium">
             <div className="flex items-center gap-1.5 text-amber-400">
                <Coins size={16} fill="currentColor" className="text-amber-500" />
                {isEditMode ? 
                  <input type="number" className="w-16 bg-transparent border-b border-gray-700" value={character.profile.currencies.juhe} onChange={e => updateProfile('currencies', {...character.profile.currencies, juhe: parseInt(e.target.value)})} /> 
                  : character.profile.currencies.juhe
                }
             </div>
             <div className="flex items-center gap-1.5 text-gray-400">
                <Coins size={16} fill="currentColor" className="text-gray-500" />
                {isEditMode ? 
                  <input type="number" className="w-16 bg-transparent border-b border-gray-700" value={character.profile.currencies.jumi} onChange={e => updateProfile('currencies', {...character.profile.currencies, jumi: parseInt(e.target.value)})} /> 
                  : character.profile.currencies.jumi
                }
             </div>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-xs text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer">
             <LinkIcon size={14} />
             {isEditMode ? 
               <input placeholder="Ссылка на владельца" className="bg-transparent border-b border-gray-700 w-32" value={character.meta.owner_link} onChange={e => updateMeta('owner_link', e.target.value)} />
               : <a href={character.meta.owner_link} target="_blank" rel="noreferrer">{character.meta.owner_link || "Владелец"}</a>
             }
           </div>
           
           <div 
             onClick={() => isEditMode && updateMeta('save_status', !character.meta.save_status)}
             className={`p-2 rounded-full border transition-all cursor-pointer ${character.meta.save_status ? 'bg-red-900/20 border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-gray-800 border-gray-700 text-gray-600'}`}
             title="Сейв от смерти"
           >
             <Heart size={18} fill={character.meta.save_status ? "currentColor" : "none"} />
           </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identity & Stats */}
        <div className="lg:col-span-2 space-y-4">
           {/* Visual Stat Blocks */}
           <div className="grid grid-cols-3 gap-4">
              {[StatType.PHYS, StatType.MAGIC, StatType.UNIQUE].map(stat => (
                <div key={stat} className={`relative p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${StatBg[stat]}`}>
                   <div className={`${StatColors[stat]}`}>{StatIcons[stat]}</div>
                   {isEditMode ? (
                     <input 
                       type="number" 
                       value={character.stats[stat]} 
                       onChange={(e) => updateStats(stat, parseInt(e.target.value))}
                       className="bg-transparent text-2xl font-bold text-center w-full focus:outline-none"
                     />
                   ) : (
                     <span className="text-2xl font-bold text-gray-200">{character.stats[stat]}</span>
                   )}
                   <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold">{stat}</span>
                </div>
              ))}
           </div>

           <Card>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               <StyledInput label="Имя" isEditMode={isEditMode} value={character.profile.name} onChange={e => updateProfile('name', e.target.value)} className="text-lg font-bold text-cyan-400" />
               <StyledSelect 
                 label="Фракция" 
                 isEditMode={isEditMode} 
                 value={character.profile.faction} 
                 onChange={e => updateProfile('faction', e.target.value)}
                 options={Object.values(Faction).map(f => ({ label: f, value: f }))} 
               />
             </div>
             {character.profile.faction === Faction.NPC && (
               <div className="mb-4">
                 <StyledSelect 
                   label="Том NPC" 
                   isEditMode={isEditMode} 
                   value={character.profile.npc_volume} 
                   onChange={e => updateProfile('npc_volume', e.target.value)}
                   options={NPC_VOLUMES.map(v => ({ label: v, value: v }))} 
                 />
               </div>
             )}
             <StyledTextarea label="Биография / Заметки" isEditMode={isEditMode} value={character.profile.bio} onChange={e => updateProfile('bio', e.target.value)} className="min-h-[100px]" />
           </Card>
        </div>

        {/* Resources */}
        <div className="space-y-3">
          {character.resources.map((res, idx) => (
            <div key={idx} className="bg-gray-900 border border-gray-800 rounded-lg p-3 relative overflow-hidden group">
               <div className="flex justify-between items-end mb-1 relative z-10">
                 {isEditMode ? (
                   <input className="bg-transparent font-bold text-sm text-gray-300 w-1/2" value={res.label} onChange={e => updateResources(idx, 'label', e.target.value)} />
                 ) : (
                   <span className="font-bold text-sm text-gray-300">{res.label}</span>
                 )}
                 <div className="flex items-center gap-1 font-mono text-sm">
                    {isEditMode ? (
                       <>
                         <input type="number" className="bg-gray-800 w-12 text-center rounded border border-gray-700" value={res.current} onChange={e => updateResources(idx, 'current', parseInt(e.target.value))} />
                         <span>/</span>
                         <input type="number" className="bg-gray-800 w-12 text-center rounded border border-gray-700" value={res.max} onChange={e => updateResources(idx, 'max', parseInt(e.target.value))} />
                       </>
                    ) : (
                       <span>
                         <span className="text-white">{res.current}</span>
                         {res.max > 0 && <span className="text-gray-500">/{res.max}</span>}
                       </span>
                    )}
                 </div>
               </div>
               
               {!isEditMode && res.max > 0 && (
                 <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-2 relative z-10">
                   <div 
                      className="h-full bg-cyan-600 transition-all duration-500" 
                      style={{ width: `${Math.min(100, (res.current / res.max) * 100)}%` }}
                   ></div>
                 </div>
               )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SheetHeader;
