
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
            if (cat.parent_id && map.has(cat.parent_id)) map.get(cat.parent_id)!.children.push(node);
            else roots.push(node);
        }
    });
    return roots;
};

const getLineage = (categories: LoreCategory[], targetId: string | null): LoreCategory[] => {
    if (!targetId) return [];
    const target = categories.find(c => c.id === targetId);
    if (!target) return [];
    if (target.parent_id) return [...getLineage(categories, target.parent_id), target];
    return [target];
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
                className={`group relative flex items-start gap-1 py-1.5 px-2 rounded cursor-pointer transition-all border border-transparent ${selectedCategoryId === node.id ? 'bg-violet-900/30 text-white border-violet-500/20' : 'text-slate-400 hover:text-violet-200 hover:bg-white/5'}`}
                onClick={() => onSelectCategory(node.id)}
                onMouseEnter={(e) => onHover(e, node.description)}
                onMouseLeave={onLeave}
            >
                 <button onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }} className={`p-0.5 rounded hover:bg-white/10 mt-0.5 ${hasChildren || hasArticles ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0">{isExpanded ? <FolderOpen size={14} className="text-violet-500" /> : <Folder size={14} className="text-slate-600" />}</div>
                    <span className="font-fantasy tracking-wide text-sm break-words leading-tight pt-0.5">{node.name}</span>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 mt-0.5">
                         <button onClick={(e) => { e.stopPropagation(); onEditCategory(node); }} className="p-1 hover:text-violet-400 text-slate-500"><Edit2 size={10} /></button>
                    </div>
                )}
            </div>
            {isExpanded && (
                <div className="border-l border-violet-500/10 ml-3">
                    {nodeArticles.map(article => (
                        <div key={article.id} onClick={(e) => { e.stopPropagation(); onSelectArticle(article.id); }} className={`pl-6 py-1 pr-2 text-sm flex items-start gap-2 cursor-pointer transition-colors border-l-2 -ml-[1px] ${selectedArticleId === article.id ? 'text-violet-300 border-violet-500 bg-violet-500/5 font-bold' : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700'}`}>
                            <div className="mt-0.5 shrink-0"><FileText size={14} className={selectedArticleId === article.id ? 'text-violet-400' : 'text-slate-600'} /></div>
                            <span className="font-serif italic break-words leading-tight">{article.name}</span>
                        </div>
                    ))}
                    {node.children.map(child => (
                        <WikiCategoryNode key={child.id} node={child} selectedCategoryId={selectedCategoryId} expandedIds={expandedIds} onToggleExpand={onToggleExpand} onSelectCategory={onSelectCategory} articles={articles} onSelectArticle={onSelectArticle} selectedArticleId={selectedArticleId} isAdmin={isAdmin} onEditCategory={onEditCategory} onHover={onHover} onLeave={onLeave} />
                    ))}
                </div>
            )}
        </div>
    );
};

