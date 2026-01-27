
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Location } from '../types';

export const useLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const loaded = useRef(false);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetchLocations();
  }, [fetchLocations]);

  const addLocation = async (loc: Omit<Location, 'id'>) => {
    try {
        const { data, error } = await supabase.from('locations').insert([loc]).select().single();
        if (error) throw error;
        if (data) setLocations(prev => [...prev, data]);
    } catch (error) {
        console.error('Error adding location:', error);
    }
  };

  const updateLocation = async (id: string, updates: Partial<Location>) => {
    // Optimistic UI update
    setLocations(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    
    try {
        const { error } = await supabase.from('locations').update(updates).eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error('Error updating location:', error);
        fetchLocations(); // Revert on error
    }
  };

  const deleteLocation = async (id: string) => {
    const prevLocs = [...locations];
    setLocations(prev => prev.filter(l => l.id !== id));
    try {
        const { error } = await supabase.from('locations').delete().eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting location:', error);
        setLocations(prevLocs);
    }
  };

  return { locations, loading, addLocation, updateLocation, deleteLocation };
};
