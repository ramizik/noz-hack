import type { AgentMemory } from "./types";

// In-process store used only when DEMO_MOCK_MODE=true.
// Lives for the lifetime of the dev server; resets on restart.
const store = new Map<string, AgentMemory>();

export const mockStore = {
  read(incidentId: string): AgentMemory | null {
    return store.get(incidentId) ?? null;
  },
  write(incidentId: string, memory: AgentMemory): void {
    store.set(incidentId, memory);
  },
  list(): AgentMemory[] {
    return Array.from(store.values());
  },
  reset(): void {
    store.clear();
  },
};
