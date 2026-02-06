import React, { useState } from 'react';
import { JsonOutput, Group, Item } from '../types';
import { Plus, Trash2, ArrowRightLeft, User, Layers, Pencil, Check, X } from 'lucide-react';

interface Props {
  data: JsonOutput;
  onUpdate: (newData: JsonOutput) => void;
}

export const StructureEditor: React.FC<Props> = ({ data, onUpdate }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'passive' | 'active'>('active');

  // Renaming state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  // Helper to deep update data
  const updateData = (fn: (d: JsonOutput) => void) => {
    const copy = JSON.parse(JSON.stringify(data));
    fn(copy);
    onUpdate(copy);
  };

  const handleProfileChange = (field: keyof typeof data.profile, value: any) => {
    updateData((d) => {
      // @ts-ignore
      d.profile[field] = value;
    });
  };

  const handleStatChange = (field: keyof typeof data.stats, value: number) => {
    updateData((d) => {
      d.stats[field] = value;
    });
  };

  const createGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: Group = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGroupName,
      group_name: newGroupName,
      items: [],
      tags: [],
      is_flaw_group: false,
      type: newGroupType,
      abilities: []
    };

    updateData((d) => {
      if (newGroupType === 'passive') d.passives.push(newGroup);
      else d.ability_groups.push(newGroup);
    });
    setNewGroupName('');
  };

  const deleteGroup = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this group and all its items?")) return;
    updateData((d) => {
      d.passives = d.passives.filter(g => g.id !== id);
      d.ability_groups = d.ability_groups.filter(g => g.id !== id);
    });
  };

  const startEditing = (group: Group | any) => { // Type 'any' used here temporarily as the combined group type in map is synthetic
    setEditingGroupId(group.id);
    setTempName(group.name);
  };

  const cancelEditing = () => {
    setEditingGroupId(null);
    setTempName('');
  };

  const saveGroupName = () => {
    if (!editingGroupId || !tempName.trim()) return;
    updateData((d) => {
      let group = d.passives.find(g => g.id === editingGroupId);
      if (!group) group = d.ability_groups.find(g => g.id === editingGroupId);
      
      if (group) {
        group.name = tempName;
        group.group_name = tempName;
      }
    });
    setEditingGroupId(null);
    setTempName('');
  };

  const moveItem = (itemId: string, sourceGroupId: string, targetGroupId: string, itemIdx: number) => {
    if (sourceGroupId === targetGroupId) return;

    updateData((d) => {
      // Find source group
      const allGroups = [...d.passives, ...d.ability_groups];
      const sourceGroup = allGroups.find(g => g.id === sourceGroupId);
      const targetGroup = allGroups.find(g => g.id === targetGroupId);

      if (!sourceGroup || !targetGroup) return;

      // Extract item
      const itemToMove = sourceGroup.items[itemIdx];
      
      // Remove from source
      sourceGroup.items.splice(itemIdx, 1);
      if (sourceGroup.abilities) sourceGroup.abilities.splice(itemIdx, 1);

      // Add to target
      targetGroup.items.push(itemToMove);
      if (!targetGroup.abilities) targetGroup.abilities = [];
      targetGroup.abilities.push(itemToMove);
    });
  };

  // Combine lists for the dropdown
  const allGroups = [...data.passives, ...data.ability_groups].map(g => ({
    id: g.id,
    name: g.name,
    type: g.type || (data.passives.find(p => p.id === g.id) ? 'passive' : 'active')
  }));

  return (
    <div className="flex flex-col gap-6 w-full h-full overflow-hidden">
      
      {/* 1. Global Stats & Profile Editor */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4 text-slate-300">
          <User size={18} />
          <h3 className="font-semibold text-sm uppercase tracking-wider">Profile & Stats</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Name</label>
            <input 
              type="text" 
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
              value={data.profile.name}
              onChange={(e) => handleProfileChange('name', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Faction</label>
            <select 
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
              value={data.profile.faction}
              onChange={(e) => handleProfileChange('faction', e.target.value)}
            >
              <option value="Свет">Light (Свет)</option>
              <option value="Тьма">Dark (Тьма)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Level</label>
            <input 
              type="number" min="1" max="10"
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
              value={data.profile.level}
              onChange={(e) => handleProfileChange('level', parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-800">
           <div>
            <label className="text-xs text-slate-500 block mb-1">Physical</label>
            <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-emerald-400 font-bold"
              value={data.stats.phys} onChange={(e) => handleStatChange('phys', parseInt(e.target.value)||0)} />
           </div>
           <div>
            <label className="text-xs text-slate-500 block mb-1">Magic</label>
            <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-blue-400 font-bold"
              value={data.stats.magic} onChange={(e) => handleStatChange('magic', parseInt(e.target.value)||0)} />
           </div>
           <div>
            <label className="text-xs text-slate-500 block mb-1">Unique</label>
            <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-purple-400 font-bold"
              value={data.stats.unique} onChange={(e) => handleStatChange('unique', parseInt(e.target.value)||0)} />
           </div>
        </div>
      </div>

      {/* 2. Group & Ability Manager */}
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Layers size={18} />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Abilities Manager</h3>
          </div>
          
          {/* Create Group Control */}
          <div className="flex gap-2">
            <select 
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              value={newGroupType}
              onChange={(e) => setNewGroupType(e.target.value as any)}
            >
              <option value="passive">Passive</option>
              <option value="active">Active</option>
            </select>
            <input 
              type="text" 
              placeholder="New Group Name"
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white w-32"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <button 
              onClick={createGroup}
              className="p-1 bg-green-600 rounded hover:bg-green-500 text-white"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {allGroups.length === 0 && (
             <div className="text-center text-slate-500 py-10">No abilities parsed. Paste HTML first.</div>
          )}

          {allGroups.map((group) => {
             // Re-fetch group from fresh data to capture items
             const isPassive = group.type === 'passive';
             const realGroup = isPassive 
                ? data.passives.find(g => g.id === group.id) 
                : data.ability_groups.find(g => g.id === group.id);
             
             if (!realGroup) return null;

             const isEditing = editingGroupId === realGroup.id;

             return (
               <div key={realGroup.id} className="border border-slate-800 rounded-md overflow-hidden group/container">
                  <div className={`px-3 py-2 ${isPassive ? 'bg-slate-800/50 border-l-4 border-l-blue-500' : 'bg-slate-800/50 border-l-4 border-l-orange-500'} flex justify-between items-center group/header`}>
                     <div className="flex items-center gap-2 flex-1">
                        {isEditing ? (
                            <div className="flex items-center gap-1 w-full mr-2">
                                <input 
                                    className="bg-slate-950 border border-slate-600 rounded px-1 py-0.5 text-sm text-white flex-1 min-w-0"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => { if(e.key === 'Enter') saveGroupName(); if(e.key === 'Escape') cancelEditing(); }}
                                />
                                <button onClick={saveGroupName} className="text-green-400 hover:text-green-300 p-0.5"><Check size={14}/></button>
                                <button onClick={cancelEditing} className="text-red-400 hover:text-red-300 p-0.5"><X size={14}/></button>
                            </div>
                        ) : (
                            <>
                                <span className="font-semibold text-slate-200 text-sm">
                                {realGroup.name} <span className="text-xs text-slate-500 font-normal">({isPassive ? 'Passive' : 'Active'})</span>
                                </span>
                                
                                <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity ml-2">
                                    <button 
                                        onClick={() => startEditing(realGroup)} 
                                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700"
                                        title="Rename Group"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                    <button 
                                        onClick={() => deleteGroup(realGroup.id)} 
                                        className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-700"
                                        title="Delete Group"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </>
                        )}
                     </div>
                     {!isEditing && <span className="text-xs text-slate-500 whitespace-nowrap">{realGroup.items.length} items</span>}
                  </div>
                  
                  <div className="divide-y divide-slate-800 bg-slate-900/30">
                    {realGroup.items.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between gap-4 group hover:bg-slate-800 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-300 truncate">{item.name}</div>
                          <div className="text-xs text-slate-500 truncate">{item.desc_mech.substring(0, 50)}...</div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                           <ArrowRightLeft size={14} className="text-slate-600" />
                           <select 
                             className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-400 max-w-[120px]"
                             value={realGroup.id}
                             onChange={(e) => moveItem(item.name, realGroup.id, e.target.value, idx)}
                           >
                             {allGroups.map(targetG => (
                               <option key={targetG.id} value={targetG.id}>
                                 {targetG.name.substring(0, 15)}
                               </option>
                             ))}
                           </select>
                        </div>
                      </div>
                    ))}
                    {realGroup.items.length === 0 && (
                      <div className="p-2 text-xs text-slate-600 italic text-center">Empty group</div>
                    )}
                  </div>
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};