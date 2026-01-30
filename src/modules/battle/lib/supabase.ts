
import { CharacterTemplate, JsonAbility, JsonItem, JsonPassiveItem, JsonInjury } from '../types';
import { TRAUMA_DEFINITIONS } from '../constants';
import { supabase } from '../../../lib/supabase';

export { supabase };

// Helper to generate IDs for items inside JSON that might lack them
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper: robustly extract tags from an object whether it uses 'tags' (array) or 'tag' (string)
const getTags = (obj: any): string[] => {
    if (!obj) return [];
    let collected: string[] = [];
    
    if (Array.isArray(obj.tags)) {
        collected = [...obj.tags];
    } else if (typeof obj.tags === 'string') {
        collected.push(obj.tags);
    }

    if (typeof obj.tag === 'string') {
        collected.push(obj.tag);
    }
    
    // Clean and lowercase
    return collected.map(t => t.toLowerCase().trim()).filter(Boolean);
};

// Helper: Calculate total trauma penalty based on definitions
export const calculateTraumaPenalty = (injuries: JsonInjury[] = []) => {
  let totals = {
      phys: 0,
      mag: 0,
      uniq: 0,
      total: 0
  };

  const injuryCounts: Record<string, number> = {};
  
  injuries.forEach(injury => {
      const current = injuryCounts[injury.template_id] || 0;
      injuryCounts[injury.template_id] = current + (injury.count || 1);
  });

  for (const [templateId, count] of Object.entries(injuryCounts)) {
      const def = TRAUMA_DEFINITIONS[templateId];
      if (!def) continue;

      let penalty = 0;
      if (def.stack && def.stack > 0) {
          const stacks = Math.floor(count / def.stack);
          penalty = stacks * def.value;
      } else {
          penalty = count * def.value;
      }

      totals.total += penalty;
      if (templateId.includes('phys')) totals.phys += penalty;
      else if (templateId.includes('mag')) totals.mag += penalty;
      else if (templateId.includes('uniq')) totals.uniq += penalty;
  }

  return totals;
};

// Normalization Helpers
const normalizeBonuses = (items: any[]) => {
  if (!Array.isArray(items)) return [];
  return items.map(item => ({
    ...item,
    bonuses: (item.bonuses || []).map((b: any) => ({
      stat: (b.stat || 'phys').toLowerCase().trim(),
      val: b.val !== undefined ? b.val : (b.value !== undefined ? b.value : 0)
    }))
  }));
};

const normalizeItems = (items: any[]) => {
    if (!Array.isArray(items)) return [];
    const normalized = normalizeBonuses(items);
    return normalized.map((item: any) => ({
        ...item,
        desc_lore: item.desc_lore !== undefined ? item.desc_lore : (item.desc?.lore || ''),
        desc_mech: item.desc_mech !== undefined ? item.desc_mech : (item.desc?.mech || '')
    }));
};

const normalizeAbilities = (abilities: any[]) => {
  if (!Array.isArray(abilities)) return [];
  const normalizedItems = normalizeItems(abilities);
  return normalizedItems.map((ab: any) => ({
    ...ab,
    limit: ab.limit !== undefined ? ab.limit : (ab.limits?.value || 0),
    limit_unit: ab.limit_unit !== undefined ? ab.limit_unit : (ab.limits?.unit || ''),
    cd: ab.cd !== undefined ? ab.cd : (ab.cooldown?.value || 0),
    cd_unit: ab.cd_unit !== undefined ? ab.cd_unit : (ab.cooldown?.unit || ''),
    dur: ab.dur !== undefined ? ab.dur : (ab.duration?.value || 0),
    dur_unit: ab.dur_unit !== undefined ? ab.dur_unit : (ab.duration?.unit || '')
  }));
};

