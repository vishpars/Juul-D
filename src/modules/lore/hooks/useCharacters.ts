
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Character } from '../types';

export const useCharacters = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const fetchCharacters = async () => {
      setLoading(true);
      try {
        // Fetch 'data' column which contains the JSON structure (identity.faction, etc.)
        const { data, error } = await supabase
          .from('characters')
          .select('id, name, data')
          .order('name');

        if (error) throw error;
        setCharacters(data || []);
      } catch (e) {
        console.error("Error loading characters:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  return { characters, loading };
};
