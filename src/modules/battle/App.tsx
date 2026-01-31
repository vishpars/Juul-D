
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor, DragStartEvent, pointerWithin } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { BattleParticipant, LogEntry, SequenceNode, BattleStatus, CharacterTemplate, ActiveEffect, Cooldown, JsonInjury } from './types';
import { advanceRound, tickActionTimers } from './engine/timeEngine';
import { calculateSequenceTree } from './engine/calculator';
import { generateSummary, generateStatsText } from './engine/formatters';
import SourcePanel from './components/SourcePanel';
import SequenceCanvas from './components/SequenceCanvas';
import BattleLog from './components/BattleLog';
import { Modal } from './components/Modal';
import { updateBattle, getCharacters, createBattle, getBattles, calculateTraumaPenalty, updateCharacter, deleteBattle, supabase } from './lib/supabase';
import { UserPlus, Save, Play, Square, List, RefreshCw, Trash2, Search, Filter, HardDrive, Cloud, Database, WifiOff } from 'lucide-react';

// UI State Types
type ModalType = 'CREATE_BATTLE' | 'CONFIRM_SAVE' | 'CONFIRM_END' | 'FINALIZE_BATTLE' | 'ALERT' | 'CHAR_SELECT' | 'BATTLE_LIST' | 'CONFIRM_DELETE' | null;
type StorageMode = 'local' | 'server';

interface SavedBattleItem {
    id: string;
    name: string;
    status: string;
    source: StorageMode;
    timestamp?: number;
}

interface BattleModuleProps {
  isAdmin?: boolean;
}

const LOCAL_STORAGE_KEY = 'juul_d_local_battles';

