import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;

  searchOpen: boolean;

  isMobile: boolean;

  filePanelOpen: boolean;

  webSearchEnabled: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  openSearch: () => void;
  closeSearch: () => void;
  toggleFilePanel: () => void;
  setFilePanelOpen: (open: boolean) => void;
  toggleWebSearch: () => void;
  setWebSearchEnabled: (enabled: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: true,
  searchOpen: false,
  isMobile: false,
  filePanelOpen: false,
  webSearchEnabled: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setIsMobile: (isMobile) => set({ isMobile, sidebarOpen: !isMobile }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  toggleFilePanel: () => set((state) => ({ filePanelOpen: !state.filePanelOpen })),
  setFilePanelOpen: (open) => set({ filePanelOpen: open }),
  toggleWebSearch: () => set((state) => ({ webSearchEnabled: !state.webSearchEnabled })),
  setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),
}));
