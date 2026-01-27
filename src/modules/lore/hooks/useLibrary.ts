
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { LibraryItem } from '../types';

export const useLibrary = () => {
  const [books, setBooks] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('library')
        .select('*');

      if (error) throw error;
      
      setBooks(data || []);
    } catch (err: any) {
      console.error("Supabase fetch failed:", err);
      setError(err.message || "Failed to load library");
      setBooks([]); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetchBooks();
  }, [fetchBooks]);

  const addBook = async (book: Omit<LibraryItem, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('library')
        .insert([book])
        .select()
        .single();

      if (error) throw error;
      if (data) {
          setBooks(prev => [data, ...prev]);
      }
      return data;
    } catch (err: any) {
      console.error("Error adding book:", err);
      setError("Failed to sync with server: " + err.message);
      throw err;
    }
  };

  const updateBook = async (id: string, updates: Partial<LibraryItem>) => {
    // Optimistic Update
    setBooks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));

    try {
      const { error } = await supabase
        .from('library')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error("Error updating book:", err);
      setError("Failed to update book");
      fetchBooks(); // Revert
    }
  };

  const deleteBook = async (id: string) => {
    // Optimistic Update
    const previousBooks = [...books];
    setBooks(prev => prev.filter(b => b.id !== id));

    try {
      const { error } = await supabase.from('library').delete().eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error("Error deleting book:", err);
      setError("Failed to delete book");
      // Rollback
      setBooks(previousBooks);
    }
  };

  return { books, loading, error, addBook, updateBook, deleteBook, refresh: fetchBooks };
};
