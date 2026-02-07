
import { supabase } from '../lib/supabase';
import { CharacterData, InjuryDefinition, TimeUnit, Ability, TrainingRecord, BattleTag } from '../types';
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

export const getBasicActions = async (): Promise<Ability[]> => {
    try {
        const cached = CacheService.get<Ability[]>('basic_actions');
        if (cached) return cached;
        const { data } = await supabase.from('basic_actions').select('*');
        if (!data || data.length === 0) return [];
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
        return [];
    }
};

export const saveBasicActions = async (actions: Ability[]) => {
    CacheService.remove('basic_actions');
    const { error: delError } = await supabase.from('basic_actions').delete().neq('id', 0); 
    if (actions.length > 0) {
        const { error } = await supabase.from('basic_actions').insert(actions);
        if (error) throw new Error(error.message);
    }
};

export const getAllCharacters = async (): Promise<CharacterData[]> => {
  try {
    // Cache key updated to 'v2' to force a refresh on clients with stale data
    const cachedChars = CacheService.get<CharacterData[]>('roster_characters_v2');
    if (cachedChars) return cachedChars;

    const [charRes, basicActions] = await Promise.all([
        supabase.from('characters').select('*'),
        getBasicActions()
    ]);
    const { data, error } = charRes;
    if (error || !data) return [];

    const validChars: CharacterData[] = [];
    data.forEach((row: any) => {
      let charData = row.data || row;
      if (!charData.id) charData.id = row.id;
      if (!charData.profile) return; 
      
      // Hydration
      if (!charData.profile.currencies) charData.profile.currencies = { juhe: 0, jumi: 0 };
      if (!charData.meta) charData.meta = { uid: 'system', owner_link: '', avatar_url: '', save_status: true };
      
      // Sync ownership from DB row to ensure correct permissions
      if (row.user_id) {
          charData.meta.uid = row.user_id;
      }

      if (!charData.stats) charData.stats = { phys: 0, magic: 0, unique: 0 };
      if (!charData.passives) charData.passives = [];
      if (!charData.equipment) charData.equipment = { usable: [], wearable: [], inventory: [] };
      if (!charData.medcard) charData.medcard = { injuries: [], conditions: [] };
      if (!charData.ability_groups) charData.ability_groups = [];

      // FORCED INJECTION: Always ensure Basic Actions group is present, up-to-date and HIDDEN
      const bIdx = charData.ability_groups.findIndex((g: any) => g.name === "Базовые Действия");
      if (bIdx === -1) {
          charData.ability_groups.unshift({
              name: "Базовые Действия",
              tags: [],
              abilities: basicActions,
              is_hidden: true // Set to true to hide from main sheet view
          });
      } else {
          // Update existing group to match global definitions and force hidden
          charData.ability_groups[bIdx].abilities = basicActions;
          charData.ability_groups[bIdx].is_hidden = true; 
      }

      validChars.push(charData as CharacterData);
    });
    
    // Save to new cache key
    CacheService.set('roster_characters_v2', validChars);
    return validChars;
  } catch (error) {
    return [];
  }
};

export const saveCharacter = async (char: CharacterData, isAdmin: boolean = false) => {
  if (!char.id) throw new Error("Critical Error: Character ID missing.");
  const payload = { ...char };
  
  try {
      // Get current auth session to attach user_id explicitly.
      // This is required for RLS policies to validate ownership on UPSERT operations.
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      const dbRow: any = { 
          id: char.id, 
          data: payload 
      };

      // If we have a logged-in user, ensure the user_id column is populated.
      // Prioritize existing meta.uid (to prevent ownership theft), fallback to current session.
      if (currentUserId) {
          dbRow.user_id = char.meta.uid || currentUserId;
      }

      const { error } = await supabase.from('characters').upsert(dbRow);
      
      if (error) throw error;
      
      if (isAdmin) {
          // Also sync to characters_prime if admin
          await supabase.from('characters_prime').upsert(dbRow);
      }
      
      const cached = CacheService.get<CharacterData[]>('roster_characters_v2') || [];
      const index = cached.findIndex(c => c.id === char.id);
      if (index !== -1) cached[index] = char; else cached.push(char);
      CacheService.set('roster_characters_v2', cached);
      return true;
  } catch (error: any) {
    throw new Error(`Database Error: ${error.message}`);
  }
};

