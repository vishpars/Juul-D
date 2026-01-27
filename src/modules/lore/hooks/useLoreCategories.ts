
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { LoreCategory } from '../types';

export const useLoreCategories = () => {
  const [categories, setCategories] = useState<LoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lore_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error("Error fetching lore categories:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (category: Omit<LoreCategory, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('lore_categories')
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      if (data) {
          setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      }
      return data;
    } catch (err: any) {
      console.error("Error adding lore category:", err);
      setError(err.message);
    }
  };

  const updateCategory = async (id: string, updates: Partial<LoreCategory>) => {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      try {
          const { error } = await supabase.from('lore_categories').update(updates).eq('id', id);
          if (error) throw error;
      } catch (err: any) {
          console.error("Error updating lore category:", err);
          fetchCategories();
      }
  };

  const deleteCategory = async (id: string) => {
      const prev = [...categories];
      setCategories(list => list.filter(c => c.id !== id));
      try {
          const { error } = await supabase.from('lore_categories').delete().eq('id', id);
          if (error) throw error;
      } catch (err: any) {
          console.error("Error deleting lore category:", err);
          setCategories(prev);
      }
  };

  return { categories, loading, error, addCategory, updateCategory, deleteCategory, refresh: fetchCategories };
};
