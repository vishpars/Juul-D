import React, { useState, useMemo } from 'react';
import { useLocations } from '../hooks/useLocations';
import { useMaps } from '../hooks/useMaps';
import { MapPin, Plus, Trash2, ChevronRight, ChevronDown, FolderOpen, Folder, X, Edit2, CornerUpLeft, Home, Eye, Map as MapIcon, Link } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ConfirmationModal } from '../components/ConfirmationModal';
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

const MagicalSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className={`w-full bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.3)] outline-none transition-all duration-300 appearance-none cursor-pointer ${props.className}`}>
        {props.children}
    </select>
);

// --- Tree Logic ---

export interface LocationNode extends Location {
    children: LocationNode[];
}

export const buildLocationTree = (locations: Location[]): LocationNode[] => {
    const map = new Map<string, LocationNode>();
    const roots: LocationNode[] = [];
    
    // Initialize map
    locations.forEach(loc => map.set(loc.id, { ...loc, children: [] }));
    
    // Build hierarchy
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

export const LocationTreeItem: React.FC<{ 
    node: LocationNode, 
    level: number, 
    onSelect: (id: string) => void,
    selectedId: string | null 
}> = ({ node, level, onSelect, selectedId }) => {
    const [expanded, setExpanded] = useState(false);
    const hasChildren = node.children.length > 0;

    return (
        <div className="select-none">
            <div 
                className={`
                    flex items-center gap-2 p-2 rounded cursor-pointer transition-colors border border-transparent
                    ${selectedId === node.id ? 'bg-violet-900/40 border-violet-500/50 text-white' : 'hover:bg-slate-800 text-slate-400'}
                `}
                style={{ marginLeft: `${level * 16}px` }}
                onClick={() => onSelect(node.id)}
            >
                <button 
                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                    className={`p-1 rounded hover:bg-white/10 ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {selectedId === node.id ? <FolderOpen size={16} className="text-violet-400" /> : <Folder size={16} />}
                <span className="font-fantasy tracking-wide text-sm">{node.name}</span>
            </div>
            
            {expanded && hasChildren && (
                <div className="border-l border-slate-800 ml-4">
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

export interface LocationReaderProps {
    location: Location;
    parentName?: string;
    subLocations: Location[];
    onClose: () => void;
    onOpenSubLocation: (loc: Location) => void;
    onOpenMap: (mapId: string) => void;
}

export const LocationReader = ({ location, parentName, subLocations, onClose, onOpenSubLocation, onOpenMap }: LocationReaderProps) => {
    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-fadeIn p-0 md:p-6 backdrop-blur-xl" onClick={onClose}>
            <div 
                className="relative w-full h-full md:max-w-6xl md:h-[85vh] bg-slate-950 border border-violet-900/30 rounded-none md:rounded-2xl shadow-2xl flex flex-col landscape:flex-row md:flex-row overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                 <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/60 text-white rounded-full hover:bg-red-900/80 transition-colors backdrop-blur-md"
                >
                    <X size={24} />
                </button>

                {/* Left: Art (Top on Mobile Portrait, Left on Landscape/Desktop) */}
                <div className="w-full landscape:w-1/2 md:w-3/5 h-1/3 landscape:h-full md:h-full relative shrink-0 bg-black">
                    <img 
                        src={location.img} 
                        alt={location.name} 
                        className="w-full h-full object-cover opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t landscape:bg-gradient-to-r md:bg-gradient-to-r from-slate-950 via-transparent to-transparent"></div>
                    
                    {/* Region Tag Floating */}
                    {parentName && (
                         <div className="absolute top-4 left-4 landscape:bottom-8 landscape:top-auto landscape:left-8 md:bottom-8 md:top-auto md:left-8 px-3 py-1 bg-black/60 backdrop-blur-md border border-violet-500/30 rounded text-violet-300 text-xs uppercase tracking-widest font-bold">
                             {parentName}
                         </div>
                    )}

                    {/* Open Associated Map Button */}
                    {location.associated_map_id && (
                        <div className="absolute bottom-4 left-4 right-4 landscape:bottom-8 landscape:left-auto landscape:right-8 md:bottom-8 md:left-auto md:right-8 flex justify-center">
                            <button 
                                onClick={() => onOpenMap(location.associated_map_id!)}
                                className="bg-slate-900/80 hover:bg-violet-600/90 text-white px-6 py-3 rounded-lg flex items-center gap-3 backdrop-blur-md border border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all font-fantasy tracking-wider uppercase group"
                            >
                                <MapIcon size={18} /> Открыть Карту Региона
                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Content (Bottom on Mobile Portrait, Right on Landscape/Desktop) */}
                <div className="w-full landscape:w-1/2 md:w-2/5 flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar bg-slate-950 relative">
                     {/* Decorative Elements */}
                     <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                         <MapPin size={120} />
                     </div>

                     <h1 className="text-4xl md:text-5xl font-fantasy text-transparent bg-clip-text bg-gradient-to-r from-white to-violet-400 mb-6 drop-shadow-lg leading-tight">
                        {location.name}
                     </h1>
                     
                     <div className="h-1 w-24 bg-violet-600 mb-8 shadow-[0_0_15px_rgba(139,92,246,0.6)]"></div>

                     <div className="prose prose-invert prose-violet max-w-none text-lg text-slate-300 leading-loose font-serif whitespace-pre-wrap mb-8">
                         {location.description}
                     </div>

                     {/* Sub Locations List */}
                     {subLocations.length > 0 && (
                         <div className="border-t border-violet-900/30 pt-6">
                             <h4 className="text-sm font-fantasy text-violet-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                 <FolderOpen size={14} /> Содержит Локации
                             </h4>
                             <div className="grid grid-cols-1 gap-2">
                                 {subLocations.map(sub => (
                                     <button
                                        key={sub.id}
                                        onClick={() => onOpenSubLocation(sub)}
                                        className="flex items-center gap-3 p-3 rounded bg-slate-900/50 hover:bg-violet-900/20 border border-slate-800 hover:border-violet-500/40 transition-all text-left group"
                                     >
                                         <div className="w-10 h-10 rounded overflow-hidden shrink-0 border border-slate-700">
                                             <img src={sub.img} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                         </div>
                                         <div className="flex-1">
                                             <div className="font-fantasy text-slate-300 group-hover:text-white transition-colors">{sub.name}</div>
                                         </div>
                                         <ChevronRight size={14} className="text-slate-600 group-hover:text-violet-400 transition-colors" />
                                     </button>
                                 ))}
                             </div>
                         </div>
                     )}
                </div>
            </div>
        </div>
    );
};

const LocationsPage: React.FC<LocationsPageProps> = ({ isAdmin, onNavigateToMap }) => {
    const { locations, addLocation, updateLocation, deleteLocation } = useLocations();
    const { maps } = useMaps(); // Fetch maps for association selector

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formLoc, setFormLoc] = useState<Partial<Location>>({});
    const [isTreeSelectorOpen, setIsTreeSelectorOpen] = useState(false);
    const [confirmState, setConfirmState] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    
    // Navigation State (Drill down)
    const [currentParentId, setCurrentParentId] = useState<string | null>(null);

    // Viewer State (Reader)
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

    const tree = useMemo(() => buildLocationTree(locations), [locations]);

    // Calculate breadcrumbs lineage
    const lineage = useMemo(() => {
        const path: Location[] = [];
        let curr = currentParentId;
        while(curr) {
            const found = locations.find(l => l.id === curr);
            if(found) {
                path.unshift(found);
                curr = found.parent || null;
            } else {
                break;
            }
        }
        return path;
    }, [currentParentId, locations]);

    // Filter displayed locations based on current folder
    const displayedLocations = useMemo(() => {
        return locations.filter(l => l.parent === (currentParentId || null));
    }, [locations, currentParentId]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(formLoc.name && formLoc.description) {
            const payload = { ...formLoc };
            // If adding new in current view, default parent to current view
            if (!payload.id && !payload.parent && currentParentId) {
                payload.parent = currentParentId;
            }

            if (payload.id) {
                // Edit
                updateLocation(payload.id, payload);
            } else {
                // Create
                addLocation(payload as Omit<Location, 'id'>);
            }
            setIsModalOpen(false);
            setFormLoc({});
        }
    };

    const handleOpenEdit = (loc: Location) => {
        setFormLoc({ ...loc });
        setIsModalOpen(true);
    };

    const handleDeleteLocation = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: "Удалить Локацию",
            message: "Вы уверены? Это действие необратимо.",
            onConfirm: () => deleteLocation(id)
        });
    };

    const handleOpenCreate = () => {
        setFormLoc({ parent: currentParentId });
        setIsModalOpen(true);
    };

    const getParentName = (parentId?: string | null) => {
        if (!parentId) return null;
        return locations.find(l => l.id === parentId)?.name;
    };

    const handleOpenSubLocation = (loc: Location) => {
        // If sub-location has children, go to folder view, else open reader
        const hasChildren = locations.some(l => l.parent === loc.id);
        if (hasChildren) {
            setSelectedLocation(null);
            setCurrentParentId(loc.id);
        } else {
            setSelectedLocation(loc);
        }
    };

    return (
        <div className="h-full flex flex-col">
            
            {selectedLocation && (
                <LocationReader 
                    location={selectedLocation} 
                    parentName={getParentName(selectedLocation.parent) || undefined}
                    subLocations={locations.filter(l => l.parent === selectedLocation.id)}
                    onClose={() => setSelectedLocation(null)} 
                    onOpenSubLocation={handleOpenSubLocation}
                    onOpenMap={onNavigateToMap}
                />
            )}

            {/* Unified Header with Breadcrumbs included */}
            <div className="bg-slate-900/90 backdrop-blur-md border-b border-violet-500/20 p-3 sticky top-0 z-20 flex flex-wrap justify-between items-center shadow-lg shrink-0 min-h-[3.5rem] gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 overflow-hidden w-full md:w-auto">
                    <h2 className="text-xl font-fantasy text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 flex items-center gap-2 drop-shadow-sm shrink-0 pr-4 sm:border-r border-white/10">
                        <MapPin className="text-violet-500 drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]" size={20} /> Известный Мир
                    </h2>

                    {/* Breadcrumb Navigation */}
                    <div className="flex items-center gap-1 text-xs font-fantasy overflow-x-auto custom-scrollbar pb-1">
                        <button 
                            onClick={() => setCurrentParentId(null)}
                            className={`flex items-center gap-1 transition-colors whitespace-nowrap ${!currentParentId ? 'text-violet-400 font-bold' : 'text-slate-500 hover:text-white'}`}
                        >
                            <Home size={12} /> Материальный План
                        </button>
                        {lineage.map((loc, idx) => (
                            <React.Fragment key={loc.id}>
                                <ChevronRight size={10} className="text-slate-600 shrink-0" />
                                <button 
                                    onClick={() => setCurrentParentId(loc.id)}
                                    className={`whitespace-nowrap transition-colors ${idx === lineage.length - 1 ? 'text-violet-400 font-bold' : 'text-slate-500 hover:text-white'}`}
                                >
                                    {loc.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {isAdmin && (
                    <button onClick={handleOpenCreate} className="ml-auto bg-violet-900/30 hover:bg-violet-800/50 text-violet-100 px-3 py-1.5 rounded-lg flex gap-2 items-center border border-violet-500/30 transition-all font-fantasy uppercase tracking-wider text-[10px] md:text-xs">
                        <Plus size={14} /> Открыть
                    </button>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 relative">
                {/* Back Button (if deep) */}
                {currentParentId && (
                    <button 
                        onClick={() => {
                            const curr = locations.find(l => l.id === currentParentId);
                            setCurrentParentId(curr?.parent || null);
                        }}
                        className="mb-4 flex items-center gap-2 text-slate-400 hover:text-violet-300 transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                        <CornerUpLeft size={14} /> Вернуться в Регион
                    </button>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-10">
                    {displayedLocations.length === 0 ? (
                        <div className="col-span-full text-center py-20 text-slate-600 italic font-fantasy border-2 border-dashed border-slate-800 rounded-xl">
                            Неизведанная Территория...
                        </div>
                    ) : (
                        displayedLocations.map(loc => {
                            const hasChildren = locations.some(l => l.parent === loc.id);
                            
                            return (
                                <div key={loc.id} className="group relative flex flex-col h-auto rounded-xl shadow-lg bg-black/40 backdrop-blur-sm border border-slate-800/50 hover:border-violet-500/50 transition-all hover:-translate-y-2">
                                    
                                    {/* Image Container - SEPARATED for overflow control */}
                                    <div 
                                        onClick={() => setSelectedLocation(loc)} 
                                        className="relative h-64 w-full cursor-pointer overflow-hidden rounded-t-xl"
                                    >
                                        <img 
                                            src={loc.img} 
                                            alt={loc.name} 
                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-60 group-hover:opacity-100" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>
                                        
                                        {/* Icon Indicator */}
                                        <div className="absolute top-2 left-2 z-20 bg-black/60 p-1.5 rounded-full text-violet-400 border border-violet-500/30 backdrop-blur-md shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                                            {hasChildren ? <FolderOpen size={14} /> : <Eye size={14} />}
                                        </div>

                                        {/* Actions (Admin Only) */}
                                        {isAdmin && (
                                            <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-all">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(loc); }}
                                                    className="p-2 bg-black/60 text-slate-400 hover:text-white rounded-full hover:bg-violet-900/50"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc.id); }}
                                                    className="p-2 bg-black/60 text-slate-400 hover:text-red-400 rounded-full hover:bg-red-900/50"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Minimal Content Overlay */}
                                        <div className="absolute bottom-0 p-5 w-full z-10 pointer-events-none">
                                            <div className="h-0.5 w-12 bg-violet-500 mb-3 shadow-[0_0_10px_rgba(139,92,246,1)] group-hover:w-full transition-all duration-700"></div>
                                            <h3 className="text-xl font-fantasy text-slate-200 group-hover:text-white transition-colors drop-shadow-md truncate flex items-center gap-2">
                                                {loc.name}
                                            </h3>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{hasChildren ? "Регион" : "Локация"}</span>
                                        </div>
                                        
                                        {/* Hover Border Glow */}
                                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-violet-500/30 rounded-t-xl pointer-events-none transition-colors duration-500 z-10"></div>
                                    </div>

                                    {/* Folder Navigation Footer (Drill Down) - OUTSIDE overflow container */}
                                    {hasChildren && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setCurrentParentId(loc.id); }}
                                            className="w-full bg-slate-900 hover:bg-violet-900/40 border-t border-slate-700 hover:border-violet-500/50 p-3 flex items-center justify-center gap-2 text-xs font-fantasy uppercase tracking-wider text-slate-400 hover:text-white transition-all group/btn rounded-b-xl relative z-20"
                                        >
                                            Войти в Регион <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    )}
                                    {/* Spacer if no button, to round corners */}
                                    {!hasChildren && <div className="hidden"></div>}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formLoc.id ? "Редактировать Локацию" : "Новая Локация"}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <MagicalInput required placeholder="Название" 
                        value={formLoc.name || ''} onChange={e => setFormLoc({...formLoc, name: e.target.value})} />
                    
                    {/* Parent Selector */}
                    <div className="relative">
                        <button 
                            type="button"
                            onClick={() => setIsTreeSelectorOpen(true)}
                            className="w-full bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 flex items-center justify-between hover:border-violet-500 transition-colors"
                        >
                            <span className={!formLoc.parent ? 'text-violet-900/40' : ''}>
                                {formLoc.parent ? getParentName(formLoc.parent) : "Выберите Регион..."}
                            </span>
                            <FolderOpen size={16} className="text-violet-500" />
                        </button>
                    </div>

                    {/* Associated Map Selector */}
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 uppercase tracking-wide">Связанная Карта</label>
                        <MagicalSelect 
                            value={formLoc.associated_map_id || ''}
                            onChange={(e) => setFormLoc({...formLoc, associated_map_id: e.target.value || null})}
                        >
                            <option value="">-- Нет Карты --</option>
                            {maps.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </MagicalSelect>
                    </div>

                    <MagicalInput placeholder="URL Изображения" 
                        value={formLoc.img || ''} onChange={e => setFormLoc({...formLoc, img: e.target.value})} />
                    <MagicalTextArea required placeholder="Описание" rows={3} 
                        value={formLoc.description || ''} onChange={e => setFormLoc({...formLoc, description: e.target.value})} />
                    
                    <button type="submit" className="w-full mt-4 group relative px-6 py-3 bg-slate-900 border-2 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] text-violet-100 font-fantasy tracking-[0.2em] uppercase hover:bg-violet-900/40 hover:border-violet-400 hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] transition-all duration-300 overflow-hidden">
                        <span className="relative z-10">{formLoc.id ? "Обновить Записи" : "Записать Локацию"}</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-400/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    </button>
                </form>
            </Modal>

            {/* Tree Selection Modal */}
            <Modal isOpen={isTreeSelectorOpen} onClose={() => setIsTreeSelectorOpen(false)} title="Выберите Родительский Регион">
                <div className="h-[50vh] overflow-y-auto custom-scrollbar border border-slate-800 rounded bg-slate-900/50 p-4 space-y-1">
                     <button 
                        onClick={() => { setFormLoc({...formLoc, parent: null}); setIsTreeSelectorOpen(false); }}
                        className="w-full text-left p-2 hover:bg-slate-800 text-slate-400 text-sm mb-2 border-b border-slate-800 pb-2"
                     >
                        [Материальный План]
                     </button>
                     {tree.map(node => (
                         <LocationTreeItem 
                            key={node.id} 
                            node={node} 
                            level={0} 
                            onSelect={(id) => { setFormLoc({...formLoc, parent: id}); setIsTreeSelectorOpen(false); }}
                            selectedId={formLoc.parent || null}
                         />
                     ))}
                </div>
            </Modal>

            <ConfirmationModal 
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                isDangerous
            />
        </div>
    );
};

export default LocationsPage;