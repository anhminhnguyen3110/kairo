import { describe, it, expect, beforeEach } from 'vitest';

let useUiStore: typeof import('./ui-store').useUiStore;

beforeEach(async () => {
  // Reset modules so each test starts from a clean initial state
  const mod = await import('./ui-store');
  useUiStore = mod.useUiStore;
  useUiStore.setState({
    sidebarOpen: true,
    searchOpen: false,
    isMobile: false,
    filePanelOpen: false,
    webSearchEnabled: false,
  });
});

describe('useUiStore', () => {
  // ─── initial state ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('sidebar is open', () => {
      expect(useUiStore.getState().sidebarOpen).toBe(true);
    });

    it('search is closed', () => {
      expect(useUiStore.getState().searchOpen).toBe(false);
    });

    it('isMobile is false', () => {
      expect(useUiStore.getState().isMobile).toBe(false);
    });

    it('file panel is closed', () => {
      expect(useUiStore.getState().filePanelOpen).toBe(false);
    });

    it('web search is disabled', () => {
      expect(useUiStore.getState().webSearchEnabled).toBe(false);
    });
  });

  // ─── toggleSidebar ─────────────────────────────────────────────────────────

  describe('toggleSidebar()', () => {
    it('closes sidebar when open', () => {
      useUiStore.setState({ sidebarOpen: true });
      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarOpen).toBe(false);
    });

    it('opens sidebar when closed', () => {
      useUiStore.setState({ sidebarOpen: false });
      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarOpen).toBe(true);
    });
  });

  // ─── setSidebarOpen ────────────────────────────────────────────────────────

  describe('setSidebarOpen()', () => {
    it('explicitly sets sidebar to false', () => {
      useUiStore.getState().setSidebarOpen(false);
      expect(useUiStore.getState().sidebarOpen).toBe(false);
    });

    it('explicitly sets sidebar to true', () => {
      useUiStore.setState({ sidebarOpen: false });
      useUiStore.getState().setSidebarOpen(true);
      expect(useUiStore.getState().sidebarOpen).toBe(true);
    });
  });

  // ─── setIsMobile ───────────────────────────────────────────────────────────

  describe('setIsMobile()', () => {
    it('sets isMobile true and closes sidebar on mobile', () => {
      useUiStore.getState().setIsMobile(true);
      const state = useUiStore.getState();
      expect(state.isMobile).toBe(true);
      expect(state.sidebarOpen).toBe(false);
    });

    it('sets isMobile false and opens sidebar on desktop', () => {
      useUiStore.setState({ isMobile: true, sidebarOpen: false });
      useUiStore.getState().setIsMobile(false);
      const state = useUiStore.getState();
      expect(state.isMobile).toBe(false);
      expect(state.sidebarOpen).toBe(true);
    });
  });

  // ─── openSearch / closeSearch ──────────────────────────────────────────────

  describe('openSearch() / closeSearch()', () => {
    it('opens search', () => {
      useUiStore.getState().openSearch();
      expect(useUiStore.getState().searchOpen).toBe(true);
    });

    it('closes search', () => {
      useUiStore.setState({ searchOpen: true });
      useUiStore.getState().closeSearch();
      expect(useUiStore.getState().searchOpen).toBe(false);
    });
  });

  // ─── toggleFilePanel / setFilePanelOpen ────────────────────────────────────

  describe('toggleFilePanel()', () => {
    it('opens file panel when closed', () => {
      useUiStore.getState().toggleFilePanel();
      expect(useUiStore.getState().filePanelOpen).toBe(true);
    });

    it('closes file panel when open', () => {
      useUiStore.setState({ filePanelOpen: true });
      useUiStore.getState().toggleFilePanel();
      expect(useUiStore.getState().filePanelOpen).toBe(false);
    });
  });

  describe('setFilePanelOpen()', () => {
    it('sets file panel open', () => {
      useUiStore.getState().setFilePanelOpen(true);
      expect(useUiStore.getState().filePanelOpen).toBe(true);
    });

    it('sets file panel closed', () => {
      useUiStore.setState({ filePanelOpen: true });
      useUiStore.getState().setFilePanelOpen(false);
      expect(useUiStore.getState().filePanelOpen).toBe(false);
    });
  });

  // ─── toggleWebSearch / setWebSearchEnabled ─────────────────────────────────

  describe('toggleWebSearch()', () => {
    it('enables web search when disabled', () => {
      useUiStore.getState().toggleWebSearch();
      expect(useUiStore.getState().webSearchEnabled).toBe(true);
    });

    it('disables web search when enabled', () => {
      useUiStore.setState({ webSearchEnabled: true });
      useUiStore.getState().toggleWebSearch();
      expect(useUiStore.getState().webSearchEnabled).toBe(false);
    });
  });

  describe('setWebSearchEnabled()', () => {
    it('enables web search', () => {
      useUiStore.getState().setWebSearchEnabled(true);
      expect(useUiStore.getState().webSearchEnabled).toBe(true);
    });

    it('disables web search', () => {
      useUiStore.setState({ webSearchEnabled: true });
      useUiStore.getState().setWebSearchEnabled(false);
      expect(useUiStore.getState().webSearchEnabled).toBe(false);
    });
  });
});