const App: React.FC<BattleModuleProps> = ({ isAdmin = false }) => {
  const [participants, setParticipants] = useState<BattleParticipant[]>([]);
  const [round, setRound] = useState<number>(0); 
  const [status, setStatus] = useState<BattleStatus>('startup');
  const [battleName, setBattleName] = useState('Новый Бой');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [battleId, setBattleId] = useState<string | null>(null);
  
  // Storage State
  const [storageMode, setStorageMode] = useState<StorageMode>(isAdmin ? 'server' : 'local');
  const [savedBattles, setSavedBattles] = useState<SavedBattleItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [allCharacters, setAllCharacters] = useState<CharacterTemplate[]>([]);
  
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalInput, setModalInput] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});

  // Character Selection State
  const [charSearchTerm, setCharSearchTerm] = useState('');
  const [selectedFaction, setSelectedFaction] = useState<string>('All');
  const [selectedVolume, setSelectedVolume] = useState<string>('All');

  // State for Finalize Battle Modal
  const [participantsToSave, setParticipantsToSave] = useState<Set<string>>(new Set());
  
  // State for Deletion
  const [battleToDelete, setBattleToDelete] = useState<{id: string, source: StorageMode} | null>(null);

  const [tree, setTree] = useState<SequenceNode[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [activeNode, setActiveNode] = useState<SequenceNode | null>(null);

  // Configure sensors for mobile-friendly Drag & Drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const initRef = useRef(false);

  // --- INIT ---
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    refreshData();
  }, [isAdmin]);

  // Ensure non-admins are always local
  useEffect(() => {
      if (!isAdmin && storageMode === 'server') {
          setStorageMode('local');
      }
  }, [isAdmin]);

  const refreshData = async () => {
        const { data: chars } = await getCharacters();
        if (chars && chars.length > 0) {
             setAllCharacters(chars);
        }
        await loadSavedBattlesList();
  };

  const loadSavedBattlesList = async () => {
        let combined: SavedBattleItem[] = [];

        try {
            const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
            const localMapped = localData.map((b: any) => ({
                id: b.id,
                name: b.name,
                status: b.status,
                source: 'local' as StorageMode,
                timestamp: b.timestamp || 0
            }));
            combined = [...combined, ...localMapped];
        } catch (e) {
            console.error("Failed to parse local battles", e);
        }

        if (isAdmin) {
            const { data: battles } = await getBattles();
            if (battles) {
                const serverMapped = battles.map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    status: b.status,
                    source: 'server' as StorageMode,
                    timestamp: new Date(b.created_at).getTime()
                }));
                combined = [...combined, ...serverMapped];
            }
        }

        setSavedBattles(combined);
  };

  // --- DERIVED LISTS FOR FILTERS ---
  const uniqueFactions = useMemo(() => {
      const factions = new Set<string>();
      allCharacters.forEach(c => {
          if (c.profile.faction && c.profile.faction !== 'Могильник') {
              factions.add(c.profile.faction);
          }
      });
      return Array.from(factions).sort();
  }, [allCharacters]);

  const uniqueVolumes = useMemo(() => {
      const isNpcLike = ['NPC', 'НПС', 'Бестиарий'].includes(selectedFaction);
      if (!isNpcLike) return [];
      
      const volumes = new Set<string>();
      allCharacters.forEach(c => {
          if (c.profile.faction === selectedFaction && c.profile.npc_volume) {
              volumes.add(c.profile.npc_volume);
          }
      });
      return Array.from(volumes).sort();
  }, [allCharacters, selectedFaction]);


  // --- MEMOIZED FILTERING ---
  const filteredCharacters = useMemo(() => {
    let result = [...allCharacters];
    result = result.filter(c => c.profile.faction !== 'Могильник');

    if (charSearchTerm) {
        const lower = charSearchTerm.toLowerCase();
        result = result.filter(c => c.profile.name.toLowerCase().includes(lower));
    }

    if (selectedFaction !== 'All') {
        result = result.filter(c => c.profile.faction === selectedFaction);
    }

    const isNpcLike = ['NPC', 'НПС', 'Бестиарий'].includes(selectedFaction);
    if (isNpcLike && selectedVolume !== 'All') {
         result = result.filter(c => c.profile.npc_volume === selectedVolume);
    }

    result.sort((a, b) => a.profile.name.localeCompare(b.profile.name));
    return result;
  }, [allCharacters, charSearchTerm, selectedFaction, selectedVolume]);

  // --- UI HELPERS ---
  const showAlert = (msg: string) => {
      setAlertMessage(msg);
      setActiveModal('ALERT');
  };

  const closeModal = () => {
      setActiveModal(null);
      setModalInput('');
      setAlertMessage('');
      setCharSearchTerm('');
      setSelectedFaction('All');
      setSelectedVolume('All');
  };

  const getStatusLabel = (s: string) => {
       if (s === 'active') return 'АКТИВЕН';
       if (s === 'finished') return 'ЗАВЕРШЕН';
       if (s === 'startup') return 'ПОДГОТОВКА';
       return s;
  };

  const getCharacterStyle = (faction: string) => {
      const f = (faction || '').toLowerCase();
      if (['светлые', 'light', 'свет'].includes(f)) return 'bg-amber-900/10 border-amber-600/50 hover:bg-amber-900/20 text-amber-100';
      if (['тёмные', 'dark', 'темные', 'тьма'].includes(f)) return 'bg-indigo-950/30 border-indigo-500/50 hover:bg-indigo-900/20 text-indigo-100';
      if (['npc', 'нпс', 'бестиарий'].includes(f)) return 'bg-red-950/20 border-red-800/50 hover:bg-red-900/20 text-red-100';
      return 'bg-panel border-violet-900/30 hover:border-violet-500/50 text-slate-200';
  };

  const toggleStorageMode = () => {
      if (!isAdmin) return;
      setStorageMode(prev => prev === 'server' ? 'local' : 'server');
  };

  const handleUpdateParticipant = (id: string, updates: any) => {
      setParticipants(prev => prev.map(p => {
          if (p.instance_id !== id) return p;
          if (updates.profile) {
              return { ...p, profile: { ...p.profile, ...updates.profile } };
          }
          if (updates.stats) {
              return { ...p, stats: { ...p.stats, ...updates.stats } };
          }
          return { ...p, ...updates };
      }));
  };

  const handleToggleEquip = (participantId: string, itemId: string) => {
      setParticipants(prev => prev.map(p => {
          if (p.instance_id !== participantId) return p;
          const newWearable = p.equipment.wearable.map(item => {
              if (item._id === itemId) return { ...item, is_equipped: !item.is_equipped };
              return item;
          });
          return { ...p, equipment: { ...p.equipment, wearable: newWearable } };
      }));
  };

  const handleRemoveParticipant = (participantId: string) => {
      setParticipants(prev => {
          const filtered = prev.filter(p => p.instance_id !== participantId);
          const idMap: Record<string, number[]> = {};
          const getBaseName = (name: string) => name.replace(/ #\d+$/, '');

          filtered.forEach((p, idx) => {
              const base = getBaseName(p.profile.name);
              const key = `${p.id}|${base}`;
              if (!idMap[key]) idMap[key] = [];
              idMap[key].push(idx);
          });

          const nextParticipants = [...filtered];
          Object.values(idMap).forEach(indices => {
              if (indices.length > 0) {
                  const firstP = nextParticipants[indices[0]];
                  const baseName = getBaseName(firstP.profile.name);
                  const wasNumbered = firstP.profile.name.match(/ #\d+$/);
                  if (indices.length > 1 || wasNumbered) {
                      indices.forEach((pIndex, i) => {
                          const newName = `${baseName} #${i + 1}`;
                          if (nextParticipants[pIndex].profile.name !== newName) {
                              nextParticipants[pIndex] = {
                                  ...nextParticipants[pIndex],
                                  profile: { ...nextParticipants[pIndex].profile, name: newName }
                              };
                          }
                      });
                  }
              }
          });
          return nextParticipants;
      });
  };

  const handleRemoveEffect = (participantId: string, effectId: string) => {
      setParticipants(prev => prev.map(p => {
          if (p.instance_id !== participantId) return p;
          const effectToRemove = p.active_effects.find(e => e.id === effectId);
          const nextEffects = p.active_effects.filter(e => e.id !== effectId);
          
          let nextCooldowns = [...p.cooldowns];
          if (effectToRemove?.original_ability_id) {
               const sourceAbility = p.flat_abilities.find(a => a._id === effectToRemove.original_ability_id);
               if (sourceAbility && sourceAbility.cd > 0) {
                   if (!nextCooldowns.some(cd => cd.name === sourceAbility.name)) {
                       nextCooldowns.push({
                          id: `cd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                          name: sourceAbility.name,
                          val: sourceAbility.cd,
                          max: sourceAbility.cd,
                          unit: sourceAbility.cd_unit || 'turn'
                       });
                   }
               }
          }
          return { ...p, active_effects: nextEffects, cooldowns: nextCooldowns };
      }));
  };

  const handleRemoveCooldown = (participantId: string, cdId: string) => {
      setParticipants(prev => prev.map(p => {
          if (p.instance_id !== participantId) return p;
          return { ...p, cooldowns: p.cooldowns.filter(cd => cd.id !== cdId) };
      }));
  };

  const handleAddInjury = (participantId: string, templateId: string) => {
      setParticipants(prev => prev.map(p => {
          if (p.instance_id !== participantId) return p;
          const newInjuries = [...p.medcard.injuries, { count: 1, template_id: templateId, custom_name: '' }];
          const trauma = calculateTraumaPenalty(newInjuries);
          return {
              ...p,
              medcard: { ...p.medcard, injuries: newInjuries },
              battle_stats: { ...p.battle_stats, hp_penalty_current: trauma.total, trauma_phys: trauma.phys, trauma_mag: trauma.mag, trauma_uniq: trauma.uniq }
          };
      }));
  };

  const handleRemoveInjury = (participantId: string, index: number) => {
      setParticipants(prev => prev.map(p => {
          if (p.instance_id !== participantId) return p;
          const newInjuries = [...p.medcard.injuries];
          newInjuries.splice(index, 1);
          const trauma = calculateTraumaPenalty(newInjuries);
          return {
              ...p,
              medcard: { ...p.medcard, injuries: newInjuries },
              battle_stats: { ...p.battle_stats, hp_penalty_current: trauma.total, trauma_phys: trauma.phys, trauma_mag: trauma.mag, trauma_uniq: trauma.uniq }
          };
      }));
  };

  const handleAddDebuff = (participantId: string, name: string, tag: string, val: number, dur: number, unit: string, extraTags?: string) => {
      setParticipants(prev => prev.map(p => {
          if (p.instance_id !== participantId) return p;
          const finalTags = [];
          if (tag && tag !== 'none') finalTags.push(tag);
          if (extraTags) finalTags.push(extraTags.toLowerCase().trim());

          const newEffect: ActiveEffect = {
              id: `custom_${Date.now()}`,
              name: name,
              tags: finalTags,
              bonuses: [{ val: val, stat: tag }],
              duration_left: dur,
              unit: unit || 'turn'
          };
          return { ...p, active_effects: [...p.active_effects, newEffect] };
      }));
  };

  const loadBattle = async (id: string, source: StorageMode) => {
      setLoading(true);
      let foundBattle = null;
      if (source === 'server') {
          const { data: b } = await supabase.from('battles').select('*').eq('id', id).single();
          foundBattle = b;
      } else {
          const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
          foundBattle = localData.find((b: any) => b.id === id);
      }

      if (foundBattle) {
          setBattleId(foundBattle.id);
          setBattleName(foundBattle.name || 'Бой без названия');
          setRound(foundBattle.round);
          setStatus(foundBattle.status || 'startup');
          setLogs(foundBattle.sequence_log || []);
          setParticipants(foundBattle.participants_snapshot || []);
          if (isAdmin) setStorageMode(source);
      } else {
          showAlert("Бой не найден (возможно удален).");
          loadSavedBattlesList();
      }
      setLoading(false);
      setActiveModal(null);
  };

  const handleDeleteBattle = (id: string, source: StorageMode, e: React.MouseEvent) => {
      e.stopPropagation();
      setBattleToDelete({ id, source });
      setActiveModal('CONFIRM_DELETE');
  };

  const confirmDeleteBattle = async () => {
      if (!battleToDelete) {
          setActiveModal('BATTLE_LIST');
          return;
      }
      const { id, source } = battleToDelete;
      if (source === 'server') {
          const { error } = await deleteBattle(id);
          if (error) {
              showAlert(`Ошибка удаления: ${error.message}`);
              return;
          }
      } else {
          const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
          const newData = localData.filter((b: any) => b.id !== id);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
      }
      setSavedBattles(prev => prev.filter(b => b.id !== id));
      if (battleId === id) {
          setBattleId(null);
          setBattleName('Новый Бой');
          setRound(1);
          setStatus('startup');
          setLogs([]);
          setParticipants([]);
          setTree([]);
          showAlert(source === 'server' ? "Бой удален из базы." : "Бой удален из локального хранилища.");
      } else {
          setActiveModal('BATTLE_LIST');
      }
      setBattleToDelete(null);
  };

  const cancelDelete = () => {
      setBattleToDelete(null);
      setActiveModal('BATTLE_LIST');
  };

  const handleCreateBattleClick = () => {
      setModalInput('');
      setActiveModal('CREATE_BATTLE');
  };

  const confirmCreateBattle = async () => {
      const name = modalInput || "Стычка у ворот";
      setLoading(true);
      const newBattle = {
          id: `battle_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
          name,
          participants_snapshot: [],
          sequence_log: [],
          casualties: [],
          round: 0,
          status: 'startup'
      };
      if (storageMode === 'server' && isAdmin) {
          const { data, error } = await createBattle(name);
          if (error) {
              showAlert(`Failed to create battle in DB. Error: ${error.message}`);
              setLoading(false);
              return;
          }
          if (data) {
              setBattleId(data.id);
              setBattleName(data.name);
          }
      } else {
          setBattleId(newBattle.id);
          setBattleName(newBattle.name);
          const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
          localData.push(newBattle);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
      }
      setRound(0);
      setStatus('startup');
      setParticipants([]);
      setLogs([]);
      setLoading(false);
      closeModal();
      loadSavedBattlesList();
  };

  const handleSaveBattle = async () => {
      if (!battleId) {
          setPendingAction(() => async () => {
               showAlert("Пожалуйста, создайте бой через меню 'Архив' -> 'Создать'.");
               closeModal();
          });
          setActiveModal('CONFIRM_SAVE');
          return;
      }
      const battleState = {
          name: battleName,
          participants_snapshot: participants,
          sequence_log: logs,
          round: round,
          status: status,
          casualties: []
      };
      if (storageMode === 'server' && isAdmin) {
          const { error } = await updateBattle(battleId, battleState);
          if (error) showAlert(`Ошибка сохранения на сервер: ${error.message}.`);
          else showAlert("Бой успешно сохранен в базе данных.");
      } else {
          const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
          const index = localData.findIndex((b: any) => b.id === battleId);
          if (index !== -1) localData[index] = { ...localData[index], ...battleState };
          else localData.push({ id: battleId, ...battleState });
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
          showAlert("Бой сохранен локально.");
      }
      loadSavedBattlesList();
  };

  const updateBattleName = async (newName: string) => {
      setBattleName(newName);
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const addParticipant = (template: CharacterTemplate) => {
      // 1. Calculate Name Collision against CURRENT state
      const baseName = template.profile.name;
      const sameType = participants.filter(p => p.id === template.id);
      
      let newName = baseName;
      let nextParticipants = [...participants];

      if (sameType.length > 0) {
          nextParticipants = nextParticipants.map(p => {
              if (p.id === template.id && p.profile.name === baseName) {
                  return { ...p, profile: { ...p.profile, name: `${baseName} #1` } };
              }
              return p;
          });

          const regex = new RegExp(`^${escapeRegExp(baseName)} #(\\d+)$`);
          const usedNumbers = nextParticipants
              .filter(p => p.id === template.id)
              .map(p => {
                  const match = p.profile.name.match(regex);
                  return match ? parseInt(match[1]) : 0;
              });
          const maxNum = Math.max(0, ...usedNumbers);
          newName = `${baseName} #${maxNum + 1}`;
      }

      // 2. Prepare Data
      const flatAbilities = (template.ability_groups || []).flatMap(g => g.abilities || []);
      let passivesToScan = template.flat_passives || [];
      if (passivesToScan.length === 0 && template.passives) {
          passivesToScan = template.passives.flatMap(g => g.items);
      }

      const startupEffects: ActiveEffect[] = [];
      const processedPassiveIds = new Set<string>(); 
      let logText = "";
      
      passivesToScan.forEach(pas => {
          if (processedPassiveIds.has(pas._id)) return;
          processedPassiveIds.add(pas._id);

          if (!pas.trigger) return;
          // Trigger normalized check
          const trig = pas.trigger.toUpperCase();
          if (trig === 'COMBAT_START' || trig === 'START') {
              const mechInfo = pas.desc_mech ? ` (${pas.desc_mech})` : '';
              logText += `> (${newName}: ${pas.name}${mechInfo})\n`;
              const hasDuration = pas.dur && pas.dur > 0;
              startupEffects.push({
                  id: `start_passive_${pas._id || Math.random()}_${Date.now()}`,
                  name: pas.name,
                  tags: [...(pas.tags || []), pas.is_flaw ? 'debuff' : 'buff'],
                  bonuses: pas.bonuses || [],
                  duration_left: hasDuration ? pas.dur! : 999,
                  unit: hasDuration ? (pas.dur_unit || 'turn') : 'battle',
                  original_ability_id: pas._id
              });
          }
      });

      const newP: BattleParticipant = {
          ...template,
          instance_id: `char_${template.id}_${Date.now()}`,
          is_player: false,
          profile: { ...template.profile, name: newName },
          battle_stats: (template as any).battle_stats || {
              hp_penalty_current: 0, trauma_phys: 0, trauma_mag: 0, trauma_uniq: 0, actions_max: 4, actions_left: 4
          },
          active_effects: startupEffects,
          cooldowns: [],
          usage_counts: {}, 
          flat_abilities: flatAbilities,
          flat_passives: passivesToScan
      };

      // 3. Update State
      setParticipants([...nextParticipants, newP]);

      if (logText) {
          // Use a unique ID tied to the participant instance to prevent duplication
          const logId = `trigger_add_${newP.instance_id}`;
          setLogs(prevLogs => {
              if (prevLogs.some(l => l.id === logId)) return prevLogs;
              return [...prevLogs, {
                  id: logId,
                  round: round,
                  timestamp: new Date().toISOString(),
                  type: 'action', 
                  text_formatted: logText.trim()
              }];
          });
      }
      
      setActiveModal(null);
  };

  const handleNextRound = async () => {
    const summary = generateSummary(participants, round);
    const statsSnapshot = generateStatsText(participants);
    const participantsSnapshot = JSON.parse(JSON.stringify(participants));

    const endRoundLog: LogEntry = {
      id: `end_rnd_${round}_${Date.now()}`,
      round: round,
      timestamp: new Date().toISOString(),
      type: 'system',
      text_formatted: round === 0 ? `ЗАВЕРШЕНИЕ ПОДГОТОВКИ` : `ЗАВЕРШЕНИЕ РАУНДА ${round}`,
      summary: summary,
      details: { stats_snapshot: statsSnapshot, participants_snapshot: participantsSnapshot }
    };

    const nextR = round + 1;
    let newStatus = status;
    if (status === 'startup') {
        newStatus = 'active';
        setStatus('active');
    }
    
    let advancedParticipants = [...participants];
    if (round !== 0) advancedParticipants = advanceRound(participants);
    
    const startRoundLog: LogEntry = {
        id: `start_rnd_${nextR}_${Date.now()}`,
        round: nextR,
        timestamp: new Date().toISOString(),
        text_formatted: `НАЧАЛО РАУНДА ${nextR}`,
        type: 'round_change'
    };
    
    const logsToAdd = [endRoundLog, startRoundLog];
    const updatedLogs = [...logs, ...logsToAdd];
    
    setRound(nextR);
    setParticipants(advancedParticipants);
    setLogs(updatedLogs);
    setStatus(newStatus);

    if (battleId) {
        if (storageMode === 'server' && isAdmin) {
            await updateBattle(battleId, { sequence_log: updatedLogs, round: nextR, status: newStatus, participants_snapshot: advancedParticipants });
        } else {
            const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
            const index = localData.findIndex((b: any) => b.id === battleId);
            const battleState = { name: battleName, participants_snapshot: advancedParticipants, sequence_log: updatedLogs, round: nextR, status: newStatus };
            if (index !== -1) localData[index] = { ...localData[index], ...battleState };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
        }
    }
  };

  const handleRollback = async (targetRound: number) => {
      const snapshotLog = logs.find(l => l.round === targetRound && l.details?.participants_snapshot);
      if (!snapshotLog) {
          showAlert("Невозможно откатить: нет сохраненного состояния для этого раунда.");
          return;
      }
      setParticipants(snapshotLog.details.participants_snapshot);
      setRound(snapshotLog.round);
      const newLogs = logs.filter(l => l.round <= targetRound && l.id !== snapshotLog.id);
      setLogs(newLogs);
      if (battleId) {
          const updatePayload = { round: snapshotLog.round, participants_snapshot: snapshotLog.details.participants_snapshot, sequence_log: newLogs, status: 'active' };
          if (storageMode === 'server' && isAdmin) await updateBattle(battleId, updatePayload);
          else {
              const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
              const index = localData.findIndex((b: any) => b.id === battleId);
              if (index !== -1) {
                  localData[index] = { ...localData[index], ...updatePayload };
                  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
              }
          }
      }
      showAlert(`Откат выполнен. Вы вернулись в Раунд ${targetRound}.`);
  };

  const handleEndBattleClick = () => {
      const injuredIds = new Set<string>();
      participants.forEach(p => {
          if (p.medcard.injuries.length > 0) injuredIds.add(p.instance_id);
      });
      setParticipantsToSave(injuredIds);
      setActiveModal('FINALIZE_BATTLE');
  };

  const handleToggleSaveParticipant = (id: string) => {
      const next = new Set(participantsToSave);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setParticipantsToSave(next);
  };

  const finalizeBattle = async () => {
      if (!isAdmin) {
          setStatus('finished');
          showAlert("Бой завершен локально. Не-админы не могут обновлять травмы в базе персонажей.");
          closeModal();
          return;
      }
      setLoading(true);
      for (const p of participants) {
          if (participantsToSave.has(p.instance_id)) await updateCharacter(p.id, { medcard: p.medcard });
      }
      setStatus('finished');
      if (battleId && storageMode === 'server') await updateBattle(battleId, { status: 'finished' });
      setLoading(false);
      closeModal();
      showAlert("Бой финализирован. Травмы для выбранных персонажей обновлены в базе данных.");
  };

  const confirmEndBattle = async () => {
      setStatus('finished');
      if (battleId) {
          if (storageMode === 'server' && isAdmin) await updateBattle(battleId, { status: 'finished' });
          else {
              const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
              const index = localData.findIndex((b: any) => b.id === battleId);
              if (index !== -1) {
                  localData[index].status = 'finished';
                  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
              }
          }
      }
      closeModal();
  };

  const extractActionsFromTree = (nodes: SequenceNode[]): SequenceNode[] => {
      let actions: SequenceNode[] = [];
      for (const node of nodes) {
          if (node.type === 'action') actions.push(node);
          if (node.children) actions = actions.concat(extractActionsFromTree(node.children));
      }
      return actions;
  };

  const handleCommit = async () => {
    if (tree.length === 0) {
        showAlert("Холст пуст. Добавьте действия или комбо.");
        return;
    }

    const result = calculateSequenceTree(tree, participants);
    const newLog: LogEntry = {
        id: Date.now().toString(),
        round: round,
        timestamp: new Date().toISOString(),
        text_formatted: result.formattedString || 'Пустое действие',
        type: 'action'
    };
    
    let updatedParticipants = [...participants];
    const actionNodes = extractActionsFromTree(tree);
    const actionsPerActor: Record<string, number> = {};
    const abilitiesUsed: { charId: string, abilityId: string }[] = [];

    actionNodes.forEach(node => {
        const charId = node.data?.charId;
        const abilityId = node.data?.abilityId;
        if (charId) actionsPerActor[charId] = (actionsPerActor[charId] || 0) + 1;
        if (charId && abilityId) abilitiesUsed.push({ charId, abilityId });
    });

    const effectsToApply: { charId: string, effect: ActiveEffect }[] = [];
    const cooldownsToApply: { charId: string, cooldown: Cooldown }[] = [];

    actionNodes.forEach(node => {
        const charId = node.data?.charId;
        const abilityId = node.data?.abilityId;
        if (!charId || !abilityId) return;

        const actor = participants.find(p => p.instance_id === charId);
        if (!actor) return;

        let ability = actor.flat_abilities.find(a => a._id === abilityId);
        if (!ability) {
             actor.ability_groups.forEach(g => {
                 const found = g.abilities.find(a => a._id === abilityId);
                 if (found) ability = found;
             });
        }

        if (ability) {
            // Apply main duration effect
            if (ability.dur > 0) {
                effectsToApply.push({
                    charId,
                    effect: {
                        id: `eff_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        name: ability.name,
                        tags: ability.tags,
                        bonuses: ability.bonuses,
                        duration_left: ability.dur,
                        unit: ability.dur_unit || 'turn',
                        original_ability_id: ability._id
                    }
                });

                // Handle Linked Passives ("От способности" trigger)
                const linkedPassives = actor.flat_passives.filter(p => 
                    p.trigger === 'ABILITY' && p.trigger_ability_id === ability!.name
                );

                linkedPassives.forEach(lp => {
                    effectsToApply.push({
                        charId,
                        effect: {
                            id: `eff_linked_${lp._id}_${Date.now()}`,
                            name: lp.name,
                            tags: [...(lp.tags || []), lp.is_flaw ? 'debuff' : 'buff', 'linked'],
                            bonuses: lp.bonuses || [],
                            duration_left: ability!.dur, // Sync duration with parent ability
                            unit: ability!.dur_unit || 'turn',
                            original_ability_id: ability!._id
                        }
                    });
                });
            }
            if (ability.cd > 0 && ability.dur === 0) {
                if (!ability.limit || ability.limit <= 0) {
                    cooldownsToApply.push({
                        charId,
                        cooldown: {
                            id: `cd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            name: ability.name,
                            val: ability.cd,
                            max: ability.cd,
                            unit: ability.cd_unit || 'turn'
                        }
                    });
                }
            }
        }
    });

    updatedParticipants = updatedParticipants.map(p => {
        let processedP = p;
        if (actionsPerActor[p.instance_id]) processedP = tickActionTimers(p, actionsPerActor[p.instance_id]);
        
        const myUsages = abilitiesUsed.filter(u => u.charId === p.instance_id);
        const nextUsageCounts = { ...processedP.usage_counts };
        const limitBasedCooldowns: Cooldown[] = [];

        myUsages.forEach(usage => {
             const ability = processedP.flat_abilities.find(a => a._id === usage.abilityId);
             if (ability) {
                 const current = nextUsageCounts[ability._id] || 0;
                 const next = current + 1;
                 nextUsageCounts[ability._id] = next;
                 if (ability.limit && ability.limit > 0) {
                     if (next >= ability.limit && ability.cd > 0) {
                          limitBasedCooldowns.push({
                              id: `cd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                              name: ability.name, val: ability.cd, max: ability.cd, unit: ability.cd_unit || 'turn'
                          });
                     }
                 }
             }
        });

        processedP = { ...processedP, usage_counts: nextUsageCounts };
        const myNewEffects = effectsToApply.filter(item => item.charId === p.instance_id).map(item => item.effect);
        const myNewCooldowns = cooldownsToApply.filter(item => item.charId === p.instance_id).map(item => item.cooldown);
        const allNewCooldowns = [...myNewCooldowns, ...limitBasedCooldowns];
        const finalCooldowns = [...processedP.cooldowns];
        allNewCooldowns.forEach(newCD => {
             if (!finalCooldowns.some(existing => existing.name === newCD.name)) finalCooldowns.push(newCD);
        });
        return { ...processedP, active_effects: [...processedP.active_effects, ...myNewEffects], cooldowns: finalCooldowns };
    });

    setParticipants(updatedParticipants);
    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    setTree([]); 

    if (battleId) {
        if (storageMode === 'server' && isAdmin) {
            await updateBattle(battleId, { sequence_log: updatedLogs, participants_snapshot: updatedParticipants });
        } else {
            const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
            const index = localData.findIndex((b: any) => b.id === battleId);
            if (index !== -1) {
                localData[index] = { ...localData[index], sequence_log: updatedLogs, participants_snapshot: updatedParticipants };
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
            }
        }
    }
  };

  const getParentId = (nodes: SequenceNode[], nodeId: string, parentId: string = 'root'): string | null => {
      for (const node of nodes) {
          if (node.id === nodeId) return parentId;
          if (node.children && node.children.length > 0) {
              const found = getParentId(node.children, nodeId, node.id);
              if (found) return found;
          }
      }
      return null;
  };

  const findNode = (nodes: SequenceNode[], id: string): SequenceNode | null => {
    for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNode(node.children, id);
        if (found) return found;
    }
    return null;
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;
    if (type === 'SOURCE_ABILITY') setActiveDragItem(active.data.current);
    else if (type === 'NODE') setActiveNode(active.data.current?.node);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);
    setActiveNode(null);
    if (!over) return;
    if (active.data.current?.type === 'SOURCE_ABILITY') {
        const { charId, abilityId } = active.data.current;
        const newNode: SequenceNode = { id: `node-${Date.now()}`, type: 'action', data: { charId, abilityId, weaponId: '' }, children: [] };
        let targetParentId = 'root';
        const overData = over.data.current || {};
        if (over.id === 'root-canvas') targetParentId = 'root';
        else if (overData.type === 'CONTAINER') targetParentId = overData.nodeId;
        else if (overData.type === 'NODE') targetParentId = getParentId(tree, over.id as string) || 'root';
        if (targetParentId !== 'root') {
            const container = findNode(tree, targetParentId);
            if (container && container.type === 'combo' && container.children.length >= 2) return; 
        }
        setTree(prev => {
             if (targetParentId === 'root') return [...prev, newNode];
             return addNodeToContainer(prev, targetParentId, newNode);
        });
        return;
    }

    if (active.data.current?.type === 'NODE') {
        const activeId = active.id as string;
        const activeParentId = getParentId(tree, activeId) || 'root';
        if (!activeId) return;
        let targetParentId = 'root';
        const overId = over.id as string;
        const overData = over.data.current || {};
        if (over.id === 'root-canvas') targetParentId = 'root';
        else if (overData.type === 'CONTAINER') targetParentId = overData.nodeId;
        else if (overData.type === 'NODE') targetParentId = getParentId(tree, overId) || 'root';
        if (activeId === overId) return;
        if (targetParentId !== activeParentId && targetParentId !== 'root') {
             const container = findNode(tree, targetParentId);
             if (container && container.type === 'combo' && container.children.length >= 2) return;
        }
        setTree(items => {
             if (activeParentId === targetParentId) {
                  if (activeParentId === 'root') {
                      const oldIdx = items.findIndex(n => n.id === activeId);
                      const newIdx = items.findIndex(n => n.id === overId);
                      if (oldIdx !== -1 && newIdx !== -1) return arrayMove(items, oldIdx, newIdx);
                      return items;
                  } else return recursiveSort(items, activeId, overId); 
             }
             return moveNodeBetweenParents(items, activeId, activeParentId, targetParentId, overId);
        });
    }
  };

  const moveNodeBetweenParents = (nodes: SequenceNode[], nodeId: string, sourceParentId: string, targetParentId: string, overId: string): SequenceNode[] => {
      let nodeToMove: SequenceNode | null = null;
      const removeNode = (list: SequenceNode[]): SequenceNode[] => {
          const newList = [];
          for (const item of list) {
              if (item.id === nodeId) { nodeToMove = item; continue; }
              if (item.children.length > 0) {
                  const newChildren = removeNode(item.children);
                  if (newChildren !== item.children) { newList.push({ ...item, children: newChildren }); continue; }
              }
              newList.push(item);
          }
          return newList;
      };
      const treeWithoutNode = removeNode(nodes);
      if (!nodeToMove) return nodes; 
      const insertNode = (list: SequenceNode[], isRoot: boolean): SequenceNode[] => {
          if (targetParentId === 'root' && isRoot) {
              const newRoot = [...list];
              const overIndex = newRoot.findIndex(n => n.id === overId);
              if (overIndex !== -1) newRoot.splice(overIndex, 0, nodeToMove!);
              else newRoot.push(nodeToMove!);
              return newRoot;
          }
          return list.map(item => {
               if (item.id === targetParentId) {
                   const newChildren = [...item.children];
                   const overIndex = newChildren.findIndex(n => n.id === overId);
                   if (overIndex !== -1) newChildren.splice(overIndex, 0, nodeToMove!);
                   else newChildren.push(nodeToMove!);
                   return { ...item, children: newChildren };
               }
               if (item.children.length > 0) return { ...item, children: insertNode(item.children, false) };
               return item;
          });
      };
      return insertNode(treeWithoutNode, true);
  };

  const addNodeToContainer = (nodes: SequenceNode[], targetId: string, newNode: SequenceNode): SequenceNode[] => {
      return nodes.map(node => {
          if (node.id === targetId) return { ...node, children: [...node.children, newNode] };
          if (node.children.length > 0) return { ...node, children: addNodeToContainer(node.children, targetId, newNode) };
          return node;
      });
  };

  const recursiveSort = (nodes: SequenceNode[], activeId: string, overId: string): SequenceNode[] => {
     return nodes.map(node => {
         const activeIndex = node.children.findIndex(c => c.id === activeId);
         const overIndex = node.children.findIndex(c => c.id === overId);
         if (activeIndex !== -1 && overIndex !== -1) return { ...node, children: arrayMove(node.children, activeIndex, overIndex) };
         if (node.children.length > 0) return { ...node, children: recursiveSort(node.children, activeId, overId) };
         return node;
     });
  };

  const removeNode = (id: string) => {
      const recursiveFilter = (nodes: SequenceNode[]): SequenceNode[] => {
          return nodes.filter(n => n.id !== id).map(n => ({ ...n, children: recursiveFilter(n.children) }));
      };
      setTree(prev => recursiveFilter(prev));
  };

  const updateNodeData = (id: string, data: any) => {
      const recursiveUpdate = (nodes: SequenceNode[]): SequenceNode[] => {
          return nodes.map(n => {
              if (n.id === id) return { ...n, data: { ...n.data, ...data } };
              return { ...n, children: recursiveUpdate(n.children) };
          });
      };
      setTree(prev => recursiveUpdate(prev));
  };

  const addBlock = (type: 'combo' | 'condition' | 'divider') => {
      if (type === 'condition') {
          const initialCondition: SequenceNode = { id: `cond-${Date.now()}`, type: 'condition', data: {}, children: [] };
          const chainNode: SequenceNode = { id: `chain-${Date.now()}`, type: 'logic_chain', children: [initialCondition] };
          setTree(prev => [...prev, chainNode]);
      } else {
          const newNode: SequenceNode = { id: `block-${Date.now()}`, type, data: {}, children: [] };
          setTree(prev => [...prev, newNode]);
      }
  };

  const handleAddLogicSibling = (nodeId: string) => {
      const newSibling: SequenceNode = { id: `cond-${Date.now()}`, type: 'condition', data: {}, children: [] };
      const recursiveAdd = (nodes: SequenceNode[]): SequenceNode[] => {
          return nodes.map(node => {
              if (node.type === 'logic_chain') {
                  const childExists = node.children.some(c => c.id === nodeId);
                  if (childExists) return { ...node, children: [...node.children, newSibling] };
              }
              if (node.children.length > 0) return { ...node, children: recursiveAdd(node.children) };
              return node;
          });
      };
      setTree(prev => recursiveAdd(prev));
  };

  const updateLog = (newLogs: LogEntry[]) => {
      setLogs(newLogs);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Modal isOpen={activeModal === 'CHAR_SELECT'} onClose={closeModal} title="Добавить участника">
            <div className="flex flex-col gap-3 mb-4">
                <div className="relative group">
                    <input type="text" placeholder="ПОИСК ПО ИМЕНИ..." value={charSearchTerm} onChange={(e) => setCharSearchTerm(e.target.value)} className="w-full bg-[#0b0d12] border border-violet-900/40 rounded pl-9 pr-2 py-2 text-sm text-white focus:border-violet-500 focus:shadow-glow outline-none transition-all placeholder-slate-600 font-sans" />
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400" />
                </div>
                <div className="flex gap-2">
                    <div className="flex-1 relative group">
                        <Filter size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-violet-400"/>
                        <select value={selectedFaction} onChange={(e) => { setSelectedFaction(e.target.value); setSelectedVolume('All'); }} className="w-full bg-[#0b0d12] border border-violet-900/40 rounded pl-8 pr-2 py-1.5 text-xs text-white appearance-none outline-none focus:border-violet-500 focus:shadow-glow transition-all">
                            <option value="All" className="bg-[#0b0d12] text-slate-300">ВСЕ ФРАКЦИИ</option>
                            {uniqueFactions.map(f => <option key={f} value={f} className="bg-[#0b0d12] text-slate-300">{f.toUpperCase()}</option>)}
                        </select>
                    </div>
                    {['NPC', 'НПС', 'Бестиарий'].includes(selectedFaction) && (
                         <div className="flex-1 relative animate-in fade-in slide-in-from-left-2 duration-300 group">
                             <Filter size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-violet-400"/>
                             <select value={selectedVolume} onChange={(e) => setSelectedVolume(e.target.value)} className="w-full bg-[#0b0d12] border border-violet-900/40 rounded pl-8 pr-2 py-1.5 text-xs text-white appearance-none outline-none focus:border-violet-500 focus:shadow-glow transition-all">
                                 <option value="All" className="bg-[#0b0d12] text-slate-300">ВСЕ ТОМА</option>
                                 {uniqueVolumes.map(v => <option key={v} value={v} className="bg-[#0b0d12] text-slate-300">{v.toUpperCase()}</option>)}
                             </select>
                         </div>
                    )}
                </div>
            </div>
            {filteredCharacters.length === 0 ? <div className="text-slate-500 italic text-center py-8 font-rune">Персонажи не найдены</div> : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {filteredCharacters.map(c => (
                        <button key={c.id} onClick={() => addParticipant(c)} className={`w-full text-left p-3 rounded border flex justify-between items-center transition-all duration-300 hover:shadow-glow ${getCharacterStyle(c.profile.faction)}`}>
                            <div>
                                <div className="font-bold font-rune">{c.profile.name}</div>
                                <div className="text-[10px] flex gap-2 mt-0.5"><span className="font-bold tracking-wide uppercase opacity-90">{c.profile.faction}</span>{['NPC', 'НПС', 'Бестиарий'].includes(c.profile.faction) && c.profile.npc_volume && <span className="font-bold text-yellow-100 opacity-90 border-l border-white/20 pl-2">{c.profile.npc_volume}</span>}</div>
                            </div>
                            <div className="text-right opacity-80"><div className="text-xs font-mono">STR: {c.stats.phys}</div><div className="text-[10px] font-mono">LVL {c.profile.level}</div></div>
                        </button>
                    ))}
                </div>
            )}
        </Modal>

        <Modal isOpen={activeModal === 'BATTLE_LIST'} onClose={closeModal} title={isAdmin ? "Архив Боев" : "Локальные Сохранения"} footer={<button onClick={handleCreateBattleClick} className="w-full py-2 bg-violet-900/50 border border-violet-500/50 text-white rounded font-bold hover:bg-violet-800 hover:shadow-glow transition-all uppercase font-rune tracking-widest">Создать новую симуляцию</button>}>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {savedBattles.length === 0 && <div className="text-center text-slate-500 py-4 italic">Нет сохраненных боев</div>}
                {savedBattles.map(b => (
                    <div key={b.id} className="w-full flex items-center justify-between p-3 bg-panel hover:bg-slate-900 border border-violet-900/30 hover:border-violet-500/50 rounded group mb-2 transition-all">
                        <button onClick={() => loadBattle(b.id, b.source)} className="flex-1 text-left flex justify-between items-center">
                            <div className="text-violet-100 font-bold font-rune flex items-center gap-2">{b.name || 'Бой без названия'}{b.source === 'local' ? <span title="Локально"><HardDrive size={12} className="text-yellow-500" /></span> : <span title="В облаке"><Cloud size={12} className="text-emerald-500" /></span>}</div>
                            <div className="flex items-center gap-2"><span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${b.status === 'active' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800' : b.status === 'finished' ? 'bg-red-900/40 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>{getStatusLabel(b.status)}</span></div>
                        </button>
                        <button onClick={(e) => handleDeleteBattle(b.id, b.source, e)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/10 rounded transition-colors" title="Удалить бой"><Trash2 size={16} /></button>
                    </div>
                ))}
            </div>
        </Modal>

        <Modal isOpen={activeModal === 'CONFIRM_DELETE'} onClose={cancelDelete} title="Подтверждение Удаления" footer={<><button onClick={cancelDelete} className="px-4 py-2 text-slate-400 hover:text-white font-rune uppercase">Отмена</button><button onClick={confirmDeleteBattle} className="px-4 py-2 bg-red-900/50 border border-red-500/50 text-white rounded hover:bg-red-800 hover:shadow-glow-red font-bold font-rune uppercase">Уничтожить данные</button></>}>
            <p className="text-red-300 font-sans">{battleToDelete?.source === 'server' ? "Вы инициировали протокол удаления. Данные боевой симуляции будут утрачены из БД безвозвратно. Подтвердить?" : "Удалить локальное сохранение этого боя? Восстановить будет невозможно."}</p>
        </Modal>

        <Modal isOpen={activeModal === 'CREATE_BATTLE'} onClose={closeModal} title="Новая Симуляция" footer={<button onClick={confirmCreateBattle} className="px-4 py-2 bg-violet-900/50 border border-violet-500/50 text-white rounded hover:bg-violet-800 hover:shadow-glow font-bold font-rune uppercase">Инициализация</button>}>
            <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-400 font-rune uppercase tracking-wider">Кодовое название</label>
                <input type="text" value={modalInput} onChange={(e) => setModalInput(e.target.value)} placeholder="Напр. Инцидент Омега-7" className="bg-[#0b0d12] border border-violet-900/40 p-2 rounded text-white focus:border-violet-500 focus:shadow-glow outline-none transition-all font-sans" autoFocus />
                {isAdmin && <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">Источник: {storageMode === 'server' ? <Cloud size={10} className="text-emerald-500"/> : <HardDrive size={10} className="text-yellow-500"/>} {storageMode === 'server' ? "База Данных" : "Локальное Хранилище"}</div>}
            </div>
        </Modal>

        <Modal isOpen={activeModal === 'CONFIRM_SAVE'} onClose={closeModal} title="Сохранение Данных" footer={<><button onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-white font-rune uppercase">Отмена</button><button onClick={pendingAction} className="px-4 py-2 bg-emerald-900/50 border border-emerald-500/50 text-white rounded hover:bg-emerald-800 hover:shadow-glow font-bold font-rune uppercase">Понятно</button></>}>
            <p className="font-sans">Текущая симуляция не сохранена. Пожалуйста, используйте кнопку создания для инициализации.</p>
        </Modal>

        <Modal isOpen={activeModal === 'CONFIRM_END'} onClose={closeModal} title="Завершение Протокола" footer={<><button onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-white font-rune uppercase">Отмена</button><button onClick={confirmEndBattle} className="px-4 py-2 bg-red-900/50 border border-red-500/50 text-white rounded hover:bg-red-800 hover:shadow-glow-red font-bold font-rune uppercase">Завершить Симуляцию</button></>}>
            <p className="text-red-400 font-sans">Внимание: Статус боя будет изменен на ЗАВЕРШЕН. Редактирование будет ограничено.</p>
        </Modal>

        <Modal isOpen={activeModal === 'FINALIZE_BATTLE'} onClose={closeModal} title="Финализация и Травмы" footer={<><button onClick={closeModal} className="px-4 py-2 text-slate-400 hover:text-white font-rune uppercase">Отмена</button><button onClick={finalizeBattle} className="px-4 py-2 bg-red-900/50 border border-red-500/50 text-white rounded hover:bg-red-800 hover:shadow-glow-red font-bold font-rune uppercase">{loading ? 'Обработка...' : 'Применить Последствия'}</button></>}>
            <div className="space-y-4 font-sans">
                <p className="text-sm text-slate-300">{isAdmin ? "Симуляция завершена. Отметьте субъектов, чьи повреждения должны быть перманентно сохранены в БД." : "Симуляция завершена. Внимание: Вы не администратор, травмы НЕ будут записаны в базу данных персонажей."}</p>
                {isAdmin && (
                    <div className="bg-[#0b0d12] border border-violet-900/30 rounded p-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {participants.filter(p => p.medcard.injuries.length > 0).length === 0 ? (<div className="text-slate-500 italic text-center p-2">Нет критических повреждений для регистрации.</div>) : (participants.filter(p => p.medcard.injuries.length > 0).map(p => (<div key={p.instance_id} className={`flex items-center justify-between p-2 rounded mb-1 cursor-pointer border transition-all ${participantsToSave.has(p.instance_id) ? 'bg-red-900/20 border-red-500/50 shadow-glow-red' : 'bg-panel border-violet-900/20 opacity-60'}`} onClick={() => handleToggleSaveParticipant(p.instance_id)}><div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border flex items-center justify-center ${participantsToSave.has(p.instance_id) ? 'bg-red-600 border-red-400' : 'border-slate-600'}`}>{participantsToSave.has(p.instance_id) && <span className="text-white text-xs font-bold">✓</span>}</div><span className="font-bold text-sm font-rune">{p.profile.name}</span></div><div className="text-xs text-red-300 font-mono">{p.medcard.injuries.length} РАН</div></div>)))}
                    </div>
                )}
            </div>
        </Modal>

        <Modal isOpen={activeModal === 'ALERT'} onClose={closeModal} title="Системное Сообщение" footer={<button onClick={closeModal} className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 font-rune uppercase">Принято</button>}>
            <p className="font-sans">{alertMessage}</p>
        </Modal>

        <div className="h-screen w-full bg-slate-950 text-slate-300 font-sans p-4 flex flex-col overflow-hidden box-border relative">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 opacity-60" style={{ backgroundImage: `url('https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/battle_bg.jpg')` }}></div>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/60 to-slate-950/80 pointer-events-none z-0"></div>
            <header className="mb-4 flex items-center justify-between bg-slate-900/90 backdrop-blur-md p-4 rounded-lg border border-violet-900/30 shadow-lg relative overflow-hidden group shrink-0 h-20 z-10">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-900/10 to-transparent opacity-50 pointer-events-none"></div>
                <div className="flex items-center gap-4 relative z-10">
                     <button onClick={() => setActiveModal('BATTLE_LIST')} className="p-2 bg-slate-900 hover:bg-violet-900/40 rounded border border-violet-900/50 text-violet-300 hover:text-white transition-all hover:shadow-glow" title="Архив"><List size={18} /></button>
                     <button onClick={handleSaveBattle} className="p-2 bg-slate-900 hover:bg-emerald-900/40 rounded border border-violet-900/50 text-violet-300 hover:text-emerald-300 hover:border-emerald-500/50 transition-all hover:shadow-glow" title="Сохранить"><Save size={18} /></button>
                     {isAdmin && (
                         <div className="flex items-center bg-black/40 rounded-lg p-1 border border-violet-900/30">
                             <button onClick={() => setStorageMode('local')} className={`p-1.5 rounded transition-all ${storageMode === 'local' ? 'bg-yellow-900/40 text-yellow-400 shadow-glow-gold' : 'text-slate-600 hover:text-slate-400'}`} title="Локальное Хранилище"><HardDrive size={14} /></button>
                             <div className="w-px h-4 bg-white/10 mx-1"></div>
                             <button onClick={() => setStorageMode('server')} className={`p-1.5 rounded transition-all ${storageMode === 'server' ? 'bg-violet-900/60 text-emerald-400 shadow-glow' : 'text-slate-600 hover:text-slate-400'}`} title="Серверная База Данных"><Database size={14} /></button>
                         </div>
                     )}
                     <div>
                         <input value={battleName} onChange={(e) => updateBattleName(e.target.value)} className="bg-transparent text-xl font-bold font-rune text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 outline-none border-b border-transparent hover:border-violet-500/50 focus:border-violet-500 transition-all w-64 uppercase tracking-widest placeholder-violet-900" />
                         <div className="text-xs text-slate-500 flex items-center gap-2 font-mono mt-1"><span>СТАТУС:</span><span className={`uppercase font-bold tracking-wider ${status === 'active' ? 'text-emerald-400 shadow-emerald-500/20 drop-shadow-sm' : status === 'finished' ? 'text-red-500' : 'text-amber-400'}`}>{getStatusLabel(status)}</span>{!isAdmin && <span className="ml-2 text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">Локальный режим</span>}</div>
                     </div>
                </div>
                <div className="flex items-center gap-6 relative z-10">
                     <div className="text-right mr-4"><div className="text-[10px] text-violet-400 uppercase tracking-[0.2em] font-bold">Раунд</div><div className="font-bold text-3xl font-rune text-white drop-shadow-md">{round}</div></div>
                     {status !== 'finished' && (
                         <><button onClick={handleNextRound} className="flex items-center gap-2 bg-slate-900 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 hover:border-emerald-500/50 px-5 py-2 rounded-sm font-bold font-rune uppercase text-xs tracking-widest transition-all hover:shadow-glow"><Play size={14} fill="currentColor" /> {round === 0 ? "НАЧАТЬ БОЙ" : "След. Раунд"}</button><button onClick={handleEndBattleClick} className="flex items-center gap-2 bg-slate-900 hover:bg-red-900/30 text-red-400 border border-red-900/50 hover:border-red-500/50 px-5 py-2 rounded-sm font-bold font-rune uppercase text-xs tracking-widest transition-all hover:shadow-glow-red"><Square size={14} fill="currentColor" /> Завершить</button></>
                     )}
                </div>
            </header>
            <main className="flex-1 min-h-0 grid grid-cols-1 min-[1150px]:grid-cols-12 gap-4 relative z-10">
                <div className="col-span-12 min-[1150px]:col-span-3 h-full flex flex-col min-h-0 bg-slate-900/85 backdrop-blur-sm border border-violet-900/20 rounded-lg overflow-hidden">
                     <div className="flex items-center justify-between p-3 border-b border-violet-900/30 bg-[#020408]/50 shrink-0"><h2 className="text-xs font-bold text-violet-400 uppercase tracking-widest font-rune">Участники</h2><button onClick={() => setActiveModal('CHAR_SELECT')} className="text-violet-400 hover:text-white transition-all"><UserPlus size={18} /></button></div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                        <SourcePanel participants={participants} onToggleEquip={handleToggleEquip} onRemoveParticipant={handleRemoveParticipant} onAddInjury={handleAddInjury} onRemoveInjury={handleRemoveInjury} onAddDebuff={handleAddDebuff} onRemoveEffect={handleRemoveEffect} onRemoveCooldown={handleRemoveCooldown} onUpdateParticipant={handleUpdateParticipant} />
                     </div>
                </div>
                <div className="col-span-12 min-[1150px]:col-span-6 h-full flex flex-col gap-3 min-h-0">
                     <div className="flex-1 relative border border-violet-900/20 rounded bg-slate-900/80 backdrop-blur-sm h-full overflow-hidden flex flex-col"><div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-violet-800/30 pointer-events-none"></div><div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-violet-800/30 pointer-events-none"></div><SequenceCanvas tree={tree} participants={participants} onRemove={removeNode} onUpdateData={updateNodeData} onAddCombo={() => addBlock('combo')} onAddCondition={() => addBlock('condition')} onAddDivider={() => addBlock('divider')} onClear={() => setTree([])} onAddLogicSibling={handleAddLogicSibling} onCommit={handleCommit} /></div>
                </div>
                <div className="col-span-12 min-[1150px]:col-span-3 h-full flex flex-col min-h-0">
                     <BattleLog logs={logs} currentRound={round} participants={participants} onUpdateLogs={updateLog} onUpdateParticipant={handleUpdateParticipant} onRollback={handleRollback} />
                </div>
            </main>
        </div>
        <DragOverlay>{activeDragItem && activeDragItem.type === 'SOURCE_ABILITY' ? <div className="bg-violet-900/90 border border-violet-400 text-white px-3 py-1.5 rounded shadow-glow opacity-90 cursor-grabbing font-bold text-sm font-rune tracking-wide backdrop-blur-sm">+ Бросить способность</div> : null}{activeNode ? <div className="bg-panel border border-violet-500 rounded p-2 shadow-2xl opacity-80 rotate-2 w-48 backdrop-blur-md"><div className="h-4 bg-violet-900/50 rounded w-3/4 mb-2 animate-pulse"></div></div> : null}</DragOverlay>
    </DndContext>
  );
}

export default App;
