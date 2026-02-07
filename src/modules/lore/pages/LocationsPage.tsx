
import React, { useState, useMemo } from 'react';
import { useLocations } from '../hooks/useLocations';
import { useMaps } from '../hooks/useMaps';
import { MapPin, Plus, Trash2, ChevronRight, ChevronDown, FolderOpen, Folder, X, Edit2, CornerUpLeft, Map as MapIcon } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Location } from '../types';

interface LocationsPageProps {
    isAdmin: boolean;
    onNavigateToMap: (mapId: string) => void;
}

// --- Helpers ---

const MagicalInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`w-full bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 placeholder-violet-900/40 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.3)] outline-none transition-all duration-300 backdrop-blur-sm ${props.className}`} />
);

const MagicalTextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} className={`w-full bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 placeholder-violet-900/40 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.3)] outline-none transition-all duration-300 backdrop-blur-sm resize-none ${props.className}`} />
);

// --- Tree Logic ---

export interface LocationNode extends Location {
    children: LocationNode[];
}

export const buildLocationTree = (locations: Location[]): LocationNode[] => {
    const map = new Map<string, LocationNode>();
    const roots: LocationNode[] = [];
    
    locations.forEach(loc => map.set(loc.id, { ...loc, children: [] }));
    
    locations.forEach(loc => {
        const node = map.get(loc.id);
        if (node) {
            if (loc.parent && map.has(loc.parent)) {
                map.get(loc.parent)!.children.push(node);
            } else {
                roots.push(node);
            }
        }
    });
    
    return roots;
};

// --- Components ---

interface LocationTreeItemProps {
    node: LocationNode;
    level: number;
    onSelect: (id: string) => void;
    selectedId: string | null;
}

