
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { LibraryCategory } from '../types';

// Helper to sort codes like "1.1", "1.2", "1.10" correctly
const compareCodes = (codeA: string = '', codeB: string = '') => {
  // Split by any non-digit character (dot, comma, etc.)
  const partsA = codeA.split(/[^0-9]+/).filter(p => p !== '').map(Number);
  const partsB = codeB.split(/[^0-9]+/).filter(p => p !== '').map(Number);

  const len = Math.max(partsA.length, partsB.length);
  
  for (let i = 0; i < len; i++) {
    // Treat missing segment as smaller (parent comes before child)
    // e.g. "1.1" (parts: [1,1]) vs "1.1.1" (parts: [1,1,1])
    // at i=2: undefined (-1) vs 1. Result: -1 - 1 = -2 (A comes first)
    const a = partsA[i] !== undefined ? partsA[i] : -1;
    const b = partsB[i] !== undefined ? partsB[i] : -1;

    if (a !== b) return a - b;
  }
  return 0;
};

export const useLibraryCategories = () => {
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      // We get data from DB, but we MUST sort client-side because 
      // SQL text sort considers "1.10" < "1.2".
      const { data, error } = await supabase
        .from('library_categories')
        .select('*');

      if (error) throw error;
      
      // Apply custom sort
      const sorted = (data || []).sort((a, b) => compareCodes(a.code, b.code));
      setCategories(sorted);
    } catch (err: any) {
      console.error("Error fetching categories:", err);
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

  const addCategory = async (name: string, parentId: number | null) => {
    try {
      const payload = {
        name,
        parent_id: parentId
      };

      // Removed .single() to prevent P0002 error if RLS hides the return value
      const { data, error } = await supabase
        .from('library_categories')
        .insert([payload])
        .select();

      if (error) throw error;

      const newCategory = data && data.length > 0 ? data[0] : null;

      if (newCategory) {
        setCategories(prev => {
            const newList = [...prev, newCategory];
            return newList.sort((a, b) => compareCodes(a.code, b.code));
        });
      } else {
        // If we didn't get the object back (e.g. RLS), refresh list to be safe
        await fetchCategories();
      }
      
      return newCategory;
    } catch (err: any) {
      console.error("Error adding category:", err);
      setError("Failed to add category: " + err.message);
      throw err;
    }
  };

  const updateCategory = async (id: number, updates: Partial<LibraryCategory>) => {
    // Optimistic Update
    setCategories(prev => {
        const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
        return updated.sort((a, b) => compareCodes(a.code, b.code));
    });

    try {
      const { error } = await supabase
        .from('library_categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error("Error updating category:", err);
      setError("Failed to update category: " + err.message);
      fetchCategories(); // Revert
    }
  };

  const deleteCategory = async (id: number) => {
    // Optimistic Update
    const prevCats = [...categories];
    setCategories(prev => prev.filter(c => c.id !== id));

    try {
      const { error } = await supabase
        .from('library_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error("Error deleting category:", err);
      setError("Failed to delete category: " + err.message);
      setCategories(prevCats); // Revert
    }
  };

  return { categories, loading, error, addCategory, updateCategory, deleteCategory, refresh: fetchCategories };
};
