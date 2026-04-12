import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';

interface CollectionGoal {
  id: number;
  name: string;
  filters: string;
  scope: string;
  target_count: number;
  is_default: number;
  created_at: string;
}

export function useCollectionGoals() {
  const [goals, setGoals] = useState<CollectionGoal[]>([]);
  const [activeGoal, setActiveGoal] = useState<CollectionGoal | null>(null);

  const load = useCallback(async () => {
    const data = await api.collection.goals.list();
    setGoals(data);
    setActiveGoal(prev => {
      if (prev) return prev; // don't override user selection
      return data.find((g: CollectionGoal) => g.is_default) ?? null;
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const createGoal = async (name: string, filters: any, scope: string, targetCount: number) => {
    const { id } = await api.collection.goals.create({
      name, filters, scope, target_count: targetCount, is_default: 0,
    });
    await load();
    return id;
  };

  const deleteGoal = async (id: number) => {
    await api.collection.goals.delete(id);
    if (activeGoal?.id === id) setActiveGoal(null);
    await load();
  };

  const selectGoal = (goal: CollectionGoal | null) => {
    setActiveGoal(goal);
  };

  return { goals, activeGoal, selectGoal, createGoal, deleteGoal, load };
}