export const deleteCharacter = async (id: string) => {
  try {
      const { data: minions } = await supabase.from('characters').select('id').eq('data->meta->>master_id', id);
      const allIds = [id, ...(minions?.map(m => m.id) || [])];
      await supabase.from('training').delete().in('char_id', allIds);
      await supabase.from('characters_prime').delete().in('id', allIds);
      if (minions && minions.length > 0) await supabase.from('characters').delete().in('id', minions.map(m => m.id));
      const { error } = await supabase.from('characters').delete().eq('id', id);
      if (error) throw error;
      const cached = CacheService.get<CharacterData[]>('roster_characters_v2') || [];
      CacheService.set('roster_characters_v2', cached.filter(c => !allIds.includes(c.id)));
  } catch (e: any) {
      throw new Error(`Deletion Failed: ${e.message}`);
  }
};

export const uploadAvatar = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const { error: uploadError } = await supabase.storage.from('Juul-D-Tracker').upload(fileName, file);
  if (uploadError) throw new Error("Ошибка при загрузке изображения.");
  const { data } = supabase.storage.from('Juul-D-Tracker').getPublicUrl(fileName);
  return data.publicUrl;
};

export const getGlobalTriggers = async (): Promise<Record<string, string>> => {
  const cached = CacheService.get<Record<string, string>>('global_triggers');
  if (cached) return cached;
  const { data } = await supabase.from('triggers').select('tag, label');
  if (!data || data.length === 0) return { "Always": "Пассивно / Всегда" };
  const map: Record<string, string> = {};
  data.forEach((row: any) => { map[row.tag] = row.label; });
  CacheService.set('global_triggers', map);
  return map;
};

export const saveGlobalTriggers = async (triggers: Record<string, string>) => {
  CacheService.set('global_triggers', triggers);
  const rows = Object.entries(triggers).map(([tag, label]) => ({ tag, label }));
  if (rows.length > 0) await supabase.from('triggers').upsert(rows);
};

export const getInjuries = async (): Promise<InjuryDefinition[]> => {
  const cached = CacheService.get<InjuryDefinition[]>('injuries');
  if (cached) return cached;
  const { data } = await supabase.from('injuries').select('*').order('type').order('value');
  if (!data || data.length === 0) return DEFAULT_INJURIES;
  CacheService.set('injuries', data);
  return data as InjuryDefinition[];
};

export const saveInjuries = async (injuries: InjuryDefinition[]) => {
  CacheService.set('injuries', injuries);
  if (injuries.length > 0) await supabase.from('injuries').upsert(injuries);
};

export const getTimeUnits = async (): Promise<TimeUnit[]> => {
  const cached = CacheService.get<TimeUnit[]>('time_units');
  if (cached) return cached;
  const { data } = await supabase.from('time_units').select('tag, label, battle');
  if (!data || data.length === 0) return DEFAULT_TIME_UNITS;
  const mapped = data.map((r: any) => ({ tag: r.tag || r.label, label: r.label, battle: r.battle || false }));
  CacheService.set('time_units', mapped);
  return mapped;
};

export const saveTimeUnits = async (units: TimeUnit[]) => {
  CacheService.set('time_units', units);
  const rows = units.map(u => ({ tag: u.tag, label: u.label, battle: u.battle }));
  if (rows.length > 0) await supabase.from('time_units').upsert(rows, { onConflict: 'tag' });
};

export const getBattleTags = async (): Promise<BattleTag[]> => {
    const cached = CacheService.get<BattleTag[]>('battle_tags');
    if (cached) return cached;
    const { data } = await supabase.from('battle_tags').select('*').order('tag');
    if (!data) return [];
    CacheService.set('battle_tags', data);
    return data;
};