const normalizeTrigger = (trigger: string): string => {
    if (!trigger) return 'ALWAYS';
    const t = trigger.toUpperCase().trim();
    
    // Combat Start
    if (t.includes('START') || t.includes('НАЧАЛО')) return 'COMBAT_START';
    
    // On Hit / Attack
    if (t.includes('HIT') || t.includes('ПОПАДАН') || t.includes('УДАР')) return 'ON_HIT';
    
    // On Kill
    if (t.includes('KILL') || t.includes('УБИЙСТВ')) return 'ON_KILL';
    
    // On Defense
    if (t.includes('DEFENSE') || t.includes('ЗАЩИТ')) return 'ON_DEFENSE';
    
    // From Ability
    if (t.includes('ABILITY') || t.includes('СПОСОБН')) return 'ABILITY';
    
    // Always / Passive
    if (t.includes('ALWAYS') || t.includes('ВСЕГДА') || t.includes('ПАССИВ')) return 'ALWAYS';
    
    return t; // Fallback to original if no match
}

export async function getCharacters() {
  console.log('Fetching characters...');
  const { data, error } = await supabase.from('characters').select('*');
  
  if (error) {
    console.error('Supabase: Error fetching characters:', error);
    return { data: [], error };
  }

  if (!data) return { data: [], error: null };

  const formattedData = data.map((row: any) => {
    let charData = row.data || row;
    if (row.data && typeof row.data === 'object') {
       charData = { ...row.data, id: row.id };
    }

    // --- 1. INITIALIZE STRUCTURE ---
    const result: any = {
        id: charData.id || generateId(),
        meta: charData.meta || { uid: 'system', avatar_url: '' },
        profile: charData.profile || charData.identity || { name: 'Unknown', level: 1, faction: 'None', npc_volume: '' },
        stats: charData.stats || { phys: 0, magic: 0, unique: 0 },
        resources: charData.resources || [],
        equipment: { usable: [], wearable: [], inventory: [] },
        ability_groups: [],
        passives: [], // Stores groups
        medcard: charData.medcard || charData.med_card || { injuries: [], conditions: [] },
        
        // Internal flattening arrays
        flat_abilities: [],
        flat_passives: []
    };

    // --- 2. EXTRACT EQUIPMENT (Priority: Tabs -> Legacy) ---
    const tabs = charData.tabs || {};
    
    // Wearable
    let rawWearable = tabs.equipment?.wearable || charData.equipment?.wearable;
    result.equipment.wearable = normalizeItems(rawWearable).map((i: any) => ({...i, _id: generateId(), tags: getTags(i)}));

    // Usable (Weapons)
    let rawUsable = tabs.equipment?.weapons || tabs.equipment?.usable || charData.equipment?.weapons || charData.equipment?.usable;
    result.equipment.usable = normalizeItems(rawUsable).map((i: any) => ({...i, _id: generateId(), tags: getTags(i)}));

    // Inventory (Backpack)
    let rawInventory = tabs.equipment?.backpack || tabs.equipment?.inventory || charData.equipment?.backpack || charData.equipment?.inventory;
    result.equipment.inventory = normalizeItems(rawInventory).map((i: any) => ({...i, _id: generateId(), tags: getTags(i)}));


    // --- 3. EXTRACT ABILITIES (Priority: Tabs -> Legacy) ---
    let rawAbilityGroups = [];
    if (tabs.abilities && Array.isArray(tabs.abilities.schools)) {
        rawAbilityGroups = tabs.abilities.schools;
    } else if (Array.isArray(charData.ability_groups)) {
        rawAbilityGroups = charData.ability_groups;
    }

    if (rawAbilityGroups.length > 0) {
        result.ability_groups = rawAbilityGroups.map((group: any) => {
            const groupTags = getTags(group);
            const abilities = normalizeAbilities(group.abilities).map((ab: any) => {
                const abTags = [...new Set([...groupTags, ...getTags(ab)])];
                const hydrated = { ...ab, _id: generateId(), tags: abTags };
                
                // Populate Flat List
                if (!abTags.includes('no_war')) {
                    result.flat_abilities.push(hydrated);
                }
                
                return hydrated;
            });
            return { ...group, abilities };
        });
    }


    // --- 4. EXTRACT PASSIVES & DEBUFFS (Priority: Tabs -> Legacy) ---
    
    // A. Beneficial Passives
    let rawPassiveGroups = [];
    if (tabs.passives && Array.isArray(tabs.passives.groups)) {
        rawPassiveGroups = tabs.passives.groups;
    } else if (Array.isArray(charData.passives)) {
        rawPassiveGroups = charData.passives;
    }

    if (rawPassiveGroups.length > 0) {
        rawPassiveGroups.forEach((group: any) => {
            const groupTags = getTags(group);
            const rawItems = group.items || group.abilities || [];
            
            const items = normalizeItems(rawItems).map((p: any) => {
                const pTags = [...new Set([...groupTags, ...getTags(p)])];
                const hydrated = {
                    ...p,
                    _id: generateId(),
                    tags: pTags,
                    trigger: normalizeTrigger(p.trigger),
                    is_flaw: false,
                    dur: p.dur || 0,
                    dur_unit: p.dur_unit || 'turn'
                };
                
                // Populate Flat List
                result.flat_passives.push(hydrated);
                return hydrated;
            });

            result.passives.push({
                group_name: group.group_name || group.name || "Passives",
                is_flaw_group: false,
                items
            });
        });
    }

    // B. Harmful Debuffs
    let rawDebuffGroups = [];
    if (tabs.debuffs && Array.isArray(tabs.debuffs.groups)) {
        rawDebuffGroups = tabs.debuffs.groups;
    } else if (Array.isArray(charData.debuffs)) {
        rawDebuffGroups = charData.debuffs;
    }

    if (rawDebuffGroups.length > 0) {
        rawDebuffGroups.forEach((group: any) => {
            const groupTags = getTags(group);
            const rawItems = group.items || group.abilities || [];

            const items = normalizeItems(rawItems).map((p: any) => {
                const pTags = [...new Set([...groupTags, ...getTags(p)])];
                const hydrated = {
                    ...p,
                    _id: generateId(),
                    tags: pTags,
                    trigger: normalizeTrigger(p.trigger),
                    is_flaw: true,
                    dur: p.dur || 0,
                    dur_unit: p.dur_unit || 'turn'
                };
                
                // Populate Flat List
                result.flat_passives.push(hydrated);
                return hydrated;
            });

            result.passives.push({
                group_name: group.group_name || group.name || "Debuffs",
                is_flaw_group: true,
                items
            });
        });
    }

    // --- 5. BATTLE STATS ---
    const trauma = calculateTraumaPenalty(result.medcard.injuries);
    result.battle_stats = {
        hp_penalty_current: trauma.total,
        trauma_phys: trauma.phys,
        trauma_mag: trauma.mag,
        trauma_uniq: trauma.uniq,
        actions_max: 4, 
        actions_left: 4
    };

    return result;
  });

  return { data: formattedData as CharacterTemplate[], error: null };
}

