
import { CharacterData, Faction, PassiveTrigger, InjuryDefinition, TimeUnit } from './types';

export const NPC_VOLUMES = [
  "Том 1: Природные монстры",
  "Том 2: Демоны",
  "Том 3: Бессмертные",
  "Том 4: Некромонстры",
  "Том 5: Искусственно-выведенные",
  "Том 6: Боссы",
  "Спутники и Рабы",
  "Отрицательные NPC",
  "Положительные NPC"
];

export const PASSIVE_TRIGGER_TRANSLATIONS: Record<string, string> = {
  "Always": "Пассивно / Всегда",
  "On Hit": "При ударе",
  "On Kill": "При убийстве",
  "Low HP": "Низкое HP",
  "Combat Start": "Начало боя",
  "Activated": "Активация",
  "Inflict Phys Injury": "Нанесение Физ. травмы",
  "Inflict Mag Injury": "Нанесение Маг. травмы",
  "Take Phys Injury": "Получение Физ. травмы",
  "Take Mag Injury": "Получение Маг. травмы"
};

export const DEFAULT_TIME_UNITS: TimeUnit[] = [
  { tag: "посты", label: "посты", battle: false },
  { tag: "часы", label: "часы", battle: false },
  { tag: "ходы", label: "ходы", battle: true },
  { tag: "бой", label: "бой", battle: true },
  { tag: "сутки", label: "сутки", battle: false },
  { tag: "сцена", label: "сцена", battle: false },
  { tag: "раунд", label: "раунд", battle: true },
  { tag: "минуты", label: "минуты", battle: false }
];

export const DEFAULT_INJURIES: InjuryDefinition[] = [
  { tag: 'light_phys', label: 'Слабое ранение', value: -10, type: 1, desc: 'Накапливаемое (3 стака = -10)', stack: 3 },
  { tag: 'mid_phys', label: 'Среднее ранение', value: -10, type: 1, desc: '-10 к физ.' },
  { tag: 'heavy_phys', label: 'Тяжелое ранение', value: -15, type: 1, desc: '-15 к физ.' },
  { tag: 'crit_phys', label: 'Крит. повреждение', value: -20, type: 1, desc: '-20 к физ.' },
  
  { tag: 'light_mag', label: 'Слабое истощение', value: -5, type: 2, desc: '-5 к маг.' },
  { tag: 'mid_mag', label: 'Среднее истощение', value: -10, type: 2, desc: '-10 к маг.' },
  { tag: 'crit_mag', label: 'Тяжкое истощение', value: -15, type: 2, desc: '-15 к маг.' },
];

export const INITIAL_CHARACTER: CharacterData = {
  id: 'new_' + Date.now(),
  meta: {
    uid: "",
    owner_link: "",
    avatar_url: "",
    save_status: true,
    save_status_reason: ""
  },
  profile: {
    name: "Новый Странник",
    faction: Faction.LIGHT,
    npc_volume: NPC_VOLUMES[0],
    level: 1,
    bio: "",
    currencies: { juhe: 0, jumi: 0 }
  },
  stats: {
    phys: 10,
    magic: 10,
    unique: 0
  },
  resources: [
    { label: "HP", current: 100, max: 100 },
    { label: "MP", current: 50, max: 50 },
    { label: "Усталость", current: 0, max: 0 }
  ],
  equipment: {
    wearable: [],
    usable: [],
    inventory: []
  },
  ability_groups: [],
  passives: [],
  medcard: {
    injuries: [],
    conditions: []
  }
};