const WikiPage: React.FC<WikiPageProps> = ({ isAdmin }) => {
  const { articles, addArticle, updateArticle, deleteArticle } = useWiki();
  const { categories, addCategory, deleteCategory, updateCategory } = useLoreCategories();
  
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [tooltip, setTooltip] = useState<{x: number, y: number, text: string} | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [newArticle, setNewArticle] = useState<Partial<WikiArticle>>({});
  const [catForm, setCatForm] = useState<{id?: string, name: string, description: string, parent_id: string | null}>({ name: '', description: '', parent_id: null });

  const selectedArticle = useMemo(() => articles.find(a => a.id === selectedArticleId), [articles, selectedArticleId]);
  const tree = useMemo(() => buildWikiTree(categories), [categories]);
  const lineage = useMemo(() => getLineage(categories, selectedCategoryId || selectedArticle?.category_id || null), [categories, selectedCategoryId, selectedArticle]);
  
  const categoryArticles = useMemo(() => {
    if (!selectedCategoryId) return articles.filter(a => !a.category_id);
    return articles.filter(a => a.category_id === selectedCategoryId);
  }, [selectedCategoryId, articles]);

  const visibleSubcategories = useMemo(() => {
    if (!selectedCategoryId) return categories.filter(c => !c.parent_id);
    return categories.filter(c => c.parent_id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

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
      if (window.innerWidth < 1150) setIsSidebarOpen(false);
  };

  const handleSelectCategory = (id: string | null) => {
      setSelectedCategoryId(id);
      setSelectedArticleId(null);
      if (window.innerWidth < 1150 && id !== null) setIsSidebarOpen(false);
  };

  return (
    <div className="h-full flex relative overflow-hidden">
      <div className={`absolute inset-y-0 left-0 z-30 w-full min-[1150px]:w-64 bg-slate-950/90 min-[1150px]:bg-slate-950/40 backdrop-blur-xl border-r border-violet-500/20 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-2 border-b border-white/5 flex justify-between items-center shrink-0">
           <h3 className="text-violet-200 font-fantasy text-sm flex items-center gap-2"><BookOpen size={14} className="text-violet-500" /> Кодекс</h3>
           <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white p-1"><Menu size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            <button onClick={() => handleSelectCategory(null)} className={`w-full text-left px-2 py-2 rounded text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 transition-colors ${selectedCategoryId === null ? 'bg-white/5 text-white' : 'text-slate-500'}`}><Search size={12} /> Главный Архив</button>
            {tree.map(node => (
                <WikiCategoryNode 
                    key={node.id} node={node} selectedCategoryId={selectedCategoryId} expandedIds={expandedIds}
                    onToggleExpand={toggleExpand} onSelectCategory={handleSelectCategory} articles={articles}
                    onSelectArticle={handleSelectArticle} selectedArticleId={selectedArticleId} isAdmin={isAdmin}
                    onEditCategory={(n) => { setCatForm({id: n.id, name: n.name, description: n.description || '', parent_id: n.parent_id || null}); setIsCategoryModalOpen(true); }}
                    onHover={(e, d) => d && setTooltip({x: e.clientX, y: e.clientY, text: d})} onLeave={() => setTooltip(null)}
                />
            ))}
        </div>
      </div>
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-0 min-[1150px]:ml-64' : 'ml-0'} h-full overflow-hidden`}>
         <div className="bg-slate-900/90 backdrop-blur-md border-b border-violet-500/20 p-3 sticky top-0 z-20 flex flex-wrap gap-3 justify-between items-center shadow-lg">
             <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
                <h2 onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-xl font-fantasy text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 flex items-center gap-2 cursor-pointer select-none hover:brightness-125 transition-all active:scale-95"><BookOpen className="text-violet-500" size={20} /> Кодекс</h2>
                 <div className="flex items-center text-xs font-fantasy whitespace-nowrap overflow-x-auto custom-scrollbar pb-1">
                     <button onClick={() => handleSelectCategory(null)} className="hover:text-violet-400 text-slate-300 px-1 flex items-center gap-1"><Library size={12} /> Главный Архив</button>
                     {lineage.map((cat) => (
                         <React.Fragment key={cat.id}>
                             <ChevronRight size={10} className="mx-1 text-slate-600" />
                             <button onClick={() => handleSelectCategory(cat.id)} className={`hover:text-violet-400 ${cat.id === selectedCategoryId ? 'text-violet-300 font-bold underline' : 'text-slate-300'}`}>{cat.name}</button>
                         </React.Fragment>
                     ))}
                 </div>
             </div>
         </div>
         <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {selectedArticle ? (
                <article className="prose prose-invert prose-violet max-w-none mx-auto pb-20 break-words">
                    <h1 className="font-fantasy text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-white pb-2 leading-tight break-words">{selectedArticle.name}</h1>
                    <div className="text-slate-200/90 leading-loose whitespace-pre-wrap font-serif text-lg tracking-wide mt-8 break-words">{selectedArticle.content}</div>
                </article>
            ) : (
                <div className="space-y-6">
                    <h2 className="text-3xl font-fantasy text-violet-200 mb-6 border-b border-violet-500/30 pb-2 flex items-center gap-3">{selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.name : "Главный Архив"}</h2>
                    
                    {visibleSubcategories.length > 0 && (
                        <div className="grid grid-cols-1 min-[550px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {visibleSubcategories.map(cat => (
                                <div key={cat.id} onClick={() => handleSelectCategory(cat.id)} className="group bg-slate-900/40 border border-slate-700/50 hover:border-violet-500/50 p-4 rounded-xl flex items-center gap-4 cursor-pointer transition-all shadow-md">
                                    <div className="p-3 bg-white/5 rounded-lg text-slate-500 group-hover:text-violet-300 shrink-0"><Folder size={28} /></div>
                                    <div className="overflow-hidden"><h4 className="text-slate-300 text-sm font-medium font-fantasy break-words whitespace-normal leading-tight group-hover:text-violet-100">{cat.name}</h4></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {categoryArticles.length > 0 && (
                        <div className="grid grid-cols-1 gap-2">
                            <h3 className="text-sm font-bold uppercase text-slate-500 tracking-widest mb-2 mt-4 border-b border-white/5 pb-1">Статьи</h3>
                            {categoryArticles.map(article => (
                                <div key={article.id} onClick={() => handleSelectArticle(article.id)} className="flex items-center gap-3 p-3 bg-slate-900/30 border border-slate-800 rounded hover:bg-violet-900/20 hover:border-violet-500/30 cursor-pointer transition-all group">
                                    <FileText size={18} className="text-slate-500 group-hover:text-violet-400" />
                                    <span className="font-serif text-slate-300 group-hover:text-white">{article.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {visibleSubcategories.length === 0 && categoryArticles.length === 0 && (
                        <div className="text-center text-slate-600 italic py-10">В этом разделе пусто...</div>
                    )}
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default WikiPage;
