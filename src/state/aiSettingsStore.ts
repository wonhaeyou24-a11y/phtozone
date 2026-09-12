import { create } from 'zustand';
import { AI_PROVIDERS } from '../ai/aiManager';

interface AISettingsStore {
  enabled: boolean;
  providerId: string;
  model: string;
  /** Kept in memory only for this tab session — never written to localStorage or IndexedDB (spec section 21). */
  apiKey: string;
  setEnabled: (v: boolean) => void;
  setProviderId: (id: string) => void;
  setModel: (m: string) => void;
  setApiKey: (k: string) => void;
}

export const useAISettingsStore = create<AISettingsStore>((set) => ({
  enabled: false,
  providerId: AI_PROVIDERS[0].id,
  model: AI_PROVIDERS[0].defaultModel,
  apiKey: '',

  setEnabled: (enabled) => set({ enabled }),
  setProviderId: (providerId) => {
    const provider = AI_PROVIDERS.find((p) => p.id === providerId);
    set({ providerId, model: provider?.defaultModel ?? '' });
  },
  setModel: (model) => set({ model }),
  setApiKey: (apiKey) => set({ apiKey }),
}));