export const LocationTreeItem: React.FC<LocationTreeItemProps> = ({ node, level, onSelect, selectedId }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedId === node.id;

    return (
        <div className="select-none">
            <div 
                className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-all border ${isSelected ? 'bg-violet-900/30 border-violet-500/30 text-white' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                style={{ marginLeft: `${level * 12}px` }}
                onClick={() => onSelect(node.id)}
            >
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className={`p-0.5 hover:text-white ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                {hasChildren ? <FolderOpen size={14} className={isSelected ? "text-violet-400" : "text-slate-600"} /> : <MapPin size={14} className={isSelected ? "text-violet-400" : "text-slate-600"} />}
                <span className="text-xs font-fantasy tracking-wide truncate">{node.name}</span>
            </div>
            {isExpanded && hasChildren && (
                <div>
                    {node.children.map(child => (
                        <LocationTreeItem 
                            key={child.id} 
                            node={child} 
                            level={level + 1}
                            onSelect={onSelect} 
                            selectedId={selectedId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface LocationReaderProps {
    location: Location;
    parentName?: string;
    subLocations: Location[];
    onClose: () => void;
    onOpenSubLocation: (loc: Location) => void;
    onOpenMap: (mapId: string) => void;
}

export const LocationReader: React.FC<LocationReaderProps> = ({ location, parentName, subLocations, onClose, onOpenSubLocation, onOpenMap }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fadeIn" onClick={onClose}>
            <div 
                className="relative w-full max-w-4xl max-h-[85vh] flex flex-col md:flex-row bg-[#0b0d12] border border-violet-900/30 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.15)]"
                onClick={e => e.stopPropagation()}
            >
                {/* Image Section */}
                <div className="w-full md:w-1/3 relative h-48 md:h-auto bg-black shrink-0">
                    {location.img ? (
                        <img src={location.img} alt={location.name} className="w-full h-full object-cover opacity-80" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-900">
                            <MapPin size={48} />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] to-transparent md:bg-gradient-to-r"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                        {parentName && <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><CornerUpLeft size={10} /> {parentName}</div>}
                        <h2 className="text-2xl font-fantasy font-bold text-white leading-tight drop-shadow-lg break-words">{location.name}</h2>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10 p-1 bg-black/20 rounded-full"><X size={24} /></button>
                    
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        <div className="prose prose-invert prose-sm max-w-none text-slate-300 font-serif leading-relaxed mb-6 whitespace-pre-wrap break-words">
                            {location.description}
                        </div>

                        {location.associated_map_id && (
                            <button 
                                onClick={() => onOpenMap(location.associated_map_id!)}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-900/20 text-violet-300 border border-violet-500/30 rounded hover:bg-violet-900/40 transition-all w-full md:w-auto mb-6"
                            >
                                <MapIcon size={16} /> Открыть карту местности
                            </button>
                        )}

                        {subLocations.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-3 border-b border-slate-800 pb-1">Локации внутри</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {subLocations.map(sub => (
                                        <button 
                                            key={sub.id} 
                                            onClick={() => onOpenSubLocation(sub)}
                                            className="flex items-center gap-3 p-2 rounded bg-slate-900/50 border border-slate-800 hover:border-violet-500/30 hover:bg-slate-800 transition-all text-left group"
                                        >
                                            <div className="w-8 h-8 bg-black rounded overflow-hidden shrink-0 border border-slate-700">
                                                {sub.img ? <img src={sub.img} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-600"><MapPin size={12}/></div>}
                                            </div>
                                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors truncate">{sub.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const LocationsPage: React.FC<LocationsPageProps> = ({ isAdmin, onNavigateToMap }) => {
    const { locations, addLocation, updateLocation, deleteLocation } = useLocations();
    const { maps } = useMaps(); 

    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReaderOpen, setIsReaderOpen] = useState(false);
    
    // Default form state
    const [formData, setFormData] = useState<Partial<Location>>({ name: '', description: '', img: '', associated_map_id: null });

    const tree = useMemo(() => buildLocationTree(locations), [locations]);

    const handleEdit = (loc: Location) => {
        setFormData(loc);
        setIsEditModalOpen(true);
    };

    const handleCreate = (parentId?: string) => {
        setFormData({ name: '', description: '', img: '', parent: parentId || null, associated_map_id: null });
        setIsEditModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.id) {
            await updateLocation(formData.id, formData);
        } else {
            await addLocation(formData as any);
        }
        setIsEditModalOpen(false);
    };

    return (
        <div className="h-full flex relative overflow-hidden">
            {/* Sidebar */}
            <div className="absolute inset-y-0 left-0 w-full md:w-64 bg-slate-950/90 md:bg-slate-950/50 backdrop-blur-md border-r border-violet-900/20 flex flex-col z-20 transition-transform md:translate-x-0 -translate-x-full">
                {/* Note: Mobile handling for sidebar is simplified here, assuming larger screen or external toggle for now, similar to other modules */}
                <div className="p-3 border-b border-violet-900/20 flex justify-between items-center shrink-0">
                    <span className="text-sm font-bold text-violet-300 font-fantasy uppercase">Локации</span>
                    {isAdmin && <button onClick={() => handleCreate()} className="text-slate-400 hover:text-white"><Plus size={16} /></button>}
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {tree.map(node => (
                        <LocationTreeItem 
                            key={node.id} 
                            node={node} 
                            level={0} 
                            onSelect={(id) => {
                                const loc = locations.find(l => l.id === id);
                                if(loc) {
                                    setSelectedLocation(loc);
                                    setIsReaderOpen(true);
                                }
                            }}
                            selectedId={selectedLocation?.id || null} 
                        />
                    ))}
                </div>
            </div>
            
            {/* Desktop persistent sidebar (hacky duplication for layout stability without refactoring Layout) */}
            <div className="hidden md:flex w-64 bg-slate-950/50 border-r border-violet-900/20 flex-col shrink-0">
                 <div className="p-3 border-b border-violet-900/20 flex justify-between items-center shrink-0">
                    <span className="text-sm font-bold text-violet-300 font-fantasy uppercase">Локации</span>
                    {isAdmin && <button onClick={() => handleCreate()} className="text-slate-400 hover:text-white"><Plus size={16} /></button>}
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {tree.map(node => (
                        <LocationTreeItem 
                            key={node.id} 
                            node={node} 
                            level={0} 
                            onSelect={(id) => {
                                const loc = locations.find(l => l.id === id);
                                if(loc) {
                                    setSelectedLocation(loc);
                                    setIsReaderOpen(true);
                                }
                            }}
                            selectedId={selectedLocation?.id || null} 
                        />
                    ))}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 bg-black/20 relative">
                {!isReaderOpen && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-fantasy p-4 text-center">
                        Выберите локацию для просмотра
                    </div>
                )}
                {isReaderOpen && selectedLocation && (
                    <LocationReader 
                        location={selectedLocation}
                        parentName={locations.find(l => l.id === selectedLocation.parent)?.name}
                        subLocations={locations.filter(l => l.parent === selectedLocation.id)}
                        onClose={() => setIsReaderOpen(false)}
                        onOpenSubLocation={(loc) => setSelectedLocation(loc)}
                        onOpenMap={onNavigateToMap}
                    />
                )}
            </div>

            {/* Edit/Create Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={formData.id ? "Ред. Локацию" : "Новая Локация"}>
                <form onSubmit={handleSave} className="space-y-4">
                    <MagicalInput required placeholder="Название" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <MagicalInput placeholder="URL Изображения" value={formData.img || ''} onChange={e => setFormData({...formData, img: e.target.value})} />
                    
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500">Привязать Карту</label>
                        <select 
                            className="w-full bg-[#020408] border border-violet-900/40 p-2 rounded-lg text-violet-100 outline-none focus:border-violet-500"
                            value={formData.associated_map_id || ''}
                            onChange={e => setFormData({...formData, associated_map_id: e.target.value || null})}
                        >
                            <option value="" className="bg-[#020408]">-- Нет --</option>
                            {maps.map(m => <option key={m.id} value={m.id} className="bg-[#020408]">{m.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-500">Родительская Локация</label>
                        <select 
                            className="w-full bg-[#020408] border border-violet-900/40 p-2 rounded-lg text-violet-100 outline-none focus:border-violet-500"
                            value={formData.parent || ''}
                            onChange={e => setFormData({...formData, parent: e.target.value || null})}
                        >
                            <option value="" className="bg-[#020408]">-- Корень --</option>
                            {locations.filter(l => l.id !== formData.id).map(l => <option key={l.id} value={l.id} className="bg-[#020408]">{l.name}</option>)}
                        </select>
                    </div>

                    <MagicalTextArea required rows={5} placeholder="Описание..." value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                    
                    <div className="flex gap-2 pt-2">
                        {formData.id && (
                            <button type="button" onClick={async () => {
                                if(confirm("Удалить локацию?")) {
                                    await deleteLocation(formData.id!);
                                    setIsEditModalOpen(false);
                                    setIsReaderOpen(false);
                                }
                            }} className="p-3 bg-red-900/20 text-red-400 border border-red-900/50 rounded hover:bg-red-900/40"><Trash2 size={18} /></button>
                        )}
                        <button type="submit" className="flex-1 bg-violet-700 hover:bg-violet-600 text-white font-bold py-3 rounded uppercase tracking-widest font-fantasy">Сохранить</button>
                    </div>
                </form>
            </Modal>

            {/* Admin Controls Overlay for Reader */}
            {isReaderOpen && selectedLocation && isAdmin && (
                <div className="absolute top-4 right-16 z-[110] flex gap-2">
                    <button onClick={() => handleEdit(selectedLocation)} className="p-2 bg-slate-900/80 text-white rounded-full hover:bg-violet-600 transition-colors shadow-lg border border-white/10">
                        <Edit2 size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default LocationsPage;
