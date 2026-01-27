
import { BattleParticipant, ActiveEffect, Cooldown } from '../types';

// Units that count as "1 Combat Round"
export const ROUND_UNITS = ['turn', 'round', 'post', 'ходы', 'посты', 'раунд'];
// Units that count as "Action Cost"
export const ACTION_UNITS = ['action', 'действие', 'act'];

export const advanceRound = (participants: BattleParticipant[]): BattleParticipant[] => {
  return participants.map(p => {
    // 1. Reset Actions (Removed - no AP tracking)
    // const newActions = p.battle_stats.actions_max; 
    
    // NEW: Handle Limit Reset and Delayed Cooldowns
    const updatedCooldowns = [...p.cooldowns];
    const updatedUsageCounts = { ...p.usage_counts };

    p.flat_abilities.forEach(ability => {
        if (!ability.limit || ability.limit <= 0) return;
        
        const limitUnit = ability.limit_unit?.toLowerCase() || '';
        const isRoundBased = ROUND_UNITS.includes(limitUnit);
        
        // Count for this ability
        const count = updatedUsageCounts[ability._id] || 0;

        if (isRoundBased) {
            // Logic: "If used 1 time (less than limit) -> move to CD after end of turn"
            // If count >= limit, it should have been put on CD immediately during action commit.
            // If 0 < count < limit, we put it on CD now.
            if (count > 0 && count < ability.limit) {
                // Check if already on CD to avoid dupes
                const isOnCd = updatedCooldowns.some(cd => cd.name === ability.name);
                if (!isOnCd && ability.cd > 0) {
                     updatedCooldowns.push({
                        id: `cd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        name: ability.name,
                        val: ability.cd,
                        max: ability.cd,
                        unit: ability.cd_unit || 'turn'
                     });
                }
            }
            // Reset count for next round
            updatedUsageCounts[ability._id] = 0;
        }
        // 'battle' based limits do NOT reset.
    });


    // 2. Tick Cooldowns (Only Round-based units)
    // Non-combat units (hour, day) do not tick here, they effectively freeze during battle unless manual intervention
    // We map over updatedCooldowns which might have new entries from step 1
    const newCooldowns = updatedCooldowns
      .map(cd => {
          if (ROUND_UNITS.includes(cd.unit?.toLowerCase())) {
              return { ...cd, val: cd.val - 1 };
          }
          return cd;
      })
      .filter(cd => cd.val > 0);

    // 3. Tick Effects
    const nextEffects: ActiveEffect[] = [];
    const effectsToExpire: ActiveEffect[] = [];

    p.active_effects.forEach(eff => {
      const u = eff.unit?.toLowerCase();
      // Effects tick if they are round-based
      if (ROUND_UNITS.includes(u) || u === 'round(s)') {
        if (eff.duration_left > 1) {
          nextEffects.push({ ...eff, duration_left: eff.duration_left - 1 });
        } else {
          effectsToExpire.push(eff);
        }
      } else {
        // Keep non-round effects (e.g. action based) as is
        nextEffects.push(eff);
      }
    });

    // 4. Handle Expiration -> Cooldown Logic
    effectsToExpire.forEach(eff => {
       if (eff.original_ability_id) {
         const sourceAbility = p.flat_abilities.find(a => a._id === eff.original_ability_id);
         
         if (sourceAbility && sourceAbility.cd > 0) {
             if (!newCooldowns.some(cd => cd.name === sourceAbility.name)) {
                 newCooldowns.push({
                    id: `cd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: sourceAbility.name,
                    val: sourceAbility.cd,
                    max: sourceAbility.cd,
                    unit: sourceAbility.cd_unit || 'turn'
                 });
             }
         }
       }
    });

    return {
      ...p,
      battle_stats: {
        ...p.battle_stats,
        // actions_left: newActions // Removed
      },
      active_effects: nextEffects,
      cooldowns: newCooldowns,
      usage_counts: updatedUsageCounts
    };
  });
};

export const tickActionTimers = (p: BattleParticipant, cost: number): BattleParticipant => {
    // 1. Tick Cooldowns
    const newCooldowns = p.cooldowns.map(cd => {
        if (ACTION_UNITS.includes(cd.unit?.toLowerCase())) {
            return { ...cd, val: Math.max(0, cd.val - cost) };
        }
        return cd;
    }).filter(cd => cd.val > 0);

    // 2. Tick Effects
    const nextEffects: ActiveEffect[] = [];
    const effectsToExpire: ActiveEffect[] = [];

    p.active_effects.forEach(eff => {
        const u = eff.unit?.toLowerCase();
        if (ACTION_UNITS.includes(u)) {
            const newVal = eff.duration_left - cost;
            if (newVal > 0) {
                nextEffects.push({ ...eff, duration_left: newVal });
            } else {
                effectsToExpire.push(eff);
            }
        } else {
            nextEffects.push(eff);
        }
    });

    // 3. Handle Expiration -> Cooldown Logic (same as advanceRound)
    effectsToExpire.forEach(eff => {
       if (eff.original_ability_id) {
         const sourceAbility = p.flat_abilities.find(a => a._id === eff.original_ability_id);
         
         if (sourceAbility && sourceAbility.cd > 0) {
             // Only add if not already present
             if (!newCooldowns.some(cd => cd.name === sourceAbility.name)) {
                 newCooldowns.push({
                    id: `cd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: sourceAbility.name,
                    val: sourceAbility.cd,
                    max: sourceAbility.cd,
                    unit: sourceAbility.cd_unit || 'turn'
                 });
             }
         }
       }
    });

    return {
        ...p,
        cooldowns: newCooldowns,
        active_effects: nextEffects
    };
};

export const commitActionCost = (
  participants: BattleParticipant[], 
  actorId: string, 
  cost: number
): BattleParticipant[] => {
  return participants.map(p => {
      if (p.instance_id === actorId) {
          return tickActionTimers(p, cost);
      }
      return p;
  });
};
