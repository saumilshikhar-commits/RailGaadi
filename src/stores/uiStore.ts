import { create } from 'zustand';

// ─── Map UI Store ─────────────────────────────────────────────────────────────
interface MapStore {
  followMode: boolean;
  setFollowMode: (v: boolean) => void;
  toggleFollowMode: () => void;

  activeLayers: Set<string>;
  toggleLayer: (layer: string) => void;

  selectedStationId: string | null;
  setSelectedStation: (id: string | null) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  followMode: true,
  setFollowMode: (v) => set({ followMode: v }),
  toggleFollowMode: () => set((s) => ({ followMode: !s.followMode })),

  activeLayers: new Set(['weather']),
  toggleLayer: (layer) =>
    set((s) => {
      const next = new Set(s.activeLayers);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return { activeLayers: next };
    }),

  selectedStationId: null,
  setSelectedStation: (id) => set({ selectedStationId: id }),
}));

// ─── Journey UI Store ─────────────────────────────────────────────────────────
type JourneyTab = 'timeline' | 'analytics' | 'elevation' | 'weather' | 'nearby';

interface JourneyUIStore {
  activeTab: JourneyTab;
  setActiveTab: (tab: JourneyTab) => void;

  bottomSheetState: 'collapsed' | 'half' | 'full';
  setBottomSheetState: (s: 'collapsed' | 'half' | 'full') => void;
}

export const useJourneyUIStore = create<JourneyUIStore>((set) => ({
  activeTab: 'timeline',
  setActiveTab: (tab) => set({ activeTab: tab }),

  bottomSheetState: 'half',
  setBottomSheetState: (s) => set({ bottomSheetState: s }),
}));
