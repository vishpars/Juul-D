
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Sun, Moon, Ghost, ChevronLeft, ChevronRight, Calendar, Edit3, Lock, Save, PenTool, Eye } from 'lucide-react';
import { CharacterData, Faction, TrainingRecord } from '../types';
import { getTrainingData, saveTrainingData } from '../utils/supabaseService';
import { Modal } from '../../lore/components/Modal';
import { useUI } from '../context/UIContext';
import { useDialect } from '../dialect_module/DialectContext';

interface TrainingPageProps {
    characters: CharacterData[];
    onBack: () => void;
}

const DEFAULT_LIMITS_STR = "3/4/2/2/2";

// Background Image (Same as Roster for consistency)
const BG_IMAGE = "https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/character-roster-bg.jpg";

export const TrainingPage: React.FC<TrainingPageProps> = ({ characters, onBack }) => {
    const { isAdmin } = useAuth();
    const { showAlert } = useUI();
    const { t } = useDialect();
    
    const [day, setDay] = useState<number>(1);
    const [activeFaction, setActiveFaction] = useState<Faction>(Faction.LIGHT);
    const [trainingData, setTrainingData] = useState<Record<string, TrainingRecord>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Edit Mode State (Global Toggle)
    const [isEditMode, setIsEditMode] = useState(false);

    // Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCharId, setEditingCharId] = useState<string | null>(null);
    const [editLimits, setEditLimits] = useState<string>(DEFAULT_LIMITS_STR);
    const [editCurrentValues, setEditCurrentValues] = useState<number[]>([0, 0, 0, 0, 0]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const data = await getTrainingData();
        const map: Record<string, TrainingRecord> = {};
        data.forEach(r => map[r.char_id] = r);
        setTrainingData(map);
        setIsLoading(false);
    };

    const filteredChars = useMemo(() => {
        return characters.filter(c => {
            if (activeFaction === Faction.NPC) {
                return c.profile.faction === Faction.NPC && c.profile.npc_volume === "Спутники и Рабы";
            }
            return c.profile.faction === activeFaction;
        });
    }, [characters, activeFaction]);

    const getCharTraining = (charId: string) => {
        return trainingData[charId] || { char_id: charId, limits: DEFAULT_LIMITS_STR, current: {} };
    };

    const handleRowClick = (charId: string) => {
        if (!isEditMode || !isAdmin) return;

        const record = getCharTraining(charId);
        const currentForDay = record.current[String(day)] || [0, 0, 0, 0, 0];
        
        setEditingCharId(charId);
        setEditLimits(record.limits);
        setEditCurrentValues([...currentForDay]); // Copy to avoid mutation
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingCharId) return;
        
        try {
            await saveTrainingData(editingCharId, editLimits, String(day), editCurrentValues);
            setIsEditModalOpen(false);
            showAlert(t('train_save_ok', "Данные тренировок обновлены"), "Успех");
            loadData(); // Refresh
        } catch (e: any) {
            showAlert("Ошибка сохранения: " + e.message, "Ошибка");
        }
    };

    const getStatus = (current: number[], limits: number[]) => {
        let isFull = true;
        for(let i=0; i<5; i++) {
            const lim = limits[i] || 0;
            const cur = current[i] || 0;
            if (lim > 0 && cur < lim) {
                isFull = false;
                break;
            }
        }
        return isFull ? t('train_status_done', "Хватит") : t('train_status_open', "Ещё можно");
    };

    const getFactionColor = (f: Faction) => {
        switch(f) {
            case Faction.LIGHT: return 'text-amber-400 border-amber-500/30 bg-amber-900/10';
            case Faction.DARK: return 'text-violet-400 border-violet-500/30 bg-violet-900/10';
            case Faction.NPC: return 'text-red-400 border-red-500/30 bg-red-900/10';
            default: return 'text-slate-400';
        }
    };

    const COLUMNS = [
        t('train_col_1', "Боевые"),
        t('train_col_2', "Небоевые"),
        t('train_col_3', "Книжки"),
        t('train_col_4', "Наставник-НПС"),
        t('train_col_5', "Наставник-пришелец")
    ];

    return (
        <div className="h-full flex flex-col bg-[#050b14] overflow-hidden relative">
            {/* Background Image */}
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-40 z-0 pointer-events-none mix-blend-screen"
                style={{ 
                    backgroundImage: `url(${BG_IMAGE})`,
                    filter: 'contrast(1.2) brightness(0.6)' 
                }} 
            ></div>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-slate-950 pointer-events-none z-0"></div>

            {/* Header */}
            <div className="p-4 border-b border-violet-900/30 bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10 relative shadow-lg">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft />
                    </button>
                    <div>
                        <h2 className="text-xl font-fantasy font-bold text-white tracking-widest uppercase flex items-center gap-2">
                            <Calendar className="text-violet-500" /> {t('train_title', "Журнал Тренировок")}
                        </h2>
                        <div className="text-[10px] text-slate-500 font-mono flex gap-2">
                            <span>{t('train_access', "Общий Доступ")}</span>
                            {isAdmin && <span className="text-emerald-500">• Admin Access</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Day Switcher */}
                    <div className="flex items-center gap-3 bg-black/40 rounded p-1 border border-white/10 px-3 backdrop-blur-sm">
                        <button 
                            onClick={() => setDay(d => Math.max(1, d - 1))}
                            disabled={day <= 1}
                            className="p-1 hover:text-white text-slate-400 disabled:opacity-30"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-mono font-bold text-lg text-violet-300 w-20 text-center drop-shadow-glow uppercase">{t('train_day', "ДЕНЬ")} {day}</span>
                        <button 
                            onClick={() => setDay(d => d + 1)}
                            className="p-1 hover:text-white text-slate-400"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Admin Edit Toggle */}
                    {isAdmin && (
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded font-bold uppercase text-xs tracking-wider transition-all border font-serif ${
                                isEditMode 
                                ? 'bg-indigo-600/80 border-indigo-400 text-white shadow-glow' 
                                : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            {isEditMode ? <PenTool size={14} /> : <Eye size={14} />}
                            {isEditMode ? t('train_mode_edit', "Режим Правки") : t('train_mode_view', "Только Чтение")}
                        </button>
                    )}
                </div>
            </div>

            {/* Faction Tabs */}
            <div className="flex border-b border-white/5 bg-slate-900/40 relative z-10 backdrop-blur-sm">
                {[Faction.LIGHT, Faction.DARK, Faction.NPC].map(f => (
                    <button
                        key={f}
                        onClick={() => setActiveFaction(f)}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all font-serif ${activeFaction === f ? getFactionColor(f) + ' border-b-2' : 'text-slate-500 hover:bg-white/5'}`}
                    >
                        {f === Faction.LIGHT && <Sun size={14} />}
                        {f === Faction.DARK && <Moon size={14} />}
                        {f === Faction.NPC && <Ghost size={14} />}
                        {f === Faction.NPC ? t('vol_servants', "Спутники") : t(f === Faction.LIGHT ? 'fac_light' : 'fac_dark', f)}
                    </button>
                ))}
            </div>

            {/* Table Header - Aligned to grid-cols-12 */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-white/5 bg-black/40 text-center relative z-10 font-serif">
                <div className="col-span-3 text-left pl-2">{t('lbl_name', "Имя")}</div>
                <div className="col-span-1 text-violet-300">{COLUMNS[0]}</div>
                <div className="col-span-1 text-slate-400">{COLUMNS[1]}</div>
                <div className="col-span-1 text-emerald-400">{COLUMNS[2]}</div>
                <div className="col-span-2 text-amber-400">{COLUMNS[3]}</div>
                <div className="col-span-2 text-rose-400">{COLUMNS[4]}</div>
                <div className="col-span-2">Статус</div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                {isLoading && <div className="text-center py-10 text-slate-500 font-fantasy animate-pulse">Загрузка летописи...</div>}
                
                {!isLoading && filteredChars.map(char => {
                    const record = getCharTraining(char.id);
                    const limits = record.limits.split('/').map(Number);
                    const current = record.current[String(day)] || [0, 0, 0, 0, 0];
                    const status = getStatus(current, limits);
                    const isDone = status === t('train_status_done', "Хватит");

                    return (
                        <div 
                            key={char.id} 
                            onClick={() => handleRowClick(char.id)}
                            className={`
                                grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 items-center transition-all text-center text-xs group
                                ${isEditMode && isAdmin 
                                    ? 'cursor-pointer hover:bg-indigo-900/20 hover:border-indigo-500/30' 
                                    : 'hover:bg-white/5'}
                            `}
                        >
                            <div className="col-span-3 text-left flex items-center gap-3 pl-2">
                                <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                                    {char.meta.avatar_url ? (
                                        <img src={char.meta.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[10px] text-slate-600 font-bold">{char.profile.name.substring(0,2)}</span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <span className={`block truncate font-bold font-rune ${isDone ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-200'}`}>
                                        {char.profile.name}
                                    </span>
                                    {isEditMode && isAdmin && <span className="text-[9px] text-indigo-400 uppercase tracking-wider block font-serif">{t('act_edit', "Править")}</span>}
                                </div>
                            </div>
                            
                            {/* Columns 0-4 */}
                            {[0,1,2,3,4].map(idx => (
                                <div key={idx} className={`col-span-${idx > 2 ? '2' : '1'} font-mono text-slate-400`}>
                                    <span className={current[idx] >= (limits[idx] || 0) ? 'text-green-400 font-bold' : ''}>{current[idx]}</span>
                                    <span className="opacity-40">/{limits[idx] || 0}</span>
                                </div>
                            ))}

                            <div className={`col-span-2 uppercase font-bold tracking-wider text-[10px] font-serif ${isDone ? 'text-red-500' : 'text-emerald-500'}`}>
                                {status}
                            </div>
                        </div>
                    )
                })}
                
                {filteredChars.length === 0 && !isLoading && (
                    <div className="text-center py-20 text-slate-600 font-serif italic border-2 border-dashed border-slate-800 m-8 rounded-xl">
                        {t('msg_empty', "Никого нет в этом зале...")}
                    </div>
                )}
            </div>

            {/* Edit Modal (Admin Only) */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('train_title', "Учет Активности")} size="md">
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="text-xl font-bold text-violet-200 font-rune uppercase tracking-wide mb-1">
                            {filteredChars.find(c => c.id === editingCharId)?.profile.name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                            {t('train_day', "День")} {day}
                        </div>
                    </div>

                    <div className="space-y-2 bg-slate-900/50 p-4 rounded border border-slate-800">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block font-serif">Лимиты (Формат: Б/С/К/Н1/Н2)</label>
                        <input 
                            className="w-full bg-[#020408] border border-violet-900/40 p-2 rounded text-white font-mono text-sm focus:border-violet-500 outline-none text-center tracking-widest"
                            value={editLimits}
                            onChange={(e) => setEditLimits(e.target.value)}
                            placeholder="3/4/2/2/2"
                        />
                    </div>

                    <div className="space-y-3">
                        {COLUMNS.map((label, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-black/20 p-2 rounded border border-white/5">
                                <span className="text-sm text-slate-300 font-medium font-serif">{label}</span>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => {
                                            const next = [...editCurrentValues];
                                            next[idx] = Math.max(0, next[idx] - 1);
                                            setEditCurrentValues(next);
                                        }}
                                        className="w-8 h-8 bg-slate-800 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
                                    ><ChevronLeft size={16}/></button>
                                    
                                    <span className="w-8 text-center font-mono font-bold text-xl text-white">{editCurrentValues[idx]}</span>
                                    
                                    <button 
                                        onClick={() => {
                                            const next = [...editCurrentValues];
                                            next[idx] = next[idx] + 1;
                                            setEditCurrentValues(next);
                                        }}
                                        className="w-8 h-8 bg-slate-800 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
                                    ><ChevronRight size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/10">
                        <button 
                            onClick={handleSaveEdit}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white px-6 py-3 rounded font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg hover:shadow-emerald-500/20 transition-all w-full justify-center font-rune"
                        >
                            <Save size={18} /> {t('act_save', "Сохранить")}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