export const saveBattleTag = async (tag: BattleTag) => {
    await supabase.from('battle_tags').upsert(tag);
    CacheService.remove('battle_tags');
};

export const deleteBattleTag = async (tag: string) => {
    await supabase.from('battle_tags').delete().eq('tag', tag);
    CacheService.remove('battle_tags');
};

export const getTrainingData = async (): Promise<TrainingRecord[]> => {
    const { data } = await supabase.from('training').select('*');
    return data || [];
};

export const saveTrainingData = async (charId: string, limits: string, day: string, values: number[]) => {
    const { data: existing } = await supabase.from('training').select('*').eq('char_id', charId).single();
    const currentData = existing?.current || {};
    currentData[day] = values;
    await supabase.from('training').upsert({ char_id: charId, limits, current: currentData });
};

export const exportFullBackup = async () => {
    try {
        const [chars, trigs, injuries, timeUnits, actions, tags, training] = await Promise.all([
            supabase.from('characters').select('*'),
            supabase.from('triggers').select('*'),
            supabase.from('injuries').select('*'),
            supabase.from('time_units').select('*'),
            supabase.from('basic_actions').select('*'),
            supabase.from('battle_tags').select('*'),
            supabase.from('training').select('*')
        ]);
        const backupData = { characters: chars.data || [], triggers: trigs.data || [], injuries: injuries.data || [], time_units: timeUnits.data || [], basic_actions: actions.data || [], battle_tags: tags.data || [], training: training.data || [], exported_at: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `juul_d_backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
    } catch (e: any) { throw new Error("Failed to export: " + e.message); }
};

export const importFullBackup = async (file: File): Promise<{ success: boolean; message: string }> => {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.characters && data.characters.length > 0) await supabase.from('characters').upsert(data.characters);
        if (data.triggers && data.triggers.length > 0) await supabase.from('triggers').upsert(data.triggers);
        if (data.injuries && data.injuries.length > 0) await supabase.from('injuries').upsert(data.injuries);
        if (data.time_units && data.time_units.length > 0) await supabase.from('time_units').upsert(data.time_units);
        if (data.basic_actions && data.basic_actions.length > 0) await supabase.from('basic_actions').upsert(data.basic_actions);
        if (data.battle_tags && data.battle_tags.length > 0) await supabase.from('battle_tags').upsert(data.battle_tags);
        if (data.training && data.training.length > 0) await supabase.from('training').upsert(data.training);
        CacheService.clearAll();
        return { success: true, message: "Импорт завершен успешно. Кеш очищен." };
    } catch (e: any) { return { success: false, message: e.message }; }
};

export const cleanUnusedStorage = async (): Promise<number> => {
    try {
        const { data: files, error: listError } = await supabase.storage.from('Juul-D-Tracker').list();
        if (listError) throw listError;
        if (!files || files.length === 0) return 0;
        const [{ data: chars }, { data: maps }, { data: locs }] = await Promise.all([ supabase.from('characters').select('data'), supabase.from('maps').select('image_url'), supabase.from('locations').select('img') ]);
        const usedUrls = new Set<string>();
        chars?.forEach((c: any) => { if (c.data?.meta?.avatar_url) usedUrls.add(c.data.meta.avatar_url); });
        maps?.forEach((m: any) => usedUrls.add(m.image_url));
        locs?.forEach((l: any) => usedUrls.add(l.img));
        const filesToDelete: string[] = [];
        files.forEach(file => {
            const publicUrl = supabase.storage.from('Juul-D-Tracker').getPublicUrl(file.name).data.publicUrl;
            if (!usedUrls.has(publicUrl)) filesToDelete.push(file.name);
        });
        if (filesToDelete.length > 0) {
            const { error: delError } = await supabase.storage.from('Juul-D-Tracker').remove(filesToDelete);
            if (delError) throw delError;
        }
        return filesToDelete.length;
    } catch (e: any) { throw new Error("Cleanup failed: " + e.message); }
};
