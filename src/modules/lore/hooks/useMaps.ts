
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { GameMap, MapPin } from '../types';

export const useMaps = () => {
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [loading, setLoading] = useState(true);
  const loaded = useRef(false);

  const fetchMaps = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Ensure markers is an array
      const sanitized = (data || []).map((m: any) => ({
          ...m,
          markers: Array.isArray(m.markers) ? m.markers : []
      }));

      setMaps(sanitized);
    } catch (error) {
      console.error('Error fetching maps:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetchMaps();
  }, [fetchMaps]);

  const addMap = async (map: Omit<GameMap, 'id' | 'markers'>) => {
      try {
          const payload = {
              ...map,
              markers: [] // Start empty
          };

          const { data, error } = await supabase
            .from('maps')
            .insert([payload])
            .select()
            .single();

          if (error) throw error;
          
          if (data) {
              setMaps(prev => [...prev, { ...data, markers: [] }]);
          }
      } catch (err) {
          console.error("Error adding map:", err);
      }
  };

  const updateMap = async (id: string, updates: Partial<GameMap>) => {
      // Optimistic
      setMaps(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));

      try {
          // Remove markers from update payload if it's not intended (usually markers are updated separately)
          // But if passed, allow it.
          const { error } = await supabase
            .from('maps')
            .update(updates)
            .eq('id', id);

          if (error) throw error;
      } catch (err) {
          console.error("Error updating map:", err);
          fetchMaps(); // Revert
      }
  };

  const updateMapMarkers = async (mapId: string, markers: MapPin[]) => {
      // Optimistic
      setMaps(prev => prev.map(m => m.id === mapId ? { ...m, markers } : m));

      try {
          const { error } = await supabase
            .from('maps')
            .update({ markers: markers })
            .eq('id', mapId);

          if (error) throw error;
      } catch (err) {
          console.error("Error updating markers:", err);
          fetchMaps(); // Revert
      }
  };

  return { maps, loading, addMap, updateMap, updateMapMarkers, refresh: fetchMaps };
};