export async function getBattles() {
  const { data, error } = await supabase.from('battles').select('*');
  if (error) console.error('Supabase: Error fetching battles:', error);
  return { data, error };
}

export async function createBattle(name: string) {
  const { data, error } = await supabase
    .from('battles')
    .insert([{ 
      name, 
      participants_snapshot: [], 
      sequence_log: [], 
      casualties: [],
      round: 1,
      status: 'startup'
    }])
    .select()
    .single();

  if (error) console.error('Supabase: Error creating battle:', error);
  return { data, error };
}

export async function updateBattle(battleId: string, updates: any) {
  const { data, error } = await supabase
    .from('battles')
    .update(updates)
    .eq('id', battleId);

  if (error) console.error('Supabase: Error updating battle:', error);
  return { data, error };
}

export async function deleteBattle(battleId: string) {
    const { error } = await supabase
        .from('battles')
        .delete()
        .eq('id', battleId);
    
    if (error) console.error('Supabase: Error deleting battle:', error);
    return { error };
}

export async function updateCharacter(charId: string, updates: any) {
    const { data: currentRows, error: fetchError } = await supabase
        .from('characters')
        .select('data')
        .eq('id', charId)
        .single();
    
    if (fetchError || !currentRows) {
        console.error('Supabase: Error fetching character for update:', fetchError);
        return { error: fetchError };
    }

    const currentData = currentRows.data || {};
    const mergedData = { ...currentData, ...updates };

    const { error } = await supabase
        .from('characters')
        .update({ data: mergedData })
        .eq('id', charId);

    if (error) console.error('Supabase: Error updating character:', error);
    return { error };
}
