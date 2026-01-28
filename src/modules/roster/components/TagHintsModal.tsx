
import React, { useState, useEffect, useMemo } from 'react';
import { BattleTag } from '../types';
import { getBattleTags, saveBattleTag, deleteBattleTag } from '../utils/supabaseService';
import { Modal } from '../../lore/components/Modal';
import { Search, Plus, Trash2, Tag, Save, X, Edit2 } from 'lucide-react';
import { useDialect } from '../dialect_module/DialectContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    isAdmin?: boolean;
}

export const TagHintsModal: React.FC<Props> = ({ isOpen, onClose, isAdmin }) => {
    const [tags, setTags] = useState<BattleTag[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingTag, setEditingTag] = useState<BattleTag | null>(null);
    const [newTag, setNewTag] = useState<BattleTag>({ tag: '', description: '' });
    const { t } = useDialect();

    useEffect(() => {
        if (isOpen) {
            loadTags();
        }
    }, [isOpen]);

    const loadTags = async () => {
        setLoading(true);
        const data = await getBattleTags();
        setTags(data);
        setLoading(false);
    };

    const filteredTags = useMemo(() => {
        if (!searchTerm) return tags;
        const lower = searchTerm.toLowerCase();
        return tags.filter(t => t.tag.toLowerCase().includes(lower) || t.description.toLowerCase().includes(lower));
    }, [tags, searchTerm]);

    const handleSave = async (tagData: BattleTag) => {
        if (!tagData.tag) return;
        
        // Optimistic update
        const isUpdate = tags.some(t => t.tag === tagData.tag);
        if (isUpdate) {
            setTags(prev => prev.map(t => t.tag === tagData.tag ? tagData : t));
        } else {
            setTags(prev => [...prev, tagData].sort((a, b) => a.tag.localeCompare(b.tag)));
        }

        try {
            await saveBattleTag(tagData);
            setEditingTag(null);
            setNewTag({ tag: '', description: '' });
        } catch (e) {
            console.error("Failed to save tag", e);
            loadTags(); // Revert
        }
    };

    const handleDelete = async (tag: string) => {
        if (!confirm(`Удалить тег "${tag}"?`)) return;
        
        setTags(prev => prev.filter(t => t.tag !== tag));
        try {
            await deleteBattleTag(tag);
        } catch (e) {
            console.error("Failed to delete tag", e);
            loadTags();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('lbl_tag_hints', "Справочник Тегов")} size="lg">
            <div className="flex flex-col h-[70vh]">
                {/* Search & Add */}
                <div className="flex gap-2 mb-4 shrink-0">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                            className="w-full bg-[#0b0d12] border border-violet-900/40 rounded pl-9 pr-2 py-2 text-sm text-white focus:border-violet-500 outline-none placeholder-slate-600 font-sans"
                            placeholder="Поиск тегов..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Add New (Admin Only) */}
                {isAdmin && (
                    <div className="bg-slate-900/50 p-3 rounded border border-violet-900/30 mb-4 shrink-0 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                        <input 
                            placeholder="Новый тег (напр. fire)" 
                            className="bg-[#0b0d12] border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            value={newTag.tag}
                            onChange={e => setNewTag({...newTag, tag: e.target.value.toLowerCase()})}
                        />
                        <input 
                            placeholder="Описание эффекта..." 
                            className="bg-[#0b0d12] border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            value={newTag.description}
                            onChange={e => setNewTag({...newTag, description: e.target.value})}
                        />
                        <button 
                            onClick={() => handleSave(newTag)}
                            disabled={!newTag.tag}
                            className="bg-violet-700 hover:bg-violet-600 text-white text-xs font-bold uppercase py-1.5 rounded flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Plus size={14} /> Добавить
                        </button>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {loading ? (
                        <div className="text-center text-slate-500 py-10">Загрузка словаря...</div>
                    ) : filteredTags.length === 0 ? (
                        <div className="text-center text-slate-500 py-10 italic">Теги не найдены.</div>
                    ) : (
                        filteredTags.map(item => (
                            <div key={item.tag} className="group bg-slate-900/30 border border-slate-800 hover:border-violet-500/30 p-3 rounded transition-all flex flex-col gap-1">
                                <div className="flex justify-between items-start">
                                    <span className="font-mono text-violet-300 font-bold bg-violet-900/20 px-2 rounded text-sm">{item.tag}</span>
                                    {isAdmin && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingTag(item)} className="p-1 text-slate-500 hover:text-white"><Edit2 size={12} /></button>
                                            <button onClick={() => handleDelete(item.tag)} className="p-1 text-slate-500 hover:text-red-500"><Trash2 size={12} /></button>
                                        </div>
                                    )}
                                </div>
                                
                                {editingTag?.tag === item.tag ? (
                                    <div className="flex gap-2 mt-2 animate-fadeIn">
                                        <input 
                                            className="flex-1 bg-black/40 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                                            value={editingTag.description}
                                            onChange={e => setEditingTag({...editingTag, description: e.target.value})}
                                            autoFocus
                                        />
                                        <button onClick={() => handleSave(editingTag)} className="text-green-400 hover:text-green-300"><Save size={16} /></button>
                                        <button onClick={() => setEditingTag(null)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 leading-relaxed pl-1">{item.description}</p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
};
