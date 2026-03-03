import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Artifact, StreamingArtifactMeta } from '@/types';

let useArtifactStore: typeof import('./artifact-store').useArtifactStore;

const INITIAL_STATE = {
  artifacts: {},
  activeArtifactId: null,
  panelOpen: false,
  streamingArtifactMeta: null,
  streamingArtifactContent: '',
};

beforeEach(async () => {
  vi.resetModules();
  ({ useArtifactStore } = await import('./artifact-store'));
  useArtifactStore.setState(INITIAL_STATE);
});

const makeArtifact = (id: string): Artifact => ({
  id,
  type: 'code',
  title: `Artifact ${id}`,
  content: 'console.log("hello")',
  language: 'typescript',
  messageId: 1,
});

describe('useArtifactStore', () => {
  describe('openArtifact()', () => {
    it('sets activeArtifactId and opens the panel', () => {
      useArtifactStore.getState().openArtifact('art-1');
      expect(useArtifactStore.getState().activeArtifactId).toBe('art-1');
      expect(useArtifactStore.getState().panelOpen).toBe(true);
    });
  });

  describe('closePanel()', () => {
    it('closes the panel and clears the active artifact', () => {
      useArtifactStore.setState({ panelOpen: true, activeArtifactId: 'art-1' });
      useArtifactStore.getState().closePanel();
      expect(useArtifactStore.getState().panelOpen).toBe(false);
      expect(useArtifactStore.getState().activeArtifactId).toBeNull();
    });
  });

  describe('addArtifact()', () => {
    it('inserts an artifact into the map', () => {
      const art = makeArtifact('1');
      useArtifactStore.getState().addArtifact(art);
      expect(useArtifactStore.getState().artifacts['1']).toEqual(art);
    });
  });

  describe('setArtifacts()', () => {
    it('replaces all artifacts', () => {
      useArtifactStore.getState().addArtifact(makeArtifact('old'));
      useArtifactStore.getState().setArtifacts([makeArtifact('new1'), makeArtifact('new2')]);
      const { artifacts } = useArtifactStore.getState();
      expect(Object.keys(artifacts)).toHaveLength(2);
      expect(artifacts['old']).toBeUndefined();
      expect(artifacts['new1']).toBeDefined();
    });

    it('handles an empty array', () => {
      useArtifactStore.getState().addArtifact(makeArtifact('x'));
      useArtifactStore.getState().setArtifacts([]);
      expect(Object.keys(useArtifactStore.getState().artifacts)).toHaveLength(0);
    });
  });

  describe('clearArtifacts()', () => {
    it('removes all artifacts and closes the panel', () => {
      useArtifactStore.getState().addArtifact(makeArtifact('1'));
      useArtifactStore.setState({ panelOpen: true, activeArtifactId: '1' });
      useArtifactStore.getState().clearArtifacts();
      expect(Object.keys(useArtifactStore.getState().artifacts)).toHaveLength(0);
      expect(useArtifactStore.getState().panelOpen).toBe(false);
      expect(useArtifactStore.getState().activeArtifactId).toBeNull();
    });
  });

  describe('startStreamingArtifact()', () => {
    it('initialises streaming state and opens the panel', () => {
      const meta: StreamingArtifactMeta = { type: 'code', title: 'My Code', language: 'ts' };
      useArtifactStore.getState().startStreamingArtifact(meta);
      const s = useArtifactStore.getState();
      expect(s.streamingArtifactMeta).toEqual(meta);
      expect(s.streamingArtifactContent).toBe('');
      expect(s.panelOpen).toBe(true);
    });
  });

  describe('appendArtifactContent()', () => {
    it('accumulates content chunks', () => {
      useArtifactStore.getState().appendArtifactContent('const x = ');
      useArtifactStore.getState().appendArtifactContent('1;');
      expect(useArtifactStore.getState().streamingArtifactContent).toBe('const x = 1;');
    });
  });

  describe('finalizeStreamingArtifact()', () => {
    it('stores the artifact, sets active ID, and clears streaming state', () => {
      const art = makeArtifact('final-1');
      useArtifactStore.setState({
        streamingArtifactContent: 'partial',
        streamingArtifactMeta: { type: 'code', title: 'T', language: undefined },
      });
      useArtifactStore.getState().finalizeStreamingArtifact(art);
      const s = useArtifactStore.getState();
      expect(s.artifacts['final-1']).toEqual(art);
      expect(s.activeArtifactId).toBe('final-1');
      expect(s.streamingArtifactMeta).toBeNull();
      expect(s.streamingArtifactContent).toBe('');
      expect(s.panelOpen).toBe(true);
    });
  });
});
