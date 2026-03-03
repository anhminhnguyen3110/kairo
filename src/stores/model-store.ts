import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModelSelection } from '@/features/chat/types/chat.types';

export type { ModelSelection };

interface ModelState {
  selection: ModelSelection | null;
  setSelection: (s: ModelSelection | null) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      selection: null,
      setSelection: (selection) => set({ selection }),
    }),
    { name: 'model-selection' },
  ),
);
