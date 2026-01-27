
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Quest, QuestStatus } from '../types';

export const useQuests = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const loaded = useRef(false);

  const fetchQuests = useCallback(async () => {
    setLoading(true);
    try {
      // 'created_at' column is missing in the user's table, so we remove the sort
      const { data, error } = await supabase
        .from('quests')
        .select('*');

      if (error) throw error;
      
      const mappedQuests: Quest[] = (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          reward: row.reward,
          type: row.type,
          status: row.status,
          // Extract alignment from details if missing in column (fallback for schema compatibility)
          alignment: row.details?.alignment || row.alignment || 'Neutral',
          details: {
              givenBy: row.details?.givenBy || 'Unknown',
              acceptedBy: row.details?.acceptedBy || []
          },
          created_at: row.created_at // Will be undefined if column missing
      }));

      setQuests(mappedQuests);
    } catch (e) {
      console.error("Error loading quests:", e);
      setQuests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetchQuests();
  }, [fetchQuests]);

  const addQuest = async (quest: Omit<Quest, 'id'>) => {
    try {
        // Persist alignment in details since the column might not exist in the user's table
        const dbPayload = {
            title: quest.title,
            description: quest.description,
            reward: quest.reward,
            type: quest.type,
            status: quest.status,
            details: {
                ...quest.details,
                alignment: quest.alignment 
            }
        };

        const { data, error } = await supabase
            .from('quests')
            .insert([dbPayload])
            .select()
            .single();

        if (error) throw error;
        
        if (data) {
            const newQuest: Quest = {
                id: data.id,
                title: data.title,
                description: data.description,
                reward: data.reward,
                type: data.type,
                status: data.status,
                alignment: data.details?.alignment || quest.alignment || 'Neutral',
                details: {
                    givenBy: data.details?.givenBy || quest.details.givenBy,
                    acceptedBy: data.details?.acceptedBy || quest.details.acceptedBy
                },
                created_at: data.created_at
            };
            setQuests(prev => [newQuest, ...prev]);
        }
    } catch (err) {
        console.error("Error adding quest:", err);
    }
  };

  const editQuest = async (id: string, updates: Partial<Quest>) => {
      try {
          const current = quests.find(q => q.id === id);
          if (!current) return;

          // Prepare payload. alignment must go into details, NOT root.
          const dbPayload: any = {
              title: updates.title,
              description: updates.description,
              reward: updates.reward,
              type: updates.type,
              status: updates.status,
              details: {
                  ...(current.details || {}),
                  ...(updates.details || {}),
                  alignment: updates.alignment || current.alignment
              }
          };

          // Optimistic update
          setQuests(prev => prev.map(q => q.id === id ? { 
              ...q, 
              ...updates, 
              details: dbPayload.details,
              alignment: dbPayload.details.alignment 
          } : q));

          const { error } = await supabase
            .from('quests')
            .update(dbPayload)
            .eq('id', id);

          if (error) throw error;
      } catch (err) {
          console.error("Error editing quest:", err);
          fetchQuests(); // Revert
      }
  };

  const updateStatus = async (id: string, status: QuestStatus) => {
    // Optimistic Update
    setQuests(prev => prev.map(q => q.id === id ? { ...q, status } : q));
    
    try {
        await supabase.from('quests').update({ status }).eq('id', id);
    } catch (err) {
        console.error("Error updating status:", err);
        fetchQuests(); // Revert on error
    }
  };

  const acceptQuest = async (id: string, acceptedBy: string[]) => {
      const current = quests.find(q => q.id === id);
      if (!current) return;

      const newDetails = {
          ...current.details,
          acceptedBy,
          alignment: current.alignment // Preserve alignment in DB stash
      };

      // Optimistic
      setQuests(prev => prev.map(q => q.id === id ? { 
          ...q, 
          status: QuestStatus.IN_PROGRESS, 
          details: { ...q.details, acceptedBy } 
      } : q));

      try {
          await supabase.from('quests').update({
              status: QuestStatus.IN_PROGRESS,
              details: newDetails
          }).eq('id', id);
      } catch (err) {
          console.error("Error accepting quest:", err);
          fetchQuests();
      }
  };

  return { quests, loading, addQuest, editQuest, updateStatus, acceptQuest, refresh: fetchQuests };
};
