
import React, { useRef, useState } from 'react';
import { CharacterData, Faction, StatType, InjuryDefinition } from '../types';
import { NPC_VOLUMES } from '../constants';
import { StyledInput, StyledTextarea, StyledSelect, StatIcons, StatColors, StatBg, Button } from './Shared';
import { downloadCharacterFile } from '../utils/storage';
import { Coins, User, Download, Plus, Trash2, Skull, GitBranch, ShieldCheck, Upload, Loader2, Link2, Link2Off, ChevronLeft, ScrollText, BookOpen, Calculator, RotateCcw, Save, Edit3 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { DisplayMode } from '../App';
import { uploadAvatar } from '../utils/supabaseService';
/* [DIALECT] */ import { useDialect } from '../dialect_module/DialectContext';
import { useUI } from '../context/UIContext';

interface Props {
  character: CharacterData;
  isEditMode: boolean;
  onChange: (u: Partial<CharacterData>) => void;
  displayMode: DisplayMode;
  setDisplayMode: (m: DisplayMode) => void;
  characters: CharacterData[];
  onNavigate: (id: string) => void;
  onDelete?: (id: string) => void;
  injuryDefinitions?: InjuryDefinition[];
}

const SheetHeader: React.FC<Props> = ({ character, isEditMode, onChange, displayMode, setDisplayMode, characters, onNavigate, onDelete, injuryDefinitions = [] }) => {
  /* [DIALECT] */ const { t, isToggleVisible, toggleDialect, isOldSlavonic } = useDialect();
  const { showAlert, showConfirm } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // New Structure: profile instead of identity
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

  const addResource = () => {
    const next = [...character.resources, { label: "Ресурс", current: 0, max: 0 }];
    onChange({ resources: next });
  };

  const removeResource = (idx: number) => {
    showConfirm("Вы уверены, что хотите удалить этот ресурс?", () => {
      const next = character.resources.filter((_, i) => i !== idx);
      onChange({ resources: next });
    }, "Удаление ресурса");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadAvatar(file);
      updateMeta('avatar_url', url);
    } catch (error: any) {
      showAlert(error.message || "Ошибка загрузки файла", "Ошибка");
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Calculate Trauma (Phys Penalty) - uses 'medcard'
  const getTraumaPenalty = () => {
    let penalty = 0;
    
    // Safety check for medcard/injuries existence
    const injuries = character.medcard?.injuries || [];
    
    const countsByTag: Record<string, number> = {};
    injuries.forEach(inj => {
      countsByTag[inj.template_id] = (countsByTag[inj.template_id] || 0) + (inj.count || 1);
    });

    Object.entries(countsByTag).forEach(([tag, totalCount]) => {
       const def = injuryDefinitions.find(d => d.tag === tag);
       if (def && def.type === 1) { // Type 1 is Physical
          const val = Math.abs(def.value);
          if (def.stack && def.stack > 1) {
             const appliedStacks = Math.floor(totalCount / def.stack);
             penalty += appliedStacks * val;
          } else {
             penalty += totalCount * val;
          }
       }
    });

    return penalty;
  };

  const trauma = getTraumaPenalty();
  const maxTrauma = 40; // Death threshold assumption
  const traumaPercent = Math.min(100, (trauma / maxTrauma) * 100);

  const chartData = [
    // [DIALECT] Translate chart labels
    { subject: t('stat_phys_short', 'ФИЗ'), A: character.stats.phys, fullMark: 30 },
    { subject: t('stat_mag_short', 'МАГ'), A: character.stats.magic, fullMark: 30 },
    { subject: t('stat_uni_short', 'УНИК'), A: character.stats.unique, fullMark: 30 },
  ];

  // Dynamic Styles based on Faction - Darker, more magical
  const getFactionColor = (f: Faction) => {
    switch (f) {
      case Faction.LIGHT: return "text-amber-300 border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]";
      case Faction.DARK: return "text-violet-300 border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]";
      case Faction.NPC: return "text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(248,113,113,0.1)]";
      case Faction.GRAVEYARD: return "text-slate-400 border-slate-600/20";
      default: return "text-violet-300 border-violet-500/20";
    }
  };

  const factionColor = getFactionColor(character.profile.faction);
  
  // Companion Logic
  const COMPANION_VOLUME = "Спутники и Рабы";
  const master = character.meta.master_id ? characters.find(c => c.id === character.meta.master_id) : null;
  const isCompanion = character.profile.faction === Faction.NPC && character.profile.npc_volume === COMPANION_VOLUME;
  const isUnit = !!character.meta.master_id && !isCompanion;

  // [DIALECT] Helper for mapping
  const getVolumeLabel = (vol: string) => {
    if (vol.startsWith("Том 1")) return t('vol_1', vol);
    if (vol.startsWith("Том 2")) return t('vol_2', vol);
    if (vol.startsWith("Том 3")) return t('vol_3', vol);
    if (vol.startsWith("Том 4")) return t('vol_4', vol);
    if (vol.startsWith("Том 5")) return t('vol_5', vol);
    if (vol.startsWith("Том 6")) return t('vol_6', vol);
    if (vol === "Спутники и Рабы") return t('vol_servants', vol);
    if (vol === "Отрицательные NPC") return t('vol_neg', vol);
    if (vol === "Положительные NPC") return t('vol_pos', vol);
    return vol;
  };

  const getFactionLabel = (f: Faction) => {
      switch(f) {
          case Faction.LIGHT: return t('fac_light', Faction.LIGHT);
          case Faction.DARK: return t('fac_dark', Faction.DARK);
          case Faction.NPC: return t('fac_npc', Faction.NPC);
          case Faction.GRAVEYARD: return t('fac_graveyard', Faction.GRAVEYARD);
          default: return f;
      }
  };

  return (
    <div className="space-y-6 mb-6">
      
      {/* 1. Header Controls & Trauma Bar */}
      <div className="bg-[#050b14] border border-violet-900/30 p-3 relative min-[1150px]:sticky min-[1150px]:top-16 z-40 shadow-2xl rune-clip-r">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Trauma Bar (The "Health" Bar) */}
          <div className="flex-1 w-full px-2">
            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1 font-serif tracking-wider">
              {/* [DIALECT] */}
              <span>{t('mech_integrity', "Целостность Тела")}</span>
              <span className={trauma >= 40 ? "text-red-500 animate-pulse" : "text-slate-400"}>
                 -{trauma} / -{maxTrauma} {t('mech_injuries', 'Штраф')}
              </span>
            </div>
            <div className="h-2 w-full bg-[#020408] border border-slate-800 relative">
               {/* Markers */}
               <div className="absolute left-[25%] top-0 bottom-0 w-px bg-slate-800 z-10"></div>
               <div className="absolute left-[50%] top-0 bottom-0 w-px bg-slate-800 z-10"></div>
               <div className="absolute left-[75%] top-0 bottom-0 w-px bg-slate-800 z-10"></div>
               
               {/* Fill */}
               <div 
                 className={`h-full transition-all duration-500 ${trauma >= 35 ? 'bg-red-600 shadow-[0_0_10px_red]' : 'bg-red-900/80 shadow-[0_0_5px_red]'}`}
                 style={{ width: `${traumaPercent}%` }}
               ></div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
             {/* Gold (Juhe) - Currencies now in profile */}
             <div className="flex items-center gap-2 text-amber-400 bg-amber-950/30 px-3 py-1 border border-amber-900/30 font-serif" title={t('meta_gold', "Джухе")}>
                <Coins size={14} />
                {isEditMode ? 
                  <input type="number" className="w-12 bg-transparent text-xs font-mono text-center focus:outline-none" value={character.profile.currencies.juhe || 0} onChange={e => updateProfile('currencies', {...character.profile.currencies, juhe: parseInt(e.target.value)})} /> 
                  : <span className="text-xs font-mono font-bold">{character.profile.currencies.juhe || 0}</span>
                }
             </div>
             
             {/* Silver (Jumi) */}
             <div className="flex items-center gap-2 text-slate-300 bg-slate-900/50 px-3 py-1 border border-slate-700 font-serif" title={t('meta_silver', "Джуми")}>
                <Coins size={14} />
                {isEditMode ? 
                  <input type="number" className="w-12 bg-transparent text-xs font-mono text-center focus:outline-none" value={character.profile.currencies.jumi || 0} onChange={e => updateProfile('currencies', {...character.profile.currencies, jumi: parseInt(e.target.value)})} /> 
                  : <span className="text-xs font-mono font-bold">{character.profile.currencies.jumi || 0}</span>
                }
             </div>

             <button onClick={() => downloadCharacterFile(character)} className="text-slate-500 hover:text-white transition-colors" title="Скачать JSON"><Download size={18} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identity & Stats */}
        <div className="lg:col-span-2 space-y-4">
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Avatar Column */}
              <div className="col-span-1 flex flex-col gap-2">
                 {/* Rune-shaped Avatar */}
                 <div className={`aspect-square bg-[#050b14] border border-violet-900/20 overflow-hidden relative group rune-clip ${factionColor.split(' ')[1]}`}>
                    {character.meta.avatar_url ? (
                      <img src={character.meta.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-800"><User size={48}/></div>
                    )}
                    
                    {/* Upload Overlay */}
                    {isEditMode && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => fileInputRef.current?.click()}
                           disabled={isUploading}
                           className="bg-violet-600 hover:bg-violet-500 text-white rounded-full p-3 shadow-lg flex items-center gap-2 font-bold text-xs"
                         >
                            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                         </button>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                    />
                 </div>
                 
                 {/* Master/Unit Link */}
                 {character.meta.master_id && (
                   <button 
                     onClick={() => onNavigate(character.meta.master_id!)}
                     className="flex items-center justify-center gap-1 bg-violet-900/10 text-violet-400 hover:bg-violet-900/30 hover:text-violet-200 transition-all text-[10px] font-bold py-2 px-2 border border-violet-800/30 w-full rune-clip-r font-serif uppercase tracking-widest"
                   >
                     <GitBranch size={12} /> 
                     {master ? `СВЯЗАН: ${master.profile.name}` : "ЮНИТ (СВЯЗАН)"}
                   </button>
                 )}

                 {isEditMode && (
                   <div className="flex flex-col gap-1">
                      <input 
                        type="text" 
                        placeholder="URL аватарки" 
                        className="bg-[#020408] border border-slate-800 text-xs p-1 rounded-sm w-full text-slate-500 focus:text-slate-200 outline-none" 
                        value={character.meta.avatar_url}
                        onChange={e => updateMeta('avatar_url', e.target.value)}
                      />
                      <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-[10px] py-1 rounded-sm w-full uppercase font-bold tracking-wider font-serif"
                      >
                         {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                         {/* [DIALECT] */}
                         {isUploading ? t('meta_uploading', "Загрузка...") : t('meta_upload_avatar', "Загрузить (10MB)")}
                      </button>
                   </div>
                 )}
                 
                 {/* Save Status / Death Cause Toggle */}
                 <div className="flex flex-col gap-2 mt-2">
                   {character.profile.faction !== Faction.GRAVEYARD ? (
                     <>
                        <button 
                           onClick={() => isEditMode && updateMeta('save_status', !character.meta.save_status)}
                           className={`flex items-center justify-center gap-2 py-2 rounded-sm border w-full text-xs font-bold font-serif uppercase tracking-wider transition-all ${
                               character.meta.save_status 
                               ? 'bg-emerald-900/10 text-emerald-500 border-emerald-900/30 hover:bg-emerald-900/20' 
                               : 'bg-red-950/20 text-red-500 border-red-900/30 hover:bg-red-900/20'
                           }`}
                        >
                           {character.meta.save_status ? <ShieldCheck size={14} /> : <Skull size={14} />}
                           {/* [DIALECT] */}
                           {character.meta.save_status ? t('meta_save_ok', "Есть сейв") : t('meta_save_lost', "Сейв потерян")}
                        </button>
                        
                        {!character.meta.save_status && (
                          <StyledTextarea
                            isEditMode={isEditMode}
                            value={character.meta.save_status_reason || ""}
                            onChange={e => updateMeta('save_status_reason', e.target.value)}
                            placeholder="Укажите причину потери сейва..."
                            className="text-[10px] text-red-300 bg-red-950/10 border-red-900/20 min-h-[50px] italic text-center font-serif"
                          />
                        )}
                     </>
                   ) : (
                     // Graveyard Logic
                     <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-center gap-2 py-2 rounded-sm border w-full text-xs font-bold font-serif uppercase tracking-widest bg-slate-900/50 border-slate-700 text-slate-400">
                           <Skull size={14} />
                           {/* [DIALECT] */}
                           {t('meta_death_cause', "Причина Смерти")}
                        </div>
                        <StyledTextarea
                           isEditMode={isEditMode}
                           value={character.meta.save_status_reason || ""}
                           onChange={e => updateMeta('save_status_reason', e.target.value)}
                           placeholder="Укажите причину смерти..."
                           className="text-[10px] text-slate-400 bg-slate-950/50 border-slate-800 min-h-[60px] italic text-center font-serif"
                        />
                     </div>
                   )}
                 </div>
              </div>

              {/* Stats & Info Column */}
              <div className="col-span-2 space-y-4">
                 
                 {/* Name & Faction */}
                 <div className="bg-[#050b14] p-4 border border-violet-900/20 relative rune-clip-r">
                     <div className="flex flex-col gap-2">
                        <StyledInput 
                           /* [DIALECT] */
                           label={t('lbl_name', "Имя персонажа")}
                           isEditMode={isEditMode} 
                           value={character.profile.name} 
                           onChange={e => updateProfile('name', e.target.value)} 
                           className={`text-2xl font-black font-gothic uppercase tracking-tight ${factionColor.split(' ')[0]} drop-shadow-md bg-transparent border-b border-white/5 pb-1`} 
                        />
                        <div className="flex flex-wrap items-end gap-4">
                           <div className="flex-1 min-w-[140px]">
                              <StyledSelect 
                                /* [DIALECT] */
                                label={t('lbl_faction', "Фракция")}
                                isEditMode={isEditMode} 
                                value={character.profile.faction} 
                                onChange={e => updateProfile('faction', e.target.value)}
                                // [DIALECT] Translate Options
                                options={Object.values(Faction).map(f => ({ label: getFactionLabel(f), value: f }))} 
                                className="text-sm font-medium text-slate-400 font-serif tracking-wide"
                              />
                           </div>

                           {character.profile.faction === Faction.NPC && (
                              <div className="flex-1 min-w-[140px]">
                                 <StyledSelect 
                                   // [DIALECT]
                                   label={t('lbl_npc_vol', "Том NPC")}
                                   isEditMode={isEditMode} 
                                   value={character.profile.npc_volume || NPC_VOLUMES[0]} 
                                   onChange={e => updateProfile('npc_volume', e.target.value)}
                                   // [DIALECT] Translate Options
                                   options={NPC_VOLUMES.map(v => ({ label: getVolumeLabel(v), value: v }))} 
                                   className="text-sm font-medium text-red-400 font-serif tracking-wide"
                                 />
                              </div>
                           )}

                           {/* Master Selector Logic: Show if isCompanion OR if it's a Unit (has master) */}
                           {isEditMode && (isCompanion || isUnit || character.meta.master_id) && (
                              <div className="flex-1 min-w-[140px]">
                                 <span className="text-[9px] uppercase font-bold text-slate-600 tracking-widest font-serif block mb-1">Привязка (Хозяин)</span>
                                 <div className="flex gap-2">
                                    <select 
                                      className="bg-[#0b0d10] border border-violet-900/30 text-slate-300 text-xs rounded-sm px-2 py-1.5 focus:border-violet-500 w-full outline-none font-serif"
                                      value={character.meta.master_id || ""}
                                      onChange={e => updateMeta('master_id', e.target.value || undefined)}
                                    >
                                        <option value="">-- Нет / Свободен --</option>
                                        {characters
                                          .filter(c => c.id !== character.id && c.profile.faction !== Faction.NPC) 
                                          .map(c => (
                                          <option key={c.id} value={c.id}>{c.profile.name}</option>
                                        ))}
                                    </select>
                                    
                                    {/* Unlink / Banish Button */}
                                    {character.meta.master_id && (
                                       <button 
                                          onClick={() => {
                                             if (isCompanion) {
                                                updateMeta('master_id', undefined);
                                             } else if (onDelete) {
                                                // It's a unit, confirm deletion
                                                onDelete(character.id);
                                             }
                                          }}
                                          title={isCompanion ? "Разорвать связь" : "Изгнать (Удалить Юнита)"}
                                          className="bg-red-900/20 border border-red-500/30 text-red-400 hover:text-white hover:bg-red-900/50 p-1.5 rounded-sm transition-all"
                                       >
                                          {isCompanion ? <Link2Off size={14}/> : <Trash2 size={14}/>}
                                       </button>
                                    )}
                                 </div>
                              </div>
                           )}

                           <div className="flex items-center gap-2 pb-1">
                             <span className="text-[10px] uppercase font-bold text-slate-600 font-serif tracking-widest">
                                {/* [DIALECT] */}
                                {t('lbl_level', 'Уровень')}
                             </span>
                             {isEditMode ? (
                               <select 
                                 className="bg-[#0b0d10] border border-violet-900/30 text-xs rounded-sm p-1 text-slate-300 focus:outline-none focus:border-violet-600 font-mono" 
                                 value={character.profile.level} 
                                 onChange={e => updateProfile('level', parseInt(e.target.value))}
                               >
                                 {[1,2,3,4,5].map(l => (
                                     <option key={l} value={l} disabled={l === 5 && character.profile.faction !== Faction.NPC}>
                                         {l}
                                     </option>
                                 ))}
                               </select>
                             ) : (
                               <span className="text-violet-400 font-bold font-mono text-lg drop-shadow-glow">{character.profile.level}</span>
                             )}
                           </div>
                        </div>
                     </div>
                 </div>

                 <div className="flex gap-4 h-48 relative">
                    {/* Compact Chart - ABSOLUTE positioning + flex-1 min-h-0 to prevent flex width calculation issues */}
                    {/* Added background here for readability against image */}
                    <div className="flex-1 relative min-w-0 h-full bg-slate-950/70 backdrop-blur-sm rounded-xl border border-violet-900/20 overflow-hidden">
                       <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                           <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                                <PolarGrid stroke="#334155" strokeOpacity={0.5} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: '900', fontFamily: 'Cinzel' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 25]} tick={false} axisLine={false} />
                                <Radar
                                  name="Stats"
                                  dataKey="A"
                                  stroke="#8b5cf6"
                                  strokeWidth={2}
                                  fill="#8b5cf6"
                                  fillOpacity={0.3}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                       </div>
                    </div>

                    {/* Numeric Blocks */}
                    <div className="flex flex-col justify-between w-28 gap-1">
                        {[StatType.PHYS, StatType.MAGIC, StatType.UNIQUE].map(stat => (
                          <div key={stat} className={`relative px-2 py-1 rounded-sm border flex items-center justify-between gap-2 transition-all ${StatBg[stat]}`}>
                             <div className={`${StatColors[stat].split(' ')[0]}`}>{StatIcons[stat]}</div>
                             {isEditMode ? (
                               <input 
                                 type="number" 
                                 value={character.stats[stat]} 
                                 onChange={(e) => updateStats(stat, parseInt(e.target.value))}
                                 className="bg-transparent text-lg font-mono font-bold text-right w-full focus:outline-none text-slate-200"
                               />
                             ) : (
                               <span className="text-lg font-mono font-bold text-slate-200 drop-shadow-sm">{character.stats[stat]}</span>
                             )}
                          </div>
                        ))}
                    </div>
                 </div>
              </div>
           </div>
           
           {/* Bio (Lore Mode Only or Edit) */}
           {(displayMode === 'lore' || isEditMode) && (
             <div className="bg-[#050b14] border border-violet-900/20 p-4 relative shadow-inner">
               <StyledTextarea 
                 /* [DIALECT] */
                 label={t('lbl_bio', "Биография")}
                 isEditMode={isEditMode} 
                 value={character.profile.bio} 
                 onChange={e => updateProfile('bio', e.target.value)} 
                 className="min-h-[80px] text-slate-400 italic font-serif" 
               />
             </div>
           )}
        </div>

        {/* Resources */}
        <div className="space-y-3">
          {character.resources.map((res, idx) => (
            <div key={idx} className="bg-[#050b14] border border-slate-800 p-3 relative overflow-hidden group flex gap-2 items-center rune-clip-r">
               <div className="flex-1">
                 <div className="flex justify-between items-center mb-1 relative z-10">
                   {isEditMode ? (
                     <input className="bg-transparent font-bold text-xs text-slate-300 w-1/2 uppercase tracking-wide font-serif" value={res.label} onChange={e => updateResources(idx, 'label', e.target.value)} />
                   ) : (
                     <span className="font-bold text-xs text-slate-400 uppercase tracking-wide font-serif">
                        {/* [DIALECT] Simple manual mapping for standard resources if they match default names */}
                        {res.label === "HP" ? t('res_hp', "HP") : res.label === "MP" ? t('res_mp', "MP") : res.label === "Усталость" ? t('res_fatigue', "Усталость") : res.label}
                     </span>
                   )}
                   <div className="flex items-center gap-1 font-mono text-sm">
                      {isEditMode ? (
                         <>
                           <input type="number" className="bg-slate-900 w-10 text-center rounded-sm border border-slate-700 text-xs text-slate-200" value={res.current} onChange={e => updateResources(idx, 'current', parseInt(e.target.value))} />
                           <span className="text-slate-600">/</span>
                           <input type="number" className="bg-slate-900 w-10 text-center rounded-sm border border-slate-700 text-xs text-slate-200" value={res.max} onChange={e => updateResources(idx, 'max', parseInt(e.target.value))} />
                         </>
                      ) : (
                         <span className="text-violet-400 font-bold">
                           {res.current}
                           {res.max > 0 && <span className="text-slate-600 text-xs ml-0.5">/{res.max}</span>}
                         </span>
                      )}
                   </div>
                 </div>
                 
                 {!isEditMode && res.max > 0 && (
                   <div className="w-full bg-[#020408] h-1.5 rounded-full overflow-hidden mt-2 relative z-10 border border-slate-800">
                     <div 
                        className="h-full bg-violet-600 transition-all duration-500 shadow-[0_0_5px_#7c3aed]" 
                        style={{ width: `${Math.min(100, (res.current / res.max) * 100)}%` }}
                     ></div>
                   </div>
                 )}
               </div>
               
               {isEditMode && (
                  <button onClick={() => removeResource(idx)} className="text-slate-600 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={14} />
                  </button>
               )}
            </div>
          ))}
          
          {isEditMode && (
            <Button size="sm" variant="secondary" onClick={addResource} className="w-full border-dashed border-slate-700 text-slate-500 hover:text-white font-serif uppercase tracking-wider">
              {/* [DIALECT] */}
              <Plus size={14} /> {t('btn_add_res', 'Добавить')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SheetHeader;
