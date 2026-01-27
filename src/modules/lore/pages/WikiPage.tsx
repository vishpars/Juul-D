import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useWiki } from '../hooks/useWiki';
import { useLoreCategories } from '../hooks/useLoreCategories';
import { Book, ChevronRight, Edit, Save, Plus, Trash2, X, Search, Folder, FolderOpen, ChevronDown, Menu, Library, Scroll, ScrollText, CornerUpLeft, BookOpen, FileText, Edit2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { WikiArticle, LoreCategory } from '../types';

interface WikiPageProps {
    isAdmin: boolean;
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

interface WikiNode extends LoreCategory {
    children: WikiNode[];
}

const buildWikiTree = (categories: LoreCategory[]): WikiNode[] => {
    const map = new Map<string, WikiNode>();
    const roots: WikiNode[] = [];
    
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

const getLineage = (categories: LoreCategory[], targetId: string | null): LoreCategory[] => {
    if (!targetId) return [];
    const target = categories.find(c => c.id === targetId);
    if (!target) return [];
    
    if (target.parent_id) {
        return [...getLineage(categories, target.parent_id), target];
    }
    return [target];
};

// --- Components ---

// Tree Selector for Modal (Recursive)
const WikiTreeSelector: React.FC<{
    nodes: WikiNode[];
    onSelect: (id: string | null) => void;
    selectedId: string | null;
    level?: number;
}> = ({ nodes, onSelect, selectedId, level = 0 }) => {
    return (
        <div className="space-y-1">
            {nodes.map(node => (
                <div key={node.id}>
                    <button
                        type="button"
                        onClick={() => onSelect(node.id)}
                        className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${selectedId === node.id ? 'bg-violet-600/30 text-white border border-violet-500/50' : 'text-slate-400 hover:bg-slate-800'}`}
                        style={{ paddingLeft: `${(level * 12) + 8}px` }}
                    >
                        {selectedId === node.id ? <FolderOpen size={14} className="text-violet-400" /> : <Folder size={14} />}
                        <span className="text-sm font-fantasy tracking-wide">{node.name}</span>
                    </button>
                    {node.children.length > 0 && (
                        <div className="border-l border-slate-800 ml-3">
                             <WikiTreeSelector nodes={node.children} onSelect={onSelect} selectedId={selectedId} level={level + 1} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


const WikiCategoryNode: React.FC<{
    node: WikiNode;
    selectedCategoryId: string | null;
    expandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
    onSelectCategory: (id: string) => void;
    articles: WikiArticle[];
    onSelectArticle: (id: string) => void;
    selectedArticleId: string | null;
    isAdmin: boolean;
    onEditCategory: (node: WikiNode) => void;
    onHover: (e: React.MouseEvent, desc?: string) => void;
    onLeave: () => void;
}> = ({ node, selectedCategoryId, expandedIds, onToggleExpand, onSelectCategory, articles, onSelectArticle, selectedArticleId, isAdmin, onEditCategory, onHover, onLeave }) => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const nodeArticles = articles.filter(a => a.category_id === node.id);
    const hasArticles = nodeArticles.length > 0;

    return (
        <div className="select-none pl-2">
            <div 
                className={`
                    group relative flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer transition-all border border-transparent
                    ${selectedCategoryId === node.id ? 'bg-violet-900/30 text-white border-violet-500/20' : 'text-slate-400 hover:text-violet-200 hover:bg-white/5'}
                `}
                onClick={() => onSelectCategory(node.id)}
                onMouseEnter={(e) => onHover(e, node.description)}
                onMouseLeave={onLeave}
            >
                 <button 
                    onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}
                    className={`p-0.5 rounded hover:bg-white/10 ${hasChildren || hasArticles ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    {isExpanded ? <FolderOpen size={14} className="text-violet-500 shrink-0" /> : <Folder size={14} className="text-slate-600 shrink-0" />}
                    <span className="truncate font-fantasy tracking-wide text-sm">{node.name}</span>
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={(e) => { e.stopPropagation(); onEditCategory(node); }}
                            className="p-1 hover:text-violet-400 text-slate-500" title="Редактировать Главу"
                         >
                             <Edit2 size={10} />
                         </button>
                    </div>
                )}
            </div>

            {/* Children & Articles */}
            {isExpanded && (
                <div className="border-l border-violet-500/10 ml-3">
                    {/* Articles in this Category */}
                    {nodeArticles.map(article => (
                        <div 
                            key={article.id}
                            onClick={(e) => { e.stopPropagation(); onSelectArticle(article.id); }}
                            className={`
                                pl-6 py-1 pr-2 text-sm flex items-center gap-2 cursor-pointer transition-colors border-l-2 -ml-[1px]
                                ${selectedArticleId === article.id 
                                    ? 'text-violet-300 border-violet-500 bg-violet-500/5 font-bold' 
                                    : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700'}
                            `}
                        >
                            <FileText size={14} className={selectedArticleId === article.id ? 'text-violet-400' : 'text-slate-600'} />
                            <span className="truncate font-serif italic">{article.name}</span>
                        </div>
                    ))}

                    {/* Subcategories */}
                    {node.children.map(child => (
                        <WikiCategoryNode 
                            key={child.id}
                            node={child}
                            selectedCategoryId={selectedCategoryId}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            onSelectCategory={onSelectCategory}
                            articles={articles}
                            onSelectArticle={onSelectArticle}
                            selectedArticleId={selectedArticleId}
                            isAdmin={isAdmin}
                            onEditCategory={onEditCategory}
                            onHover={onHover}
                            onLeave={onLeave}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const WikiPage: React.FC<WikiPageProps> = ({ isAdmin }) => {
  const { articles, addArticle, updateArticle, deleteArticle } = useWiki();
  const { categories, addCategory, deleteCategory, updateCategory } = useLoreCategories();
  
  // Selection State
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Navigation State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Tooltip State
  const [tooltip, setTooltip] = useState<{x: number, y: number, text: string} | null>(null);

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // Modals
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isParentSelectorOpen, setIsParentSelectorOpen] = useState(false);
  const [isArticleCategorySelectorOpen, setIsArticleCategorySelectorOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Forms
  const [newArticle, setNewArticle] = useState<Partial<WikiArticle>>({});
  
  // Category Form State
  const [catForm, setCatForm] = useState<{id?: string, name: string, description: string, parent_id: string | null}>({ name: '', description: '', parent_id: null });

  const selectedArticle = useMemo(() => articles.find(a => a.id === selectedArticleId), [articles, selectedArticleId]);
  const tree = useMemo(() => buildWikiTree(categories), [categories]);
  const lineage = useMemo(() => getLineage(categories, selectedCategoryId || selectedArticle?.category_id || null), [categories, selectedCategoryId, selectedArticle]);
  
  const categoryArticles = useMemo(() => {
    // If null, return articles with no category (orphans)
    if (!selectedCategoryId) return articles.filter(a => !a.category_id);
    return articles.filter(a => a.category_id === selectedCategoryId);
  }, [selectedCategoryId, articles]);

  const visibleSubcategories = useMemo(() => {
    // If null, return root categories
    if (!selectedCategoryId) return categories.filter(c => !c.parent_id);
    return categories.filter(c => c.parent_id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  // Sync breadcrumb expansion
  useEffect(() => {
      if(selectedCategoryId) {
          // Ensure path is expanded
          const path = getLineage(categories, selectedCategoryId);
          setExpandedIds(prev => {
              const next = new Set(prev);
              path.forEach(c => next.add(c.id));
              return next;
          });
      }
  }, [selectedCategoryId, categories]);

  // --- Handlers ---

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const handleSelectArticle = (id: string) => {
      setSelectedArticleId(id);
      setIsEditing(false);
      // On mobile we might want to close sidebar, but keeping it simple for now or relying on user toggle
      if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSelectCategory = (id: string | null) => {
      setSelectedCategoryId(id);
      setSelectedArticleId(null);
  };

  const handleEditStart = () => {
      if(selectedArticle) {
          setEditContent(selectedArticle.content);
          setEditTitle(selectedArticle.name);
          setIsEditing(true);
      }
  };

  const handleSave = () => {
      if(selectedArticleId && editContent) {
          updateArticle(selectedArticleId, editContent, editTitle, selectedArticle?.category_id);
          setIsEditing(false);
      }
  };

  const handleDeleteArticle = () => {
      setConfirmState({
          isOpen: true,
          title: "Удалить Свиток",
          message: "Вы уверены? Это знание будет утеряно.",
          onConfirm: () => {
              if (selectedArticleId) {
                  deleteArticle(selectedArticleId);
                  setSelectedArticleId(null);
                  setIsEditing(false);
              }
          }
      });
  };

  const handleCreateArticle = (e: React.FormEvent) => {
      e.preventDefault();
      if(newArticle.name && newArticle.content && newArticle.category_id) {
          addArticle(newArticle as Omit<WikiArticle, 'id'>);
          setIsArticleModalOpen(false);
          setNewArticle({});
          if(newArticle.category_id) {
              setExpandedIds(prev => new Set(prev).add(newArticle.category_id!));
              setSelectedCategoryId(newArticle.category_id);
          }
      }
  };

  const handleOpenCategoryModal = (parentId: string | null = null, editNode: WikiNode | null = null) => {
      if (editNode) {
          setCatForm({
              id: editNode.id,
              name: editNode.name,
              description: editNode.description || '',
              parent_id: editNode.parent_id || null
          });
      } else {
          setCatForm({
              name: '',
              description: '',
              parent_id: parentId
          });
      }
      setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(catForm.name) {
          if (catForm.id) {
              updateCategory(catForm.id, {
                  name: catForm.name,
                  description: catForm.description,
                  parent_id: catForm.parent_id
              });
          } else {
              addCategory({
                  name: catForm.name,
                  description: catForm.description,
                  parent_id: catForm.parent_id
              });
          }
          setIsCategoryModalOpen(false);
          if(catForm.parent_id) {
               setExpandedIds(prev => new Set(prev).add(catForm.parent_id!));
          }
      }
  };

  const handleDeleteCategory = () => {
      setConfirmState({
          isOpen: true,
          title: "Удалить Главу",
          message: "Уничтожить эту главу и все знания внутри?",
          onConfirm: () => {
              if (catForm.id) {
                  deleteCategory(catForm.id);
                  setIsCategoryModalOpen(false);
              }
          }
      });
  };

  const handleTooltipHover = (e: React.MouseEvent, desc?: string) => {
      if(desc) {
          setTooltip({ x: e.clientX, y: e.clientY, text: desc });
      } else {
          setTooltip(null);
      }
  };

  const handleOpenNewArticle = () => {
      setNewArticle({ category_id: selectedCategoryId });
      setIsArticleModalOpen(true);
  };

  return (
    <div className="h-full flex relative overflow-hidden">
      
      {/* Floating Tooltip (Fixed Position to escape overflow) */}
      {tooltip && (
          <div 
            className="fixed z-[100] pointer-events-none bg-slate-900/95 border border-violet-500/30 p-3 rounded-lg shadow-xl max-w-xs text-xs text-slate-300 backdrop-blur-md"
            style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}
          >
              <div className="text-violet-400 font-bold mb-1 text-[10px] uppercase tracking-wider">Описание</div>
              <p className="italic leading-relaxed">{tooltip.text}</p>
          </div>
      )}

      {/* Sidebar - Drawer Style like Library */}
      <div 
        className={`
            absolute inset-y-0 left-0 z-30 w-full md:w-64 bg-slate-950/90 md:bg-slate-950/40 backdrop-blur-xl border-r border-violet-500/20 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-2 border-b border-white/5 flex justify-between items-center shrink-0">
           <h3 className="text-violet-200 font-fantasy text-sm flex items-center gap-2 drop-shadow-sm">
             <BookOpen size={14} className="text-violet-500" /> Кодекс
           </h3>
           <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white p-1">
             <Menu size={16} />
           </button>
        </div>

        <div className="p-2 border-b border-violet-500/10 flex items-center gap-2 shrink-0 bg-violet-900/5">
            {isAdmin && (
                <button 
                    onClick={() => handleOpenCategoryModal(selectedCategoryId)} 
                    className="flex-1 text-slate-400 hover:text-emerald-300 p-2 bg-slate-900/50 rounded border border-slate-800 hover:border-emerald-500/50 transition-colors flex items-center justify-center gap-2 text-xs" 
                    title="Новая Глава"
                >
                    <FolderOpen size={14} /> Новая Глава
                </button>
            )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar" onMouseLeave={() => setTooltip(null)}>
            <button 
                onClick={() => { handleSelectCategory(null); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                className={`w-full text-left px-2 py-2 rounded text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 transition-colors ${selectedCategoryId === null ? 'bg-white/5 text-white border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Search size={12} /> Главный Архив
            </button>
            
            {tree.map(node => (
                <WikiCategoryNode 
                    key={node.id}
                    node={node}
                    selectedCategoryId={selectedCategoryId}
                    expandedIds={expandedIds}
                    onToggleExpand={toggleExpand}
                    onSelectCategory={(id) => { handleSelectCategory(id); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                    articles={articles}
                    onSelectArticle={handleSelectArticle}
                    selectedArticleId={selectedArticleId}
                    isAdmin={isAdmin}
                    onEditCategory={(n) => handleOpenCategoryModal(null, n)}
                    onHover={handleTooltipHover}
                    onLeave={() => setTooltip(null)}
                />
            ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-0 md:ml-64' : 'ml-0'} h-full overflow-hidden bg-black/20 relative`}>
         
         {/* Unified Header */}
         <div className="bg-slate-900/90 backdrop-blur-md border-b border-violet-500/20 p-3 sticky top-0 z-20 flex flex-wrap gap-3 justify-between items-center shadow-lg shrink-0 min-h-[3.5rem]">
             <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
                <h2 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="text-xl font-fantasy text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 flex items-center gap-2 drop-shadow-sm shrink-0 cursor-pointer select-none hover:brightness-125 transition-all active:scale-95"
                >
                    <BookOpen className="text-violet-500 drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]" size={20} /> Кодекс
                </h2>

                 {/* Divider & Context */}
                 <div className="hidden md:block h-5 w-px bg-white/10"></div>
                 
                 {/* Breadcrumbs */}
                 <div className="flex items-center text-xs font-fantasy whitespace-nowrap overflow-x-auto custom-scrollbar pb-1 mask-linear-fade">
                     <button onClick={() => setSelectedCategoryId(null)} className="hover:text-violet-400 transition-colors text-slate-300 px-1 flex items-center gap-1">
                         <Library size={12} /> Главный Архив
                     </button>
                     {lineage.map((cat) => (
                         <React.Fragment key={cat.id}>
                             <ChevronRight size={10} className="mx-1 text-slate-600" />
                             <button 
                                 onClick={() => handleSelectCategory(cat.id)}
                                 className={`hover:text-violet-400 transition-colors ${cat.id === selectedCategoryId ? 'text-violet-300 font-bold underline decoration-violet-500/30 shadow-violet-500/20' : 'text-slate-300'}`}
                             >
                                 {cat.name}
                             </button>
                         </React.Fragment>
                     ))}
                 </div>
             </div>

             <div className="flex gap-2 shrink-0 ml-auto">
                {isAdmin && (
                    <button 
                        onClick={handleOpenNewArticle} 
                        className="flex items-center gap-1 bg-violet-700/80 hover:bg-violet-600 text-white px-2 py-1 rounded transition-all border border-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)] text-[10px] uppercase tracking-wider font-bold"
                    >
                        <Plus size={10} /> Вписать
                    </button>
                )}
             </div>
         </div>

         {/* Content Body */}
         {selectedArticle ? (
             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 relative z-10">
                 {isAdmin && (
                     <div className="absolute top-4 right-6 flex gap-2 z-20">
                         {!isEditing ? (
                             <>
                                <button onClick={handleEditStart} className="p-2 bg-slate-800/50 border border-slate-700 rounded hover:bg-violet-700/80 hover:text-white transition-colors text-slate-400 backdrop-blur-sm"><Edit size={16} /></button>
                                <button onClick={handleDeleteArticle} className="p-2 bg-slate-800/50 border border-slate-700 rounded hover:bg-red-700/80 hover:text-white transition-colors text-slate-400 backdrop-blur-sm"><Trash2 size={16} /></button>
                             </>
                         ) : (
                             <>
                                <button onClick={handleSave} className="p-2 bg-emerald-600/80 border border-emerald-500 rounded hover:bg-emerald-500 text-white transition-colors shadow-[0_0_10px_rgba(16,185,129,0.3)]"><Save size={16} /></button>
                                <button onClick={() => setIsEditing(false)} className="p-2 bg-slate-700/80 border border-slate-600 rounded hover:bg-slate-600 text-white transition-colors"><X size={16} /></button>
                             </>
                         )}
                     </div>
                 )}

                 {isEditing ? (
                     <div className="flex flex-col h-full space-y-4">
                         <input 
                            className="text-4xl font-fantasy bg-transparent border-b border-violet-500/50 text-white focus:outline-none pb-2 focus:border-violet-400 transition-colors"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                         />
                         <textarea 
                            className="flex-1 bg-slate-900/50 border border-violet-500/20 p-6 rounded-lg text-slate-200 font-mono focus:border-violet-500/50 outline-none resize-none backdrop-blur-sm shadow-inner"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                         />
                     </div>
                 ) : (
                    <article className="prose prose-invert prose-violet max-w-none mx-auto pb-20">
                        <div className="flex items-center gap-3 mb-8 opacity-50">
                            <Scroll size={24} className="text-violet-400" />
                            <div className="h-px bg-gradient-to-r from-violet-500 to-transparent flex-1"></div>
                        </div>
                        <h1 className="font-fantasy text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-white pb-2 drop-shadow-[0_0_10px_rgba(139,92,246,0.3)] inline-block leading-tight">
                            {selectedArticle.name}
                        </h1>
                        <div className="text-slate-200/90 leading-loose whitespace-pre-wrap font-serif text-lg tracking-wide mt-8">
                            {selectedArticle.content}
                        </div>
                    </article>
                 )}
             </div>
         ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 relative z-10">
                 <h2 className="text-3xl font-fantasy text-violet-200 mb-6 border-b border-violet-500/30 pb-2 flex items-center gap-3">
                    {selectedCategoryId ? <FolderOpen size={24} className="text-violet-500" /> : <Library size={24} className="text-violet-500" />}
                    {selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.name : "Главный Архив"}
                 </h2>

                 {/* Subcategories (Folders) */}
                 {visibleSubcategories.length > 0 && (
                     <div className="mb-6">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-violet-300/70 mb-2 border-b border-violet-500/20 pb-1">
                            {selectedCategoryId ? "Подглавы" : "Архивы"}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {visibleSubcategories.map(cat => (
                                <div 
                                    key={cat.id} 
                                    onClick={() => handleSelectCategory(cat.id)}
                                    className="group bg-slate-900/40 border border-slate-700/50 hover:border-violet-500/50 hover:bg-violet-900/20 hover:shadow-[0_0_15px_rgba(139,92,246,0.2)] p-2 rounded flex items-center gap-2 cursor-pointer transition-all"
                                >
                                    <div className="p-1 bg-white/5 rounded text-slate-500 group-hover:text-violet-300 transition-colors">
                                        <Folder size={12} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h4 className="text-slate-300 text-[11px] font-medium truncate group-hover:text-violet-100 font-fantasy tracking-wide">{cat.name}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                 )}
                 
                 {/* Articles */}
                 {categoryArticles.length > 0 ? (
                    <>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-violet-300/70 mb-2 border-b border-violet-500/20 pb-1">Тексты</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {categoryArticles.map(article => (
                                <div 
                                    key={article.id}
                                    onClick={() => handleSelectArticle(article.id)}
                                    className="group bg-slate-900/60 border border-slate-700/50 p-3 rounded-lg cursor-pointer hover:bg-violet-900/20 hover:border-violet-500/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden aspect-[4/3] text-center"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    <div className="p-2 bg-slate-950 rounded-full border border-slate-800 group-hover:border-violet-500/30 transition-colors shrink-0 relative z-10 shadow-lg">
                                        <div className="relative w-6 h-6">
                                            <Scroll className="absolute inset-0 text-slate-400 group-hover:opacity-0 transition-opacity duration-300 scale-100 group-hover:scale-75" size={24} />
                                            <ScrollText className="absolute inset-0 text-violet-300 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100" size={24} />
                                        </div>
                                    </div>
                                    
                                    <div className="relative z-10 w-full px-1">
                                        <h3 className="font-fantasy text-xs text-slate-300 group-hover:text-violet-100 transition-colors line-clamp-2 leading-tight tracking-wide">{article.name}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                 ) : (
                    /* Empty State Handling */
                    visibleSubcategories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-4 italic border-2 border-dashed border-slate-800 rounded-xl bg-black/20">
                            <Scroll size={32} className="opacity-50" />
                            <span>В этой главе нет свитков...</span>
                        </div>
                    ) : (
                        <div className="text-slate-500 text-xs italic py-4 text-center opacity-50">
                            В этом архиве нет отдельных свитков...
                        </div>
                    )
                 )}
            </div>
         )}
      </div>

      {/* --- Modals --- */}
      
      {/* New Article Modal */}
      <Modal isOpen={isArticleModalOpen} onClose={() => setIsArticleModalOpen(false)} title="Вписать Свиток">
          <form onSubmit={handleCreateArticle} className="space-y-4">
              <MagicalInput required placeholder="Название текста" 
                value={newArticle.name || ''} onChange={e => setNewArticle({...newArticle, name: e.target.value})} />
              
              {/* Category Tree Selector Trigger */}
              <div className="relative">
                 <label className="text-xs text-slate-400 mb-1 block">Секция (Глава)</label>
                 <button 
                    type="button"
                    onClick={() => setIsArticleCategorySelectorOpen(!isArticleCategorySelectorOpen)}
                    className="w-full text-left bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 flex justify-between items-center hover:border-violet-500 transition-colors"
                 >
                     <span className={!newArticle.category_id ? 'text-violet-900/40' : ''}>
                         {newArticle.category_id ? categories.find(c => c.id === newArticle.category_id)?.name : 'Выберите Главу...'}
                     </span>
                     <ChevronDown size={14} className={`transition-transform ${isArticleCategorySelectorOpen ? 'rotate-180' : ''}`} />
                 </button>
                 
                 {isArticleCategorySelectorOpen && (
                     <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-900 border border-violet-500/30 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar p-2">
                         <WikiTreeSelector 
                            nodes={tree} 
                            onSelect={(id) => { setNewArticle({...newArticle, category_id: id}); setIsArticleCategorySelectorOpen(false); }}
                            selectedId={newArticle.category_id || null}
                         />
                     </div>
                 )}
              </div>

              <MagicalTextArea required placeholder="Содержание (Markdown)" rows={10} 
                value={newArticle.content || ''} onChange={e => setNewArticle({...newArticle, content: e.target.value})} />
              
              <button type="submit" className="w-full mt-4 group relative px-6 py-3 bg-slate-900 border-2 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] text-violet-100 font-fantasy tracking-[0.2em] uppercase hover:bg-violet-900/40 hover:border-violet-400 hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] transition-all duration-300 overflow-hidden">
                  <span className="relative z-10">Записать Знание</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-400/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </button>
          </form>
      </Modal>

      {/* Category Modal (Create / Edit) */}
      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={catForm.id ? "Редактировать Главу" : "Новая Глава"}>
         <form onSubmit={handleCategorySubmit} className="space-y-4">
             {/* Tree Parent Selector */}
             <div className="relative">
                 <label className="text-xs text-slate-400 mb-1 block">Родительская Глава</label>
                 <button 
                    type="button"
                    onClick={() => setIsParentSelectorOpen(!isParentSelectorOpen)}
                    className="w-full text-left bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 flex justify-between items-center hover:border-violet-500 transition-colors"
                 >
                     <span>{catForm.parent_id ? categories.find(c => c.id === catForm.parent_id)?.name : 'Главный Архив'}</span>
                     <ChevronDown size={14} className={`transition-transform ${isParentSelectorOpen ? 'rotate-180' : ''}`} />
                 </button>
                 
                 {isParentSelectorOpen && (
                     <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-900 border border-violet-500/30 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar p-2">
                         <button 
                             type="button"
                             onClick={() => { setCatForm({...catForm, parent_id: null}); setIsParentSelectorOpen(false); }}
                             className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-400 text-sm italic border-b border-slate-800 mb-1"
                         >
                             Главный Архив
                         </button>
                         <WikiTreeSelector 
                            nodes={tree} 
                            onSelect={(id) => { setCatForm({...catForm, parent_id: id}); setIsParentSelectorOpen(false); }}
                            selectedId={catForm.parent_id}
                         />
                     </div>
                 )}
             </div>

             <MagicalInput required placeholder="Название Главы" 
                 value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} />
             
             <div className="space-y-1">
                 <label className="text-xs text-slate-400">Описание</label>
                 <MagicalTextArea placeholder="Краткое описание..." rows={3}
                     value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} />
             </div>

             <div className="flex gap-2 mt-6">
                 {catForm.id && (
                     <button type="button" onClick={handleDeleteCategory} className="px-4 py-3 bg-red-900/30 border border-red-800 text-red-400 rounded hover:bg-red-900/60 transition-colors">
                         <Trash2 size={20} />
                     </button>
                 )}
                 <button type="submit" className="flex-1 group relative px-6 py-3 bg-slate-900 border-2 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] text-emerald-100 font-fantasy tracking-[0.2em] uppercase hover:bg-emerald-900/40 hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all duration-300 overflow-hidden">
                    <span className="relative z-10">{catForm.id ? "Обновить Главу" : "Создать Главу"}</span>
                 </button>
             </div>
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

export default WikiPage;