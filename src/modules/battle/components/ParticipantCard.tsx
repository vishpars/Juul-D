
import React from 'react';
import { BattleParticipant } from '../types';

interface Props {
  participant: BattleParticipant;
  onSelectActor: (id: string) => void;
  onSelectTarget: (id: string) => void;
  isActor: boolean;
  isTarget: boolean;
}

const ParticipantCard: React.FC<Props> = ({ 
  participant, 
  onSelectActor, 
  onSelectTarget,
  isActor,
  isTarget
}) => {
  const { battle_stats, active_effects, cooldowns, profile, meta } = participant;
  
  // Trauma Bar Calculation
  // Assume -100 is max trauma (full bar)
  const traumaPercent = Math.min(100, Math.abs(battle_stats.hp_penalty_current));
  
  const borderColor = isActor ? 'border-yellow-400 ring-2 ring-yellow-400' : 
                      isTarget ? 'border-red-500 ring-2 ring-red-500' : 'border-console-700';

  return (
    <div className="bg-console-800 rounded-md p-3 border border-console-700 text-sm text-slate-200 shadow-lg mb-3 relative overflow-hidden transition-all duration-200">
      <div className={`absolute inset-0 border pointer-events-none ${borderColor}`}></div>
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-2 z-10 relative">
        <div className="w-10 h-10 rounded bg-console-900 border border-console-600 flex items-center justify-center overflow-hidden shrink-0">
            {meta.avatar_url ? (
                <img src={meta.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
                <span className="text-xs font-bold text-slate-500">{profile.name.substring(0,2)}</span>
            )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold truncate">{profile.name}</h4>
          <div className="flex items-center gap-2 text-xs text-slate-400">
             <span>ОД: {battle_stats.actions_left}/{battle_stats.actions_max}</span>
             <span className={battle_stats.hp_penalty_current < 0 ? 'text-red-400' : 'text-slate-500'}>
                Травма: {battle_stats.hp_penalty_current}
             </span>
          </div>
        </div>
      </div>

      {/* Trauma Bar Background */}
      <div className="absolute bottom-0 left-0 h-1 bg-console-700 w-full">
         <div 
            className="h-full bg-red-600 transition-all duration-500" 
            style={{ width: `${traumaPercent}%` }} 
         />
      </div>

      {/* Buffs & Debuffs */}
      <div className="flex flex-wrap gap-1 mb-2 z-10 relative">
        {active_effects.map(eff => (
          <span key={eff.id} className="px-1.5 py-0.5 rounded text-[10px] bg-green-900 text-green-300 border border-green-700">
            {eff.name}: {eff.duration_left}{['turn', 'round', 'ход', 'раунд'].includes(eff.unit) ? 'х' : 'д'}
          </span>
        ))}
        {active_effects.length === 0 && <span className="text-[10px] text-slate-600 italic">Нет эффектов</span>}
      </div>

      {/* Cooldowns (Simplified) */}
      <div className="flex flex-wrap gap-1 mb-3 z-10 relative">
        {cooldowns.slice(0, 3).map(cd => (
          <span key={cd.id} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-400 border border-slate-600">
            {cd.name}: {cd.val}
          </span>
        ))}
        {cooldowns.length > 3 && <span className="text-[9px] text-slate-500">+{cooldowns.length - 3} еще</span>}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 z-10 relative">
        <button 
            onClick={() => onSelectActor(participant.instance_id)}
            className="bg-console-700 hover:bg-yellow-600/20 hover:text-yellow-400 hover:border-yellow-500/50 border border-console-600 text-xs py-1 rounded transition-colors"
        >
            Выбрать
        </button>
        <button 
            onClick={() => onSelectTarget(participant.instance_id)}
            className="bg-console-700 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/50 border border-console-600 text-xs py-1 rounded transition-colors"
        >
            В цель
        </button>
      </div>
    </div>
  );
};

export default ParticipantCard;
