
import React, { useState, useMemo, useEffect } from 'react';
import { Bonus, StatType, TimeUnit } from '../types';
import { 
  Trash2, Plus, Sword, Wand2, Crown, Shield, Heart, Coins, 
  User, Ghost, Skull, Book, Link as LinkIcon, Edit3, Eye, Save, Clock, Hourglass, Target
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
/* [DIALECT] */ import { useDialect } from '../dialect_module/DialectContext';

// --- Reusable Icons Map ---
export const StatIcons: Record<string, React.ReactNode> = {
  [StatType.PHYS]: <Sword size={16} />,
  [StatType.MAGIC]: <Wand2 size={16} />,
  [StatType.UNIQUE]: <Crown size={16} />,
  [StatType.CLEAN]: <Target size={16} />
};

export const Icons = {
  Plus,
  Trash: Trash2
};

// Updated Palette according to request: Phys(Red), Mag(Blue), Unique(Purple)
export const StatColors: Record<string, string> = {
  [StatType.PHYS]: "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]",
  [StatType.MAGIC]: "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]",
  [StatType.UNIQUE]: "text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]",
  [StatType.CLEAN]: "text-slate-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
};

export const StatBg: Record<string, string> = {
  [StatType.PHYS]: "bg-red-950/30 border-red-900/40",
  [StatType.MAGIC]: "bg-blue-950/30 border-blue-900/40",
  [StatType.UNIQUE]: "bg-purple-950/30 border-purple-900/40",
  [StatType.CLEAN]: "bg-slate-800 border-slate-600"
};

// Helper to safely get color class (prevents crash on .split)
const getStatColorClass = (stat: string) => {
  const colorStr = StatColors[stat] || "text-slate-400"; // Fallback color
  return colorStr.split(' ')[0] || "text-slate-400";
};

const getStatBgClass = (stat: string) => {
  return StatBg[stat] || "bg-slate-900 border-slate-700";
};

// --- Components ---

export const Card = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  // Rune-like card: Dark bg, slight border, sharp corners or rune-clip
  <div className={`bg-[#050b14] border border-violet-900/20 shadow-lg p-4 relative overflow-hidden group ${className}`} {...props}>
    {/* Subtle gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 to-transparent pointer-events-none" />
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

export const SectionHeader = ({ title, children }: { title: string, children?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-4 border-b border-violet-900/30 pb-2">
    <h3 className="text-lg font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 uppercase tracking-widest drop-shadow-sm flex items-center gap-2">
      {title}
    </h3>
    <div className="flex gap-2">{children}</div>
  </div>
);

export const Button = ({ 
  children, variant = 'primary', size = 'md', className = "", type = "button", ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'secondary' | 'ghost', size?: 'sm' | 'md' | 'icon' }) => {
  const base = "font-serif font-bold transition-all flex items-center justify-center gap-2 focus:outline-none relative overflow-hidden group rune-clip";
  const sizes = { sm: "px-3 py-1 text-xs", md: "px-6 py-2 text-sm", icon: "p-2" };
  
  const variants = {
    primary: "bg-violet-900/80 border border-violet-500/50 text-violet-100 hover:bg-violet-800 hover:shadow-glow hover:border-violet-400",
    danger: "bg-red-950/50 border border-red-800 text-red-200 hover:bg-red-900 hover:shadow-glow-red",
    secondary: "bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-500",
    ghost: "bg-transparent text-slate-500 hover:text-violet-300 hover:bg-violet-900/20"
  };
  
  return (
    <button type={type} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
};

// --- Advanced Inputs (Optimized for Performance) ---

// Optimized Input: Updates parent state ONLY onBlur to prevent re-rendering entire tree on every keystroke
export const StyledInput = ({ label, isEditMode, className = "", value, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, isEditMode: boolean }) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync local state if parent value changes externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (onChange && localValue !== value) {
      onChange(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  if (!isEditMode) return (
    <div className="flex flex-col gap-1 w-full">
      {label && <span className="text-[9px] uppercase font-serif font-bold text-slate-600 tracking-widest">{label}</span>}
      <div className={`text-slate-200 border-b border-violet-900/20 py-1 min-h-[1.5rem] ${className}`}>{value}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <span className="text-[9px] uppercase font-serif font-bold text-slate-500 tracking-widest">{label}</span>}
      <input 
        className={`bg-[#020408] border border-violet-900/40 text-slate-200 text-sm px-3 py-1.5 focus:border-violet-500 focus:shadow-glow focus:outline-none transition-all placeholder:text-slate-700 rune-clip-r ${className}`} 
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props} 
      />
    </div>
  );
};

// Optimized Textarea: Same logic as Input
export const StyledTextarea = ({ label, isEditMode, className = "", value, onChange, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string, isEditMode: boolean }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (onChange && localValue !== value) {
      onChange(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  if (!isEditMode) return (
    <div className="flex flex-col gap-1 w-full">
      {label && <span className="text-[9px] uppercase font-serif font-bold text-slate-600 tracking-widest">{label}</span>}
      <div className={`text-slate-300 whitespace-pre-wrap text-sm ${className}`}>{value || "—"}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <span className="text-[9px] uppercase font-serif font-bold text-slate-500 tracking-widest">{label}</span>}
      <textarea 
        className={`bg-[#020408] border border-violet-900/40 text-slate-200 text-sm px-3 py-2 focus:border-violet-500 focus:shadow-glow focus:outline-none transition-all min-h-[80px] rune-clip-r ${className}`} 
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props} 
      />
    </div>
  );
};

export const StyledSelect = ({ 
  label, 
  isEditMode, 
  options, 
  className = "", 
  ...props 
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, isEditMode: boolean, options: { label: string, value: string | number }[] }) => {
  if (!isEditMode) return (
    <div className="flex flex-col gap-1 w-full">
      {label && <span className="text-[9px] uppercase font-serif font-bold text-slate-600 tracking-widest">{label}</span>}
      <div className={`text-slate-200 border-b border-violet-900/20 py-1 min-h-[1.5rem] ${className}`}>
        {options.find(o => String(o.value) === String(props.value))?.label || props.value}
      </div>
    </div>
  );
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <span className="text-[9px] uppercase font-serif font-bold text-slate-500 tracking-widest">{label}</span>}
      <select className={`bg-[#020408] border border-violet-900/40 text-slate-200 text-sm px-2 py-1.5 focus:border-violet-500 focus:shadow-glow focus:outline-none rune-clip-r ${className}`} {...props}>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
};

export const TimeInput = ({ 
  label, val, unit, onChangeVal, onChangeUnit, isEditMode, icon: Icon, options = []
}: { label: string, val: number, unit: string, onChangeVal: (v: number) => void, onChangeUnit: (u: string) => void, isEditMode: boolean, icon: any, options?: TimeUnit[] }) => {
  
  /* [DIALECT] */ const { t } = useDialect();
  
  if (!isEditMode && (!val && !unit)) return null;

  const displayLabel = options.find(o => o.tag === unit)?.label || unit;
  const translatedLabel = label === 'КД' ? t('lbl_cd', 'КД') : 
                          label === 'Длит.' ? t('lbl_dur', 'Длит.') : 
                          label === 'Лимит' ? t('lbl_limit', 'Лимит') : label;

  return (
    <div className="flex items-center gap-2 text-xs bg-[#0f172a] rounded-sm border border-violet-900/30 px-2 py-1 shadow-sm">
      <Icon size={12} className="text-violet-500" />
      {isEditMode ? (
        <>
          <span className="text-slate-500 text-[10px] font-serif uppercase mr-1">{translatedLabel}:</span>
          <input type="number" value={val || ""} onChange={e => onChangeVal(parseFloat(e.target.value) || 0)} className="w-8 bg-transparent border-b border-slate-700 text-center text-slate-200 focus:border-violet-500 outline-none" placeholder="0" />
          <select value={unit} onChange={e => onChangeUnit(e.target.value)} className="bg-transparent text-slate-400 border-none p-0 focus:ring-0 max-w-[80px] text-[10px]">
            <option value="">Ед.</option>
            {options.map(u => <option key={u.tag} value={u.tag}>{u.label}</option>)}
          </select>
        </>
      ) : (
        <span className="text-slate-400 font-medium">
          {translatedLabel}: <span className="text-violet-200">{val} {displayLabel}</span>
        </span>
      )}
    </div>
  );
};

// --- Complex Components ---

export const TagInput = ({ tags, onChange, isEditMode }: { tags: string[], onChange: (t: string[]) => void, isEditMode: boolean }) => {
  /* [DIALECT] */ const { t } = useDialect();
  if (!isEditMode) return null;

  const [input, setInput] = useState("");
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      // Ensure lower case for better matching
      const newTag = input.trim().toLowerCase();
      if (!tags.includes(newTag)) {
          onChange([...tags, newTag]);
      }
      setInput("");
    }
  };
  const removeTag = (idx: number) => onChange(tags.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((t, i) => (
        <span key={i} className="bg-violet-950/50 text-violet-300 border border-violet-800/50 px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold flex items-center gap-1">
          {t}
          {isEditMode && <button onClick={() => removeTag(i)}><Trash2 size={10} /></button>}
        </span>
      ))}
      {isEditMode && (
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('ph_tag_add', "+Тег")}
          className="bg-transparent border-b border-slate-700 text-xs py-0.5 w-16 focus:w-24 transition-all focus:border-violet-500 outline-none text-slate-400 placeholder:text-slate-700"
        />
      )}
    </div>
  );
};

