import { create } from 'zustand';
import type { OmegaOutput } from '@omega/core';

interface ConsoleState {
  domain: string;
  query: string;
  result: OmegaOutput | null;
  loading: boolean;
  error: string | null;
  setDomain: (d: string) => void;
  setQuery: (q: string) => void;
  setResult: (r: OmegaOutput | null) => void;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;
}

export const useConsoleStore = create<ConsoleState>((set) => ({
  domain: 'mock',
  query: '',
  result: null,
  loading: false,
  error: null,
  setDomain: (domain) => set({ domain }),
  setQuery: (query) => set({ query }),
  setResult: (result) => set({ result }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
