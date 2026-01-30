
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLibrary } from '../hooks/useLibrary';
import { useLibraryCategories } from '../hooks/useLibraryCategories';
import { LibraryItem, LibraryCategory } from '../types';
import { 
  Plus, Book, Trash2, 
  Folder, FolderOpen, ChevronRight, ChevronDown, 
  Menu, BookOpen, X, Home, Sparkles, FolderInput, Gem, ChevronLeft, Zap, Edit2, Library, ArrowLeft
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface LibraryPageProps {
  isAdmin?: boolean;
}

// --- Types ---
// Added missing FilterStatus type
type FilterStatus = 'all' | 'active' | 'inactive';

// --- Helpers ---

const MagicalInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`w-full bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 placeholder-violet-900/40 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.3)] outline-none transition-all duration-300 backdrop-blur-sm ${props.className}`} />
);

const MagicalTextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} className={`w-full bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 placeholder-violet-900/40 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.3)] outline-none transition-all duration-300 backdrop-blur-sm resize-none ${props.className}`} />
);

const RuneCheckbox = ({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) => (
    <div onClick={() => onChange(!checked)} className="cursor-pointer flex items-center gap-3 select-none group">
        <div className={`relative w-8 h-8 flex items-center justify-center transition-all duration-500 ${checked ? 'scale-110' : 'scale-100 opacity-60'}`}>
            <div className={`absolute inset-0 bg-violet-500 blur-md rounded-full transition-opacity duration-500 ${checked ? 'opacity-40' : 'opacity-0'}`}></div>
            <Gem 
                size={24} 
                className={`transition-all duration-500 ${checked ? 'text-violet-300 fill-violet-900/80 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]' : 'text-slate-600'}`} 
            />
        </div>
        <span className={`text-sm font-bold tracking-wide transition-colors ${checked ? 'text-violet-200' : 'text-slate-500'}`}>{label}</span>
    </div>
);

interface TreeNode extends LibraryCategory {
  children: TreeNode[];
}

const buildTree = (categories: LibraryCategory[]): TreeNode[] => {
  const map = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];
  categories.forEach(cat => map.set(cat.id, { ...cat, children: [] }));
  categories.forEach(cat => {
    const node = map.get(cat.id);
    if (node) {
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });
  return roots;
};

const getLineage = (categories: LibraryCategory[], targetId: number | null): LibraryCategory[] => {
  if (targetId === null) return [];
  const target = categories.find(c => c.id === targetId);
  if (!target) return [];
  
  if (target.parent_id) {
    return [...getLineage(categories, target.parent_id), target];
  }
  return [target];
};

// --- Category Tree Component for Selection Modal ---
const CategoryTreeSelector: React.FC<{ 
    nodes: TreeNode[], 
    onSelect: (id: number) => void,
    selectedId: number | null
}> = ({ nodes, onSelect, selectedId }) => {
    return (
        <div className="space-y-1">
            {nodes.map(node => (
                <div key={node.id} className="ml-2">
                    <button 
                        type="button"
                        onClick={() => onSelect(node.id)}
                        className={`w-full text-left px-3 py-4 md:py-2 rounded flex items-center gap-2 transition-all border ${selectedId === node.id ? 'bg-violet-900/40 border-violet-500 text-white shadow-lg' : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-violet-200 hover:bg-white/5'}`}
                    >
                         {selectedId === node.id ? <FolderOpen size={18} className="text-violet-400" /> : <Folder size={18} />}
                         <span className="text-lg md:text-sm font-fantasy tracking-wide break-words whitespace-normal">{node.name}</span>
                    </button>
                    {node.children.length > 0 && (
                        <div className="pl-4 border-l border-violet-900/20 ml-2 mt-1">
                             <CategoryTreeSelector nodes={node.children} onSelect={onSelect} selectedId={selectedId} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


// --- Compact Sidebar Node ---

interface CategoryNodeProps {
  node: TreeNode;
  selectedId: number | null;
  expandedIds: Set<number>;
  onSelect: (id: number) => void;
  onToggleExpand: (id: number) => void;
  isAdmin: boolean;
  onAddSubCategory: (parentId: number) => void;
  onAddBookToCategory: (categoryId: number) => void;
}

const CategoryNode: React.FC<CategoryNodeProps> = ({ 
  node, 
  selectedId, 
  expandedIds, 
  onSelect, 
  onToggleExpand, 
  isAdmin, 
  onAddSubCategory, 
  onAddBookToCategory 
}) => {
  const isSelected = selectedId === node.id;
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div className="select-none text-[10px] font-medium leading-none">
      <div 
        className={`
          flex items-start gap-1 py-1 px-1 rounded-sm cursor-pointer transition-all group border
          ${isSelected ? 'bg-violet-900/30 text-violet-200 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.1)]' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}
        `}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}
          className={`p-0 rounded hover:bg-white/10 mt-0.5 ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {isExpanded ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
        </button>
        
        <div className="flex-1 flex items-start gap-1.5 overflow-hidden" onClick={() => onSelect(node.id)}>
           <div className="mt-0.5 shrink-0">
               {isExpanded ? <FolderOpen size={10} className="text-violet-400" /> : <Folder size={10} className="text-slate-500" />}
           </div>
           <span className="pt-0.5 font-fantasy tracking-wide break-words whitespace-normal leading-tight">{node.name}</span>
           {isAdmin && node.code && <span className="text-[8px] font-mono text-slate-600 ml-auto whitespace-nowrap">{node.code}</span>}
        </div>

        {isAdmin && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
            <button onClick={(e) => { e.stopPropagation(); onAddBookToCategory(node.id); }} className="p-0.5 hover:text-green-400 text-slate-500" title="Add Book"><Book size={8} /></button>
            <button onClick={(e) => { e.stopPropagation(); onAddSubCategory(node.id); }} className="p-0.5 hover:text-violet-400 text-slate-500" title="Add Subcategory"><Plus size={8} /></button>
          </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="pl-2 border-l border-violet-900/20 ml-1 mt-0.5 space-y-0.5">
          {node.children.map(child => (
            <CategoryNode 
              key={child.id} 
              node={child} 
              selectedId={selectedId}
              expandedIds={expandedIds} 
              onSelect={onSelect}
              onToggleExpand={onToggleExpand} 
              isAdmin={isAdmin}
              onAddSubCategory={onAddSubCategory}
              onAddBookToCategory={onAddBookToCategory}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Book Reader (Spectral Tablet) ---
const BookReader = ({ book, onClose, onNavigateToCategory }: { book: LibraryItem, onClose: () => void, onNavigateToCategory: (catId: number) => void }) => {
  const [showProperties, setShowProperties] = useState(false);
  const touchStartRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (diff > 50) setShowProperties(true);
    if (diff < -50) setShowProperties(false);
    touchStartRef.current = null;
  };

  const hasProperties = book.effects || book.active || book.active_effects;

  return (
    <div className="fixed left-0 right-0 bottom-0 top-12 md:top-0 z-50 bg-black/95 flex items-center justify-center animate-fadeIn p-0 min-[1150px]:p-4 backdrop-blur-md" onClick={onClose}>
      <div 
        className="relative w-full h-full min-[1150px]:max-w-5xl min-[1150px]:h-[85vh] flex flex-col min-[1150px]:flex-row min-[1150px]:rounded-2xl overflow-hidden border-0 min-[1150px]:border-2 border-violet-500/30 shadow-[0_0_100px_rgba(139,92,246,0.2)] bg-slate-950/60 backdrop-blur-xl isolate"
        onClick={e => e.stopPropagation()} 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute top-4 right-4 z-50 flex gap-2">
            {book.category && (
                <button 
                    onClick={() => { onClose(); onNavigateToCategory(book.category!); }}
                    className="p-2 text-slate-400 hover:text-violet-300 transition-colors bg-black/40 hover:bg-violet-900/20 rounded-full border border-transparent hover:border-violet-500/30"
                    title="Назад к разделу"
                >
                    <ArrowLeft size={20} />
                </button>
            )}
            <button 
                onClick={onClose}
                className="p-2 text-violet-400 hover:text-white transition-colors bg-black/40 hover:bg-violet-900/20 rounded-full"
            >
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 p-6 md:p-12 overflow-y-auto custom-scrollbar relative border-r border-violet-500/10">
            <h2 className="font-fantasy text-2xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-slate-200 drop-shadow-[0_0_5px_rgba(139,92,246,0.2)] text-center md:text-left leading-tight break-words pr-12">
                {book.title}
            </h2>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/50 to-transparent my-6"></div>
            <div className="prose prose-invert prose-violet max-w-none text-slate-300 font-serif leading-loose text-lg whitespace-pre-wrap tracking-wide break-words">
                {book.description}
            </div>
        </div>

        {hasProperties && (
            <div className={`
                absolute inset-y-0 right-0 w-3/4 min-[1150px]:static min-[1150px]:w-1/3 
                bg-black/95 min-[1150px]:bg-black/20 
                p-8 border-l border-violet-500/10 
                flex flex-col gap-6 backdrop-blur-xl min-[1150px]:backdrop-blur-sm 
                transition-transform duration-300 ease-out z-30
                ${showProperties ? 'translate-x-0 shadow-[-20px_0_50px_rgba(0,0,0,0.8)]' : 'translate-x-full min-[1150px]:translate-x-0'}
            `}>
                <h3 className="font-fantasy text-xl text-violet-300/70 uppercase tracking-widest text-center mb-4">Свойства</h3>
                {book.effects && (
                    <div className="bg-violet-950/20 border border-violet-500/20 p-4 rounded-lg relative overflow-hidden group">
                        <h4 className="text-violet-400 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={12} /> Содержит</h4>
                        <p className="text-slate-300 font-serif italic break-words">{book.effects}</p>
                    </div>
                )}
                {(book.active || book.active_effects) && (
                    <div className="bg-red-950/10 border border-red-500/20 p-4 rounded-lg relative overflow-hidden group">
                        <h4 className="text-red-400 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={12} /> Доступно</h4>
                         <p className="text-slate-300 font-serif italic break-words">{book.active_effects}</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export const LibraryPage: React.FC<LibraryPageProps> = ({ isAdmin = false }) => {
  const { books, loading: booksLoading, error, addBook, updateBook, deleteBook } = useLibrary();
  const { categories, addCategory, loading: catsLoading } = useLibraryCategories();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [readingBook, setReadingBook] = useState<LibraryItem | null>(null);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [formBook, setFormBook] = useState<Partial<LibraryItem>>({ active: false, category: null });
  const [newCatName, setNewCatName] = useState('');
  const [newCatParentId, setNewCatParentId] = useState<number | null>(null);

  const filteredCategories = useMemo(() => categories.filter(c => !['Graveyard', 'Могильник'].includes(c.name)), [categories]);
  const tree = useMemo(() => buildTree(filteredCategories), [filteredCategories]);
  const lineage = useMemo(() => getLineage(filteredCategories, selectedCategoryId), [filteredCategories, selectedCategoryId]);
  
  useEffect(() => {
    if (selectedCategoryId) {
      const path = getLineage(filteredCategories, selectedCategoryId);
      setExpandedIds(prev => {
        const next = new Set(prev);
        path.forEach(c => next.add(c.id));
        return next;
      });
    }
  }, [selectedCategoryId, filteredCategories]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleBooks = useMemo(() => {
    let result = books;
    if (selectedCategoryId !== null) result = result.filter(b => b.category === selectedCategoryId);
    if (filterStatus === 'active') result = result.filter(b => b.active);
    else if (filterStatus === 'inactive') result = result.filter(b => !b.active);
    return result;
  }, [books, selectedCategoryId, filterStatus]);

  const visibleFolders = useMemo(() => {
    if (selectedCategoryId === null) return tree; 
    return filteredCategories.filter(c => c.parent_id === selectedCategoryId);
  }, [filteredCategories, selectedCategoryId, tree]);

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formBook.title && formBook.description && formBook.category) {
      if (formBook.id) await updateBook(formBook.id, formBook);
      else await addBook(formBook as any);
      setIsBookModalOpen(false);
      setFormBook({ active: false, category: selectedCategoryId });
    }
  };

  const handleOpenEdit = (book: LibraryItem) => {
      setFormBook({ ...book });
      setIsBookModalOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
       await addCategory(newCatName, newCatParentId);
       setIsCategoryModalOpen(false);
       setNewCatName('');
    }
  };

  const handleBookOpen = (book: LibraryItem) => {
      setReadingBook(book);
      setIsSidebarOpen(false);
  };

  const handleDeleteBook = (id: string) => {
      setConfirmState({
          isOpen: true,
          title: "Сжечь Свиток",
          message: "Вы уверены, что хотите уничтожить это знание навсегда?",
          onConfirm: () => deleteBook(id)
      });
  };

  if (booksLoading || catsLoading) return <div className="flex items-center justify-center h-full text-violet-500 animate-pulse font-fantasy">Распечатывание Архивов...</div>;

  return (
    <div className="h-full flex relative overflow-hidden">
      {readingBook && (
          <BookReader 
            book={readingBook} 
            onClose={() => setReadingBook(null)} 
            onNavigateToCategory={(catId) => {
                setSelectedCategoryId(catId);
                setReadingBook(null);
            }}
          />
      )}
      <div className={`absolute inset-y-0 left-0 z-30 w-full min-[1150px]:w-64 bg-slate-950/90 min-[1150px]:bg-slate-950/40 backdrop-blur-xl border-r border-violet-500/20 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-2 border-b border-white/5 flex justify-between items-center shrink-0">
           <h3 className="text-violet-200 font-fantasy text-sm flex items-center gap-2"><BookOpen size={14} className="text-violet-500" /> Индекс Архива</h3>
           <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white p-1"><Menu size={16} /></button>
        </div>
        <div className="p-1 overflow-y-auto flex-1 custom-scrollbar">
            <button onClick={() => setSelectedCategoryId(null)} className={`w-full text-left px-2 py-1.5 rounded-sm mb-0.5 text-[10px] font-bold flex items-center gap-2 transition-all ${selectedCategoryId === null ? 'bg-violet-600/20 text-white border border-violet-500/30' : 'text-slate-400 hover:text-slate-200'}`}><Home size={10} /> Главная</button>
            <div className="space-y-0">
              {tree.map(node => (
                <CategoryNode 
                  key={node.id} node={node} selectedId={selectedCategoryId} expandedIds={expandedIds}
                  onToggleExpand={toggleExpand} onSelect={setSelectedCategoryId} isAdmin={isAdmin}
                  onAddSubCategory={(id) => { setIsCategoryModalOpen(true); setNewCatParentId(id); }}
                  onAddBookToCategory={(id) => { setIsBookModalOpen(true); setFormBook({ ...formBook, category: id, id: undefined }); }}
                />
              ))}
            </div>
        </div>
      </div>

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-0 min-[1150px]:ml-64' : 'ml-0'} h-full overflow-hidden`}>
        <div className="bg-slate-900/90 backdrop-blur-md border-b border-violet-500/20 p-3 shrink-0 z-20 flex flex-wrap gap-3 justify-between items-center shadow-lg min-h-[3.5rem]">
             <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
                <h2 onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-xl font-fantasy text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 flex items-center gap-2 cursor-pointer select-none hover:brightness-125 transition-all active:scale-95"><Library className="text-violet-500" size={20} /> Справочник</h2>
                 <div className="flex items-center text-xs font-fantasy whitespace-nowrap overflow-x-auto custom-scrollbar pb-1">
                     <button onClick={() => setSelectedCategoryId(null)} className="hover:text-violet-400 text-slate-300 px-1 flex items-center gap-1"><Home size={12} /> Главная</button>
                     {lineage.map((cat) => (
                         <React.Fragment key={cat.id}>
                             <ChevronRight size={10} className="mx-1 text-slate-600" />
                             <button onClick={() => setSelectedCategoryId(cat.id)} className={`hover:text-violet-400 ${cat.id === selectedCategoryId ? 'text-violet-300 font-bold underline' : 'text-slate-300'}`}>{cat.name}</button>
                         </React.Fragment>
                     ))}
                 </div>
             </div>
             <div className="flex gap-2 shrink-0 ml-auto">
                {isAdmin && (
                  <button onClick={() => { setIsBookModalOpen(true); setFormBook({ ...formBook, category: selectedCategoryId, id: undefined }); }} className="bg-violet-700/80 hover:bg-violet-600 text-white px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider"><Plus size={10} /> Добавить Том</button>
                )}
             </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/40 backdrop-blur-sm p-4 md:p-6">
            {error && <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-2 rounded mb-6">{error}</div>}
            {visibleFolders.length > 0 && (
              <div className="mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-violet-300/70 mb-2 border-b border-violet-500/20 pb-1">Разделы</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {visibleFolders.map((cat: any) => (
                      <div key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className="group bg-slate-900/40 border border-slate-700/50 hover:border-violet-500/50 hover:bg-violet-900/20 p-4 rounded-xl flex items-center gap-4 cursor-pointer transition-all shadow-md">
                          <div className="p-3 bg-white/5 rounded-lg text-slate-500 group-hover:text-violet-300 shrink-0"><Folder size={28} /></div>
                          <div className="overflow-hidden"><h4 className="text-slate-300 text-sm font-medium group-hover:text-violet-100 font-fantasy break-words whitespace-normal leading-tight">{cat.name}</h4></div>
                      </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-center mb-6">
                 <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-white/5 backdrop-blur-md">
                      <button onClick={() => setFilterStatus('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'all' ? 'bg-violet-700 text-white' : 'text-slate-400 hover:text-white'}`}>Все</button>
                      <button onClick={() => setFilterStatus('active')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'active' ? 'bg-violet-700 text-white' : 'text-slate-400 hover:text-white'}`}>Активные</button>
                      <button onClick={() => setFilterStatus('inactive')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'inactive' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Инфо</button>
                 </div>
            </div>
            <div>
               <div className="flex items-center justify-between mb-4 border-b border-violet-500/20 pb-1">
                 <h4 className="text-[10px] font-bold uppercase tracking-widest text-violet-300/70">Тома</h4>
                 <span className="text-[10px] text-slate-500">{visibleBooks.length} записей</span>
               </div>
               {visibleBooks.length === 0 ? (
                  <div className="text-center py-12 opacity-30 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center gap-2"><BookOpen size={32} /><p className="font-fantasy text-slate-400 text-sm">Пусто...</p></div>
               ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 min-[1150px]:grid-cols-6 gap-3 pb-8">
                    {visibleBooks.map(book => (
                        <div key={book.id} onClick={() => handleBookOpen(book)} className="group relative aspect-[3/4] bg-slate-900/80 border border-slate-700/50 rounded-lg cursor-pointer transition-all duration-500 hover:border-violet-500/50 overflow-hidden flex flex-col items-center justify-center p-2 text-center isolate">
                            {isAdmin && (
                                <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-20 opacity-0 group-hover:opacity-100"><button onClick={(e) => { e.stopPropagation(); handleDeleteBook(book.id); }} className="p-1 bg-black/50 rounded text-slate-600 hover:text-red-400"><Trash2 size={10} /></button><button onClick={(e) => { e.stopPropagation(); handleOpenEdit(book); }} className="p-1 bg-black/50 rounded text-slate-600 hover:text-violet-400"><Edit2 size={10} /></button></div>
                            )}
                            <div className="relative w-8 h-8 md:w-10 md:h-10 mb-2 flex items-center justify-center group-hover:scale-110 transition-transform"><Book className="text-slate-600 group-hover:opacity-0 transition-opacity" strokeWidth={1.5}/><BookOpen className="absolute inset-0 text-violet-300 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2}/></div>
                            <div className="relative z-10 w-full"><h3 className="text-xs font-fantasy font-bold text-slate-300 group-hover:text-white leading-tight mb-0.5 break-words whitespace-normal line-clamp-3">{book.title}</h3></div>
                        </div>
                    ))}
                  </div>
               )}
            </div>
        </div>
      </div>

      <Modal isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} title={formBook.id ? "Переписать Том" : "Вписать Новый Том"}>
        <form onSubmit={handleBookSubmit} className="space-y-4">
          <MagicalInput required placeholder="Название" value={formBook.title || ''} onChange={e => setFormBook({...formBook, title: e.target.value})} />
          <div className="relative"><button type="button" onClick={() => setIsCategorySelectorOpen(true)} className="w-full bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 flex items-center justify-between hover:border-violet-500 transition-colors"><span>{formBook.category ? categories.find(c => c.id === formBook.category)?.name : "Выберите Классификацию..."}</span><FolderInput size={16} className="text-violet-500" /></button></div>
          <MagicalTextArea placeholder="Пассивные эффекты" rows={2} value={formBook.effects || ''} onChange={e => setFormBook({...formBook, effects: e.target.value})} />
          <div className="bg-slate-800/30 p-2 rounded border border-slate-700/50"><RuneCheckbox label="Активная Способность" checked={formBook.active || false} onChange={v => setFormBook({...formBook, active: v})} />{formBook.active && <MagicalTextArea rows={2} className="border-violet-500/30 mt-3" placeholder="Механика..." value={formBook.active_effects || ''} onChange={e => setFormBook({...formBook, active_effects: e.target.value})} />}</div>
          <MagicalTextArea required placeholder="Содержание" rows={6} value={formBook.description || ''} onChange={e => setFormBook({...formBook, description: e.target.value})} />
          <button type="submit" className="w-full mt-4 bg-slate-900 border-2 border-violet-500/50 text-violet-100 font-fantasy py-3 transition-all hover:bg-violet-900/40">Сохранить</button>
        </form>
      </Modal>

      <Modal isOpen={isCategorySelectorOpen} onClose={() => setIsCategorySelectorOpen(false)} title="Выбрать Категорию" size="full">
          <div className="h-full overflow-y-auto p-4"><CategoryTreeSelector nodes={tree} onSelect={(id) => { setFormBook({...formBook, category: id}); setIsCategorySelectorOpen(false); }} selectedId={formBook.category || null} /></div>
      </Modal>
    </div>
  );
};