export const CommonTagToggles = ({ tags = [], onChange }: { tags: string[], onChange: (t: string[]) => void }) => {
  /* [DIALECT] */ const { t } = useDialect();
  
  const toggle = (tag: string) => {
    if (tags.includes(tag)) {
      onChange(tags.filter(curr => curr !== tag));
    } else {
      onChange([...tags, tag]);
    }
  };

  const checkboxes = [
    { key: 'buff', label: t('tag_buff', 'Бафф?') },
    { key: 'form', label: t('tag_form', 'Форма?') },
    { key: 'no_war', label: t('tag_no_war', 'Небоевое?') },
  ];

  return (
    <div className="flex gap-4 items-center mt-2 border-t border-violet-900/20 pt-2">
      {checkboxes.map(cb => (
        <label key={cb.key} className="flex items-center gap-1.5 cursor-pointer text-xs group select-none">
          <input 
            type="checkbox" 
            checked={tags.includes(cb.key)} 
            onChange={() => toggle(cb.key)}
            className="w-3.5 h-3.5 rounded-sm border-slate-600 bg-slate-900 text-violet-600 focus:ring-offset-0 focus:ring-0 cursor-pointer"
          />
          <span className={`font-bold font-serif transition-colors ${tags.includes(cb.key) ? 'text-violet-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
            {cb.label}
          </span>
        </label>
      ))}
    </div>
  );
};

export const BonusInput = ({ bonuses, onChange, isEditMode }: { bonuses: Bonus[], onChange: (b: Bonus[]) => void, isEditMode: boolean }) => {
  const addBonus = () => onChange([...bonuses, { stat: StatType.PHYS, val: 1 }]);
  /* [DIALECT] */ const { t } = useDialect();

  const updateBonus = (idx: number, field: keyof Bonus, val: any) => {
    const next = [...bonuses];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };
  const removeBonus = (idx: number) => onChange(bonuses.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {bonuses.map((b, i) => (
          <div key={i} className={`flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs border ${getStatBgClass(b.stat)} ${getStatColorClass(b.stat)}`}>
            {isEditMode ? (
              <>
                 <select 
                   value={b.stat} 
                   onChange={(e) => updateBonus(i, 'stat', e.target.value)}
                   className="bg-transparent border-none p-0 text-[10px] font-bold focus:ring-0 cursor-pointer text-slate-300 uppercase"
                 >
                   <option value={StatType.PHYS}>{t('stat_phys_short', 'ФИЗ')}</option>
                   <option value={StatType.MAGIC}>{t('stat_mag_short', 'МАГ')}</option>
                   <option value={StatType.UNIQUE}>{t('stat_uni_short', 'УНИК')}</option>
                   <option value={StatType.CLEAN}>{t('stat_clean_short', 'ЧИСТ')}</option>
                 </select>
                 <span className="text-slate-500">:</span>
                 <input 
                   type="number" 
                   value={b.val} 
                   onChange={(e) => updateBonus(i, 'val', parseInt(e.target.value))}
                   className="w-8 bg-transparent border-b border-slate-600 text-center font-mono text-slate-200"
                 />
                 <button onClick={() => removeBonus(i)} className="text-red-400 hover:text-red-300 ml-1"><Trash2 size={10} /></button>
              </>
            ) : (
              <span className="flex items-center gap-1 font-mono font-bold">
                {StatIcons[b.stat] || <Sword size={12}/>} {b.val > 0 ? '+' : ''}{b.val}
              </span>
            )}
          </div>
        ))}
        {isEditMode && (
          <button onClick={addBonus} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded px-2 py-0.5 flex items-center gap-1">
            <Plus size={10} /> {t('lbl_bonus', 'Бонус')}
          </button>
        )}
      </div>
    </div>
  );
};

// --- Visualization Charts ---

interface ChartProps {
  structureData: { subject: string, value: number }[];
  bonusData: { subject: string, value: number }[];
  isDebuff?: boolean;
  color?: string;
  t: (key: string, def: string) => string;
}

const TabRadarChartsImpl = React.memo(({ structureData, bonusData, isDebuff = false, color, t }: ChartProps) => {
  if (structureData.length === 0 || structureData.every(d => d.value === 0)) {
      return (
        <div className="flex flex-col items-center justify-center h-32 border border-violet-900/20 border-dashed rounded-lg bg-violet-900/5 mb-6 text-slate-600 gap-2">
            <Ghost size={24} className="opacity-30" />
            <span className="text-[10px] uppercase font-bold tracking-widest">{t('msg_chart_empty', 'Пусто')}</span>
        </div>
      );
  }

  const maxStructureVal = Math.max(...structureData.map(d => d.value), 3);
  const maxBonusVal = Math.max(...bonusData.map(d => d.value), 5);
  
  const defaultColor = isDebuff ? "#ef4444" : "#8b5cf6"; // Red or Violet
  const mainColor = color || defaultColor;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 h-48">
       
       <div className="bg-[#050b14] border border-violet-900/20 shadow-md p-2 relative flex flex-col rune-clip-r h-full">
          <div className="absolute top-2 left-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest z-10 font-serif">
             {t('viz_structure', 'Структура')}
          </div>
          {/* Robust container for Recharts */}
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={structureData}>
                    <PolarGrid stroke="#334155" strokeOpacity={0.4} />
                    <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'Cinzel' }} 
                    />
                    <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, maxStructureVal]} 
                    tick={false} 
                    axisLine={false} 
                    />
                    <Radar
                    name="Count"
                    dataKey="value"
                    stroke={mainColor}
                    strokeWidth={2}
                    fill={mainColor}
                    fillOpacity={0.2}
                    isAnimationActive={false}
                    />
                </RadarChart>
                </ResponsiveContainer>
            </div>
          </div>
       </div>

       <div className="bg-[#050b14] border border-violet-900/20 shadow-md p-2 relative flex flex-col rune-clip-r h-full">
          <div className="absolute top-2 left-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest z-10 font-serif">
             {isDebuff ? t('viz_penalties', "Штрафы") : t('viz_bonuses', "Бонусы")}
          </div>
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={bonusData}>
                    <PolarGrid stroke="#334155" strokeOpacity={0.4} />
                    <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: mainColor, fontSize: 10, fontWeight: 'bold', fontFamily: 'Cinzel' }} 
                    />
                    <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, maxBonusVal]} 
                    tick={false} 
                    axisLine={false} 
                    />
                    <Radar
                    name="Sum"
                    dataKey="value"
                    stroke={mainColor}
                    strokeWidth={2}
                    fill={mainColor}
                    fillOpacity={0.2}
                    isAnimationActive={false}
                    />
                </RadarChart>
                </ResponsiveContainer>
            </div>
          </div>
       </div>
    </div>
  );
}, (prev, next) => {
    return (
        prev.color === next.color &&
        prev.isDebuff === next.isDebuff &&
        JSON.stringify(prev.structureData) === JSON.stringify(next.structureData) &&
        JSON.stringify(prev.bonusData) === JSON.stringify(next.bonusData)
    );
});

export const TabRadarCharts = (props: ChartProps) => <TabRadarChartsImpl {...props} />;
