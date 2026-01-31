
import { CharacterTemplate, JsonAbility, JsonItem, JsonPassiveItem, JsonInjury } from '../types';
import { TRAUMA_DEFINITIONS } from '../constants';
import { supabase } from '../../../lib/supabase';

export { supabase };

const generateId = () => Math.random().toString(36).substr(2, 9);

const getTags = (obj: any): string[] => {
    if (!obj) return [];
    let collected: string[] = [];
    if (Array.isArray(obj.tags)) collected = [...obj.tags];
    else if (typeof obj.tags === 'string') collected.push(obj.tags);
    if (typeof obj.tag === 'string') collected.push(obj.tag);
    return collected.map(t => t.toLowerCase().trim()).filter(Boolean);
};

export const calculateTraumaPenalty = (injuries: JsonInjury[] = []) => {
  let totals = { phys: 0, mag: 0, uniq: 0, total: 0 };
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
      } else { penalty = count * def.value; }
      totals.total += penalty;
      if (templateId.includes('phys')) totals.phys += penalty;
      else if (templateId.includes('mag')) totals.mag += penalty;
      else if (templateId.includes('uniq')) totals.uniq += penalty;
  }
  return totals;
};

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
    if (t.includes('START') || t.includes('НАЧАЛО')) return 'COMBAT_START';
    if (t.includes('HIT') || t.includes('ПОПАДАН') || t.includes('УДАР')) return 'ON_HIT';
    if (t.includes('KILL') || t.includes('УБИЙСТВ')) return 'ON_KILL';
    if (t.includes('DEFENSE') || t.includes('ЗАЩИТ')) return 'ON_DEFENSE';
    if (t.includes('ABILITY') || t.includes('СПОСОБН')) return 'ABILITY';
    if (t.includes('ALWAYS') || t.includes('ВСЕГДА') || t.includes('ПАССИВ')) return 'ALWAYS';
    return t;
}

export async function getCharacters() {
  const [charRes, basicRes] = await Promise.all([
      supabase.from('characters').select('*'),
      supabase.from('basic_actions').select('*')
  ]);
  if (charRes.error) return { data: [], error: charRes.error };
  const globalBasicActions: JsonAbility[] = (basicRes.data || []).map(a => ({
      ...a, _id: `global_${a.id || generateId()}`, tags: getTags(a)
  }));
  const formattedData = charRes.data.map((row: any) => {
    let charData = row.data || row;
    if (row.data && typeof row.data === 'object') charData = { ...row.data, id: row.id };
    const result: any = {
        id: charData.id || generateId(),
        meta: charData.meta || { uid: 'system', avatar_url: '' },
        profile: charData.profile || charData.identity || { name: 'Unknown', level: 1, faction: 'None', npc_volume: '' },
        stats: charData.stats || { phys: 0, magic: 0, unique: 0 },
        resources: charData.resources || [],
        equipment: { usable: [], wearable: [], inventory: [] },
        ability_groups: [], passives: [],
        medcard: charData.medcard || charData.med_card || { injuries: [], conditions: [] },
        flat_abilities: [], flat_passives: []
    };
    const tabs = charData.tabs || {};
    let rawWearable = tabs.equipment?.wearable || charData.equipment?.wearable;
    result.equipment.wearable = normalizeItems(rawWearable).map((i: any) => ({...i, _id: generateId(), tags: getTags(i)}));
    let rawUsable = tabs.equipment?.weapons || tabs.equipment?.usable || charData.equipment?.weapons || charData.equipment?.usable;
    result.equipment.usable = normalizeItems(rawUsable).map((i: any) => ({...i, _id: generateId(), tags: getTags(i)}));
    let rawInventory = tabs.equipment?.backpack || tabs.equipment?.inventory || charData.equipment?.backpack || charData.equipment?.inventory;
    result.equipment.inventory = normalizeItems(rawInventory).map((i: any) => ({...i, _id: generateId(), tags: getTags(i)}));

    // Inject Basic Actions for combat - Forced visibility for sequence building
    const basicGroup = { name: "Базовые Действия", tags: [], abilities: globalBasicActions, is_hidden: false };
    result.ability_groups.push(basicGroup);
    globalBasicActions.forEach(a => result.flat_abilities.push(a));

    let rawAbilityGroups = (tabs.abilities && Array.isArray(tabs.abilities.schools)) ? tabs.abilities.schools : (Array.isArray(charData.ability_groups) ? charData.ability_groups : []);
    rawAbilityGroups.forEach((group: any) => {
        if (group.name === "Базовые Действия") return;
        const groupTags = getTags(group);
        const abilities = normalizeAbilities(group.abilities).map((ab: any) => {
            const abTags = [...new Set([...groupTags, ...getTags(ab)])];
            const hydrated = { ...ab, _id: generateId(), tags: abTags };
            if (!abTags.includes('no_war')) result.flat_abilities.push(hydrated);
            return hydrated;
        });
        result.ability_groups.push({ ...group, abilities });
    });
    
    // Passives/Debuffs logic remains same
    const processPassives = (raw: any[], isFlaw: boolean) => {
        raw.forEach((group: any) => {
            const groupTags = getTags(group);
            const rawItems = group.items || group.abilities || [];
            const items = normalizeItems(rawItems).map((p: any) => {
                const pTags = [...new Set([...groupTags, ...getTags(p)])];
                const hydrated = { ...p, _id: generateId(), tags: pTags, trigger: normalizeTrigger(p.trigger), is_flaw: isFlaw, dur: p.dur || 0, dur_unit: p.dur_unit || 'turn' };
                result.flat_passives.push(hydrated);
                return hydrated;
            });
            result.passives.push({ group_name: group.group_name || group.name || (isFlaw ? "Debuffs" : "Passives"), is_flaw_group: isFlaw, items });
        });
    };
    processPassives((tabs.passives?.groups || charData.passives || []), false);
    processPassives((tabs.debuffs?.groups || charData.debuffs || []), true);

    const trauma = calculateTraumaPenalty(result.medcard.injuries);
    result.battle_stats = { hp_penalty_current: trauma.total, trauma_phys: trauma.phys, trauma_mag: trauma.mag, trauma_uniq: trauma.uniq, actions_max: 4, actions_left: 4 };
    return result;
  });
  return { data: formattedData as CharacterTemplate[], error: null };
}

export async function getBattles() { const { data, error } = await supabase.from('battles').select('*'); return { data, error }; }
export async function createBattle(name: string) { const { data, error } = await supabase.from('battles').insert([{ name, participants_snapshot: [], sequence_log: [], casualties: [], round: 1, status: 'startup' }]).select().single(); return { data, error }; }
export async function updateBattle(battleId: string, updates: any) { const { data, error } = await supabase.from('battles').update(updates).eq('id', battleId); return { data, error }; }
export async function deleteBattle(battleId: string) { const { error } = await supabase.from('battles').delete().eq('id', battleId); return { error }; }
export async function updateCharacter(charId: string, updates: any) { const { data: currentRows, error: fetchError } = await supabase.from('characters').select('data').eq('id', charId).single(); if (fetchError || !currentRows) return { error: fetchError }; const mergedData = { ...(currentRows.data || {}), ...updates }; const { error } = await supabase.from('characters').update({ data: mergedData }).eq('id', charId); return { error }; }
