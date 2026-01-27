import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMaps } from '../hooks/useMaps';
import { useLocations } from '../hooks/useLocations';
import { LocateFixed, Map as MapIcon, Trash2, Plus, MapPin, Search, FolderOpen, Link as LinkIcon, Type, Move, Edit3, Save, X, Eye, Pencil } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { buildLocationTree, LocationTreeItem, LocationReader } from './LocationsPage';
import { Location, MapPin as MapPinType } from '../types';

interface MapsPageProps {
    isAdmin: boolean;
    initialMapId?: string | null;
}

const PRESET_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#84cc16', // Lime
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#d946ef', // Fuchsia
    '#f43f5e', // Rose
    '#ffffff', // White
];

const MagicalInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`w-full bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 placeholder-violet-900/40 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.3)] outline-none transition-all duration-300 backdrop-blur-sm ${props.className}`} />
);

const MapsPage: React.FC<MapsPageProps> = ({ isAdmin, initialMapId }) => {
    const { maps, loading: mapsLoading, updateMapMarkers, addMap, updateMap } = useMaps();
    const { locations } = useLocations();

    const [selectedMapId, setSelectedMapId] = useState<string | null>(initialMapId || null);
    
    // Sync initialMapId if it changes
    useEffect(() => {
        if(initialMapId) setSelectedMapId(initialMapId);
    }, [initialMapId]);

    // Default to first map if none selected
    useEffect(() => {
        if (!selectedMapId && maps.length > 0) {
            setSelectedMapId(maps[0].id);
        }
    }, [maps, selectedMapId]);

    const selectedMap = maps.find(m => m.id === selectedMapId);

    // Marker Creation/Editing State
    const [isMarkerModalOpen, setIsMarkerModalOpen] = useState(false);
    const [editPinId, setEditPinId] = useState<string | null>(null); // If set, we are editing existing pin
    const [tempMarkerPos, setTempMarkerPos] = useState<{x: number, y: number} | null>(null);
    const [markerMode, setMarkerMode] = useState<'existing' | 'new'>('existing');
    
    // Map CRUD State
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [mapFormData, setMapFormData] = useState({ id: '', name: '', image_url: '' });
    const [confirmState, setConfirmState] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    
    // Form States for Marker
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
    const [newLoc, setNewLoc] = useState<{name: string, description: string}>({name: '', description: ''});
    const [markerStyle, setMarkerStyle] = useState({ color: '#8b5cf6', brightness: 1.0 });

    // Interaction Modes
    const [isEditMode, setIsEditMode] = useState(false);
    const [draggingPin, setDraggingPin] = useState<string | null>(null);
    const imgContainerRef = useRef<HTMLDivElement>(null);

    // Location Viewer
    const [viewingLocation, setViewingLocation] = useState<Location | null>(null);

    const tree = useMemo(() => buildLocationTree(locations), [locations]);

    // Local Markers for smooth drag
    const [localMarkers, setLocalMarkers] = useState<MapPinType[]>([]);
    
    useEffect(() => {
        if (selectedMap) setLocalMarkers(selectedMap.markers || []);
    }, [selectedMap]);

    // Logic to calculate position based on the IMAGE size, not the container
    const getRelativeCoords = (e: React.MouseEvent | React.TouchEvent) => {
        if (!imgContainerRef.current) return null;
        
        const rect = imgContainerRef.current.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        
        // Clamp to 0-100
        return {
            x: Math.min(100, Math.max(0, x)),
            y: Math.min(100, Math.max(0, y))
        };
    };

    const handleMapClick = (e: React.MouseEvent) => {
        if (!isAdmin || !selectedMap || isEditMode) return;
        
        // Don't trigger if clicking pin
        if((e.target as HTMLElement).closest('.map-pin')) return;

        const coords = getRelativeCoords(e);
        if(!coords) return;
        
        setTempMarkerPos(coords);
        setEditPinId(null);
        setSelectedLocationId(null);
        setNewLoc({ name: '', description: '' });
        setMarkerStyle({ color: '#8b5cf6', brightness: 1.0 });
        setMarkerMode('existing');
        
        setIsMarkerModalOpen(true);
    };

    const handlePinClick = (e: React.MouseEvent | React.TouchEvent, pin: MapPinType) => {
        e.stopPropagation();
        
        if (isEditMode && isAdmin) {
            // Edit the pin
            setEditPinId(pin.id);
            setTempMarkerPos({ x: pin.x, y: pin.y });
            setSelectedLocationId(pin.locationId || null);
            setNewLoc({ name: pin.label || '', description: pin.description || '' });
            setMarkerStyle({ color: pin.color || '#8b5cf6', brightness: pin.brightness || 1.0 });
            setMarkerMode(pin.locationId ? 'existing' : 'new');
            setIsMarkerModalOpen(true);
        } else {
            // View Location
            if (pin.locationId) {
                const loc = locations.find(l => l.id === pin.locationId);
                if (loc) setViewingLocation(loc);
            }
        }
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, pinId: string) => {
        if (isEditMode && isAdmin) {
            e.stopPropagation();
            setDraggingPin(pinId);
        }
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (draggingPin && isEditMode) {
            const coords = getRelativeCoords(e);
            if(coords) {
                setLocalMarkers(prev => prev.map(p => p.id === draggingPin ? { ...p, x: coords.x, y: coords.y } : p));
            }
        }
    };

    const handleDragEnd = async () => {
        if (draggingPin && selectedMap) {
            // Save to DB
            await updateMapMarkers(selectedMap.id, localMarkers);
            setDraggingPin(null);
        }
    };

    const handleSaveMarker = async () => {
        if (!selectedMap || !tempMarkerPos) return;

        let finalLocationId = selectedLocationId;
        let finalLabel = locations.find(l => l.id === selectedLocationId)?.name || 'Неизвестно';

        // Create new location if needed
        if (markerMode === 'new' && newLoc.name) {
            finalLabel = newLoc.name;
            finalLocationId = null; 
        }

        const markerData = {
            id: editPinId || crypto.randomUUID(),
            x: tempMarkerPos.x,
            y: tempMarkerPos.y,
            label: finalLabel,
            locationId: finalLocationId,
            description: newLoc.description,
            color: markerStyle.color,
            brightness: markerStyle.brightness
        };

        let updatedMarkers;
        if (editPinId) {
             updatedMarkers = localMarkers.map(p => p.id === editPinId ? markerData : p);
        } else {
             updatedMarkers = [...localMarkers, markerData];
        }

        setLocalMarkers(updatedMarkers); 
        await updateMapMarkers(selectedMap.id, updatedMarkers);
        setIsMarkerModalOpen(false);
    };

    const handleMapSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(mapFormData.name && mapFormData.image_url) {
            if (mapFormData.id) {
                await updateMap(mapFormData.id, { name: mapFormData.name, image_url: mapFormData.image_url });
            } else {
                await addMap({ name: mapFormData.name, image_url: mapFormData.image_url });
            }
            setIsMapModalOpen(false);
            setMapFormData({ id: '', name: '', image_url: '' });
        }
    };

    const handleEditMap = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedMap) {
            setMapFormData({ id: selectedMap.id, name: selectedMap.name, image_url: selectedMap.image_url });
            setIsMapModalOpen(true);
        }
    };

    const handleDeletePin = () => {
        if (!isAdmin || !selectedMap || !editPinId) return;
        setConfirmState({
            isOpen: true,
            title: "Удалить Метку",
            message: "Удалить эту метку с карты?",
            onConfirm: async () => {
                const updatedMarkers = localMarkers.filter(p => p.id !== editPinId);
                setLocalMarkers(updatedMarkers);
                await updateMapMarkers(selectedMap.id, updatedMarkers);
                setIsMarkerModalOpen(false);
            }
        });
    };

    if (mapsLoading) return <div className="p-8 text-violet-400 font-fantasy animate-pulse">Разворачивание свитков...</div>;

    return (
        <div className="h-full flex flex-col" 
             onMouseMove={handleDragMove} 
             onMouseUp={handleDragEnd}
             onTouchMove={handleDragMove}
             onTouchEnd={handleDragEnd}
        >
             {viewingLocation && (
                 <LocationReader 
                    location={viewingLocation} 
                    parentName={locations.find(l => l.id === viewingLocation.parent)?.name}
                    subLocations={locations.filter(l => l.parent === viewingLocation.id)}
                    onClose={() => setViewingLocation(null)} 
                    onOpenSubLocation={(loc) => setViewingLocation(loc)}
                    onOpenMap={(mapId) => setSelectedMapId(mapId)}
                />
             )}

             {/* Unified Header */}
             <div className="bg-slate-900/90 backdrop-blur-md border-b border-violet-500/20 p-3 sticky top-0 z-20 flex flex-wrap gap-3 justify-between items-center shadow-lg shrink-0 min-h-[3.5rem]">
                <div className="flex flex-wrap items-center gap-4">
                    <h2 className="text-xl font-fantasy text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 flex items-center gap-2 drop-shadow-sm shrink-0 pr-4 border-r border-white/10">
                        <MapIcon className="text-violet-500 drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]" size={20} /> Картография
                    </h2>
                    
                    {/* Maps List - Wrapping allowed */}
                    <div className="flex flex-wrap gap-2 items-center">
                        {maps.map(map => (
                            <div key={map.id} className="relative group/mapbtn">
                                <button
                                    onClick={() => setSelectedMapId(map.id)}
                                    className={`whitespace-nowrap px-3 py-1 rounded text-xs font-fantasy tracking-wider transition-all border flex items-center gap-2 ${
                                        (selectedMap?.id === map.id) 
                                        ? 'bg-violet-600/20 border-violet-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]' 
                                        : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                    }`}
                                >
                                    {map.name}
                                </button>
                                {isAdmin && selectedMap?.id === map.id && (
                                    <button 
                                        onClick={handleEditMap}
                                        className="absolute -top-2 -right-2 p-1 bg-black rounded-full border border-slate-700 text-slate-400 hover:text-white opacity-0 group-hover/mapbtn:opacity-100 transition-opacity"
                                        title="Edit Map Details"
                                    >
                                        <Pencil size={10} />
                                    </button>
                                )}
                            </div>
                        ))}
                        
                        {isAdmin && (
                            <button 
                                onClick={() => { setMapFormData({id:'', name:'', image_url:''}); setIsMapModalOpen(true); }}
                                className="p-1 rounded bg-violet-900/30 text-violet-400 border border-violet-500/30 hover:bg-violet-800/50 hover:text-white transition-all shrink-0"
                                title="Add Map"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </div>
                </div>
                
                {isAdmin ? (
                    <div className="flex items-center gap-2 ml-auto">
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${isEditMode ? 'bg-red-900/50 border-red-500 text-white animate-pulse' : 'bg-slate-900/50 border-slate-700 text-slate-400'}`}
                        >
                            {isEditMode ? <><Save size={12} /> Завершить</> : <><Edit3 size={12} /> Ред. Метки</>}
                        </button>
                    </div>
                ) : (
                    <div className="text-[10px] text-slate-500 font-mono italic shrink-0 ml-auto">Только Просмотр</div>
                )}
            </div>

            {/* Map Canvas */}
            <div className="flex-1 bg-black/60 overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center backdrop-blur-sm group select-none p-4">
                
                {/* Map Image Container - Using inline-flex wrapper to hug image exactly, avoiding ghost space */}
                {selectedMap ? (
                     <div 
                        className={`relative inline-flex justify-center items-center max-w-full ${isAdmin && isEditMode ? 'cursor-move' : (isAdmin ? 'cursor-crosshair' : 'cursor-default')}`}
                        ref={imgContainerRef}
                        onClick={handleMapClick}
                        style={{ touchAction: 'none' }}
                     >
                         <img 
                            src={selectedMap.image_url} 
                            alt={selectedMap.name} 
                            className="block max-w-full h-auto"
                            style={{ maxHeight: 'calc(100vh - 8rem)', width: 'auto' }}
                         />
                         
                         {/* Markers Rendered Relative to Image Wrapper */}
                         {localMarkers.map((pin) => (
                             <div 
                                 key={pin.id} 
                                 className={`map-pin absolute transform -translate-x-1/2 -translate-y-1/2 group/pin z-30 transition-transform ${isEditMode && draggingPin === pin.id ? 'scale-125 opacity-80' : 'scale-100'} p-2 cursor-pointer`}
                                 style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                                 onClick={(e) => handlePinClick(e, pin)}
                                 onMouseDown={(e) => handleDragStart(e, pin.id)}
                                 onTouchStart={(e) => handleDragStart(e, pin.id)}
                             >
                                 <LocateFixed 
                                     style={{ 
                                         color: pin.color || '#8b5cf6', 
                                         filter: `drop-shadow(0 0 ${8 * (pin.brightness || 1)}px ${pin.color || '#8b5cf6'}) brightness(${pin.brightness || 1})`
                                     }}
                                     className={`w-4 h-4 md:w-6 md:h-6 lg:w-8 lg:h-8 ${!isEditMode && 'hover:scale-125'} transition-transform duration-200`}
                                 />
                                 
                                 {/* Tooltip Label */}
                                 <div 
                                     className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/90 px-2 py-1 rounded-lg text-[10px] md:text-xs whitespace-nowrap opacity-0 group-hover/pin:opacity-100 pointer-events-none transition-all border border-white/10 shadow-xl -translate-y-2 group-hover/pin:translate-y-0 backdrop-blur-md z-40"
                                     style={{ color: pin.color || '#e2e8f0' }}
                                 >
                                     {pin.label}
                                     {pin.locationId && <span className="block text-[8px] md:text-[9px] opacity-60 font-mono flex items-center gap-1 justify-center mt-0.5"><Eye size={8} /> СМОТРЕТЬ</span>}
                                 </div>
                             </div>
                         ))}
                     </div>
                ) : (
                    <div className="text-slate-500 h-full flex items-center justify-center">
                        {maps.length === 0 ? "Нет доступных карт. Создайте." : "Выберите карту"}
                    </div>
                )}
            </div>

            {/* Add/Edit Marker Modal */}
            <Modal isOpen={isMarkerModalOpen} onClose={() => setIsMarkerModalOpen(false)} title={editPinId ? "Ред. Метку" : "Поставить Метку"}>
                <div className="space-y-6">
                    {/* Appearance Controls */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                        <label className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-3 block">Внешний вид</label>
                        <div className="flex gap-4 items-center">
                            <div className="flex gap-2 flex-wrap flex-1">
                                {PRESET_COLORS.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setMarkerStyle({ ...markerStyle, color: c })}
                                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${markerStyle.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c, boxShadow: `0 0 10px ${c}40` }}
                                    />
                                ))}
                            </div>
                            {/* Preview */}
                            <div className="shrink-0 p-2 bg-black/50 rounded border border-white/5">
                                <LocateFixed 
                                    size={32} 
                                    style={{ 
                                        color: markerStyle.color, 
                                        filter: `drop-shadow(0 0 ${8 * markerStyle.brightness}px ${markerStyle.color}) brightness(${markerStyle.brightness})` 
                                    }} 
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="flex justify-between text-[10px] text-slate-500 mb-1">
                                <span>Тусклый</span>
                                <span>Интенсивность</span>
                                <span>Яркий</span>
                            </label>
                            <input 
                                type="range" 
                                min="0.5" 
                                max="2.0" 
                                step="0.1"
                                value={markerStyle.brightness}
                                onChange={e => setMarkerStyle({...markerStyle, brightness: parseFloat(e.target.value)})}
                                className="w-full accent-violet-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex border-b border-slate-800">
                        <button 
                            onClick={() => setMarkerMode('existing')}
                            className={`flex-1 py-2 text-sm font-fantasy tracking-wide border-b-2 transition-colors ${markerMode === 'existing' ? 'border-violet-500 text-violet-200' : 'border-transparent text-slate-500'}`}
                        >
                            <LinkIcon size={14} className="inline mr-2" /> Привязать Локацию
                        </button>
                        <button 
                            onClick={() => setMarkerMode('new')}
                            className={`flex-1 py-2 text-sm font-fantasy tracking-wide border-b-2 transition-colors ${markerMode === 'new' ? 'border-violet-500 text-violet-200' : 'border-transparent text-slate-500'}`}
                        >
                            <Plus size={14} className="inline mr-2" /> Начертать Руну
                        </button>
                    </div>

                    {/* Content Based on Mode */}
                    <div className="min-h-[200px]">
                        {markerMode === 'existing' ? (
                            <div className="border border-slate-800 rounded-lg bg-slate-900/30 max-h-60 overflow-y-auto custom-scrollbar p-2">
                                {tree.map(node => (
                                    <LocationTreeItem 
                                        key={node.id}
                                        node={node}
                                        level={0}
                                        onSelect={(id) => setSelectedLocationId(id)}
                                        selectedId={selectedLocationId}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <input 
                                    className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white focus:border-violet-500 outline-none"
                                    placeholder="Метка"
                                    value={newLoc.name}
                                    onChange={e => setNewLoc({...newLoc, name: e.target.value})}
                                />
                                <textarea 
                                    className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white focus:border-violet-500 outline-none resize-none"
                                    rows={3}
                                    placeholder="Краткое описание..."
                                    value={newLoc.description}
                                    onChange={e => setNewLoc({...newLoc, description: e.target.value})}
                                />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-3">
                        {editPinId && (
                             <button 
                                type="button"
                                onClick={handleDeletePin}
                                className="px-4 py-3 bg-red-900/40 hover:bg-red-800 text-red-200 border border-red-800/50 rounded-lg transition-colors"
                             >
                                <Trash2 size={20} />
                             </button>
                        )}
                        <button 
                            onClick={handleSaveMarker}
                            className="flex-1 py-3 bg-violet-700 hover:bg-violet-600 text-white rounded-lg font-fantasy tracking-widest uppercase shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all"
                        >
                            {editPinId ? "Обновить" : "Подтвердить"}
                        </button>
                    </div>
                </div>
            </Modal>

             {/* Add/Edit Map Modal */}
            <Modal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} title={mapFormData.id ? "Обновить Карту" : "Новая Карта"}>
                <form onSubmit={handleMapSubmit} className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-xs text-slate-400">Название Карты</label>
                        <MagicalInput 
                            required 
                            autoFocus
                            placeholder="напр. Северные Пустоши" 
                            value={mapFormData.name} 
                            onChange={e => setMapFormData({...mapFormData, name: e.target.value})} 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs text-slate-400">URL Изображения</label>
                        <MagicalInput 
                            required 
                            placeholder="https://..." 
                            value={mapFormData.image_url} 
                            onChange={e => setMapFormData({...mapFormData, image_url: e.target.value})} 
                        />
                     </div>

                     <button type="submit" className="w-full mt-4 group relative px-6 py-3 bg-slate-900 border-2 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] text-emerald-100 font-fantasy tracking-[0.2em] uppercase hover:bg-emerald-900/40 hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all duration-300 overflow-hidden">
                        <span className="relative z-10">{mapFormData.id ? "Сохранить" : "Развернуть Карту"}</span>
                     </button>
                </form>
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

export default MapsPage;