
import { supabase } from '../lib/supabase';
import { CharacterData, InjuryDefinition, TimeUnit, Ability, TrainingRecord } from '../types';
import { DEFAULT_INJURIES, DEFAULT_TIME_UNITS } from '../constants';
import { CacheService } from '../../../utils/cache';

// Helper to normalize bonuses from {stat, value} to {stat, val}
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

// Helper to normalize cooldowns/durations and descriptions
const normalizeAbilities = (abilities: any[]) => {
  if (!Array.isArray(abilities)) return [];
  const normalizedItems = normalizeBonuses(abilities);
  return normalizedItems.map((ab: any) => ({
    ...ab,
    // Map 'limits' object to flat limit/limit_unit if present in new JSON
    limit: ab.limit !== undefined ? ab.limit : (ab.limits?.value || 0),
    limit_unit: ab.limit_unit !== undefined ? ab.limit_unit : (ab.limits?.unit || ''),
    // Map cooldown object
    cd: ab.cd !== undefined ? ab.cd : (ab.cooldown?.value || 0),
    cd_unit: ab.cd_unit !== undefined ? ab.cd_unit : (ab.cooldown?.unit || ''),
    // Map duration object
    dur: ab.dur !== undefined ? ab.dur : (ab.duration?.value || 0),
    dur_unit: ab.dur_unit !== undefined ? ab.dur_unit : (ab.duration?.unit || ''),
    // Map description object to flat desc_lore/desc_mech with robust fallbacks
    desc_lore: ab.desc_lore !== undefined ? ab.desc_lore : (ab.desc?.lore || ''),
    desc_mech: ab.desc_mech !== undefined ? ab.desc_mech : (ab.desc?.mech || '')
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
}

export const getBasicActions = async (): Promise<Ability[]> => {
    try {
        // Cache Check
        const cached = CacheService.get<Ability[]>('basic_actions');
        if (cached) return cached;

        const { data } = await supabase.from('basic_actions').select('*');
        if (!data || data.length === 0) return [];
        
        // Map DB rows to Ability objects
        const mapped = data.map((row: any) => ({
            name: row.name || "Action",
            bonuses: row.bonuses || [],
            tags: row.tags || [],
            desc_lore: row.desc_lore || "",
            desc_mech: row.desc_mech || "",
            cd: row.cd || 0,
            cd_unit: row.cd_unit || "",
            dur: row.dur || 0,
            dur_unit: row.dur_unit || "",
            limit: row.limit || 0,
            limit_unit: row.limit_unit || ""
        }));

        CacheService.set('basic_actions', mapped);
        return mapped;
    } catch (e) {
        console.warn("Failed to fetch basic actions", e);
        return [];
    }
};

export const saveBasicActions = async (actions: Ability[]) => {
    // Clear cache to force reload next time
    CacheService.remove('basic_actions');
    
    // Clear existing table and insert new
    const { error: delError } = await supabase.from('basic_actions').delete().neq('id', 0); 
    if (delError) console.warn("Error clearing basic actions", delError);

    if (actions.length > 0) {
        const { error } = await supabase.from('basic_actions').insert(actions);
        if (error) throw new Error(error.message);
    }
};

export const getAllCharacters = async (): Promise<CharacterData[]> => {
  try {
    // 1. Check Cache First
    const cachedChars = CacheService.get<CharacterData[]>('roster_characters');
    if (cachedChars) {
        console.log('Loaded characters from cache');
        return cachedChars;
    }

    console.log('Fetching characters from DB...');
    
    // Fetch Basic Actions concurrently
    const [charRes, basicActions] = await Promise.all([
        supabase.from('characters').select('*'),
        getBasicActions()
    ]);

    const { data, error } = charRes;

    if (error) {
      console.error("Supabase fetch error (characters):", error);
      return [];
    }

    if (!data) return [];

    const validChars: CharacterData[] = [];

    data.forEach((row: any) => {
      let charData = row.data || row;
      if (!charData.id) charData.id = row.id;

      if (!charData.profile) {
          return; 
      }
      
      // --- HYDRATION & DEFAULTS ---

      // 1. Profile & Meta
      if (!charData.profile.currencies) charData.profile.currencies = { juhe: 0, jumi: 0 };
      if (!charData.meta) charData.meta = { uid: 'system', owner_link: '', avatar_url: '', save_status: true };
      if (!charData.stats) charData.stats = { phys: 0, magic: 0, unique: 0 };

      // Initialize standardized arrays if missing
      if (!charData.passives) charData.passives = [];

      // 2. Extract from "tabs" structure if present (New JSON format)
      if (charData.tabs) {
          const tabs = charData.tabs;

          // Equipment Mapping
          if (tabs.equipment) {
              charData.equipment = {
                  wearable: normalizeItems(tabs.equipment.wearable),
                  usable: normalizeItems(tabs.equipment.weapons), // Map 'weapons' -> 'usable'
                  inventory: normalizeItems(tabs.equipment.backpack) // Map 'backpack' -> 'inventory'
              };
          }

          // Abilities Mapping
          if (tabs.abilities && Array.isArray(tabs.abilities.schools)) {
              charData.ability_groups = tabs.abilities.schools.map((school: any) => ({
                  ...school,
                  abilities: normalizeAbilities(school.abilities)
              }));
          }

          // Passives & Debuffs Mapping - Clear current passives to rebuild from tabs
          charData.passives = [];
          
          if (tabs.passives && Array.isArray(tabs.passives.groups)) {
              // Map standard passives
              const pGroups = tabs.passives.groups.map((g: any) => ({
                  ...g,
                  group_name: g.group_name || g.name || "Passives", // Ensure name
                  tags: g.tags || [],
                  items: normalizeItems(g.abilities || g.items), // Handle if named 'abilities' in JSON
                  is_flaw_group: false
              }));
              charData.passives.push(...pGroups);
          }
          
          if (tabs.debuffs && Array.isArray(tabs.debuffs.groups)) {
              // Map debuffs
              const dGroups = tabs.debuffs.groups.map((g: any) => ({
                  ...g,
                  group_name: g.group_name || g.name || "Debuffs", // Ensure name
                  tags: g.tags || [],
                  items: normalizeItems(g.abilities || g.items),
                  is_flaw_group: true
              }));
              charData.passives.push(...dGroups);
          }

          // Medcard
          if (tabs.medcard) {
              charData.medcard = tabs.medcard;
          }
      } 
      // 2b. Handle case where JSON has root-level 'passives' and 'debuffs' arrays (no 'tabs')
      else {
          // If we have a 'debuffs' array at root, merge it into passives
          if (charData.debuffs && Array.isArray(charData.debuffs)) {
              const rootDebuffs = charData.debuffs.map((g: any) => ({
                  ...g,
                  group_name: g.group_name || g.name || "Debuffs",
                  tags: g.tags || [],
                  items: normalizeItems(g.abilities || g.items),
                  is_flaw_group: true
              }));
              charData.passives.push(...rootDebuffs);
          }
          
          // Ensure existing passives have group_name
          if (Array.isArray(charData.passives)) {
              charData.passives = charData.passives.map((g: any) => ({
                  ...g,
                  group_name: g.group_name || g.name || "Group",
                  items: normalizeItems(g.items || g.abilities || [])
              }));
          }
      }

      // 3. Final Fallbacks for empty arrays
      if (!charData.equipment) charData.equipment = { usable: [], wearable: [], inventory: [] };
      if (!Array.isArray(charData.equipment.wearable)) charData.equipment.wearable = [];
      if (!Array.isArray(charData.equipment.usable)) charData.equipment.usable = [];
      if (!Array.isArray(charData.equipment.inventory)) charData.equipment.inventory = [];

      if (!Array.isArray(charData.ability_groups)) charData.ability_groups = [];
      if (!Array.isArray(charData.passives)) charData.passives = [];
      if (!Array.isArray(charData.resources)) charData.resources = [];
      
      if (!charData.medcard) charData.medcard = { injuries: [], conditions: [] };
      if (!Array.isArray(charData.medcard.injuries)) charData.medcard.injuries = [];
      if (!Array.isArray(charData.medcard.conditions)) charData.medcard.conditions = [];

      // --- INJECT BASIC ACTIONS ---
      // Check if "Базовые Действия" group already exists. If not, inject it.
      if (basicActions.length > 0) {
          const hasBasicGroup = charData.ability_groups.some((g: any) => g.name === "Базовые Действия");
          if (!hasBasicGroup) {
              charData.ability_groups.unshift({
                  name: "Базовые Действия",
                  tags: [],
                  abilities: basicActions,
                  is_hidden: true // Hidden by default as requested
              });
          }
      }

      validChars.push(charData as CharacterData);
    });

    // Save to Cache
    CacheService.set('roster_characters', validChars);

    return validChars;
  } catch (error) {
    console.warn("Could not fetch characters.", error);
    return [];
  }
};

export const saveCharacter = async (char: CharacterData) => {
  if (!char.id) {
    throw new Error("Critical Error: Character ID missing before save attempt.");
  }

  // Update Cache Immediately
  const cached = CacheService.get<CharacterData[]>('roster_characters') || [];
  const index = cached.findIndex(c => c.id === char.id);
  if (index !== -1) {
      cached[index] = char;
  } else {
      cached.push(char);
  }
  CacheService.set('roster_characters', cached);

  // DB Save
  const payload = { ...char };
  // @ts-ignore
  delete payload.identity; 
  // @ts-ignore
  delete payload.med_card;
  // @ts-ignore
  delete payload.tabs; // We save the flattened version to avoid confusion or double data
  // @ts-ignore
  delete payload.debuffs; // We save debuffs merged into passives

  const { data, error } = await supabase
    .from('characters')
    .upsert({ 
      id: char.id, 
      data: payload 
    })
    .select();

  if (error) {
    console.error("Supabase Save Error:", error);
    throw new Error(`Database Error: ${error.message}`);
  }

  return true;
};

export const deleteCharacter = async (id: string) => {
  // Update Cache Immediately
  const cached = CacheService.get<CharacterData[]>('roster_characters') || [];
  const updated = cached.filter(c => c.id !== id);
  CacheService.set('roster_characters', updated);

  const { error } = await supabase.from('characters').delete().eq('id', id);
  if (error) throw new Error(error.message);

  const { error: cascadeError } = await supabase
    .from('characters')
    .delete()
    .eq('data->meta->>master_id', id);

  if (cascadeError) console.error("Failed to cascade delete minions", cascadeError);
};

export const uploadAvatar = async (file: File): Promise<string> => {
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) throw new Error("Файл слишком большой. Максимум 10 МБ.");

  const fileExt = file.name.split('.').pop();
  const fileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage.from('Juul-D-Tracker').upload(filePath, file);
  if (uploadError) throw new Error("Ошибка при загрузке изображения.");

  const { data } = supabase.storage.from('Juul-D-Tracker').getPublicUrl(filePath);
  return data.publicUrl;
};

export const getGlobalTriggers = async (): Promise<Record<string, string>> => {
  try {
    const cached = CacheService.get<Record<string, string>>('global_triggers');
    if (cached) return cached;

    const { data } = await supabase.from('triggers').select('tag, label');
    if (!data || data.length === 0) return { "Always": "Пассивно / Всегда" };
    const map: Record<string, string> = {};
    data.forEach((row: any) => { map[row.tag] = row.label; });
    
    CacheService.set('global_triggers', map);
    return map;
  } catch (error) {
    return { "Always": "Пассивно / Всегда" };
  }
};

export const saveGlobalTriggers = async (triggers: Record<string, string>) => {
  CacheService.set('global_triggers', triggers);
  const rows = Object.entries(triggers).map(([tag, label]) => ({ tag, label }));
  if (rows.length > 0) await supabase.from('triggers').upsert(rows);
};

export const getInjuries = async (): Promise<InjuryDefinition[]> => {
  try {
    const cached = CacheService.get<InjuryDefinition[]>('injuries');
    if (cached) return cached;

    const { data } = await supabase.from('injuries').select('*').order('type').order('value');
    if (!data || data.length === 0) return DEFAULT_INJURIES;
    
    CacheService.set('injuries', data);
    return data as InjuryDefinition[];
  } catch (error) {
    return DEFAULT_INJURIES;
  }
};

export const saveInjuries = async (injuries: InjuryDefinition[]) => {
  CacheService.set('injuries', injuries);
  if (injuries.length > 0) await supabase.from('injuries').upsert(injuries);
};

export const getTimeUnits = async (): Promise<TimeUnit[]> => {
  try {
    const cached = CacheService.get<TimeUnit[]>('time_units');
    if (cached) return cached;

    const { data } = await supabase.from('time_units').select('tag, label, battle');
    if (!data || data.length === 0) return DEFAULT_TIME_UNITS;
    const mapped = data.map((r: any) => ({ tag: r.tag || r.label, label: r.label, battle: r.battle || false }));
    
    CacheService.set('time_units', mapped);
    return mapped;
  } catch (error) {
    return DEFAULT_TIME_UNITS;
  }
};

export const saveTimeUnits = async (units: TimeUnit[]) => {
  CacheService.set('time_units', units);
  const rows = units.map(u => ({ tag: u.tag, label: u.label, battle: u.battle }));
  if (rows.length > 0) await supabase.from('time_units').upsert(rows, { onConflict: 'tag' });
};

// --- TRAINING ---

export const getTrainingData = async (): Promise<TrainingRecord[]> => {
    const { data, error } = await supabase.from('training').select('*');
    if (error) {
        console.error("Failed to fetch training data", error);
        return [];
    }
    return data || [];
};

export const saveTrainingData = async (charId: string, limits: string, day: string, values: number[]) => {
    // First, fetch existing record to preserve other days
    const { data: existing } = await supabase.from('training').select('*').eq('char_id', charId).single();
    
    const currentData = existing?.current || {};
    currentData[day] = values;

    const payload = {
        char_id: charId,
        limits,
        current: currentData
    };

    const { error } = await supabase.from('training').upsert(payload);
    if (error) throw new Error(error.message);
};
