
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { WikiArticle } from '../types';

export const useWiki = () => {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const loaded = useRef(false);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lore_articles')
        .select('*')
        .order('name');

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching lore articles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetchArticles();
  }, [fetchArticles]);

  const addArticle = async (article: Omit<WikiArticle, 'id'>) => {
    try {
        const { data, error } = await supabase
            .from('lore_articles')
            .insert([article])
            .select()
            .single();

        if (error) throw error;
        if (data) setArticles(prev => [...prev, data]);
    } catch (error) {
        console.error('Error adding lore article:', error);
    }
  };

  const updateArticle = async (id: string, content: string, name: string, category_id?: string | null) => {
      // Optimistic
      setArticles(prev => prev.map(a => a.id === id ? { ...a, content, name, category_id } : a));
      
      try {
          const { error } = await supabase
            .from('lore_articles')
            .update({ content, name, category_id })
            .eq('id', id);
            
          if (error) throw error;
      } catch (error) {
          console.error('Error updating article:', error);
          fetchArticles();
      }
  };

  const deleteArticle = async (id: string) => {
      const prev = [...articles];
      setArticles(prev.filter(a => a.id !== id));
      
      try {
          const { error } = await supabase
            .from('lore_articles')
            .delete()
            .eq('id', id);
            
          if (error) throw error;
      } catch (error) {
          console.error('Error deleting article:', error);
          setArticles(prev);
      }
  };

  return { articles, loading, addArticle, updateArticle, deleteArticle, refresh: fetchArticles };
};
