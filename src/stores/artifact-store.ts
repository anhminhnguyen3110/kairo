import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Artifact, StreamingArtifactMeta } from '@/types';

interface ArtifactState {
  artifacts: Record<string, Artifact>;

  activeArtifactId: string | null;
  panelOpen: boolean;

  streamingArtifactMeta: StreamingArtifactMeta | null;
  streamingArtifactContent: string;

  openArtifact: (id: string) => void;
  closePanel: () => void;
  addArtifact: (artifact: Artifact) => void;
  setArtifacts: (artifacts: Artifact[]) => void;
  clearArtifacts: () => void;

  startStreamingArtifact: (meta: StreamingArtifactMeta) => void;
  appendArtifactContent: (chunk: string) => void;
  finalizeStreamingArtifact: (artifact: Artifact) => void;
}

export const useArtifactStore = create<ArtifactState>()(
  immer((set) => ({
    artifacts: {},
    activeArtifactId: null,
    panelOpen: false,
    streamingArtifactMeta: null,
    streamingArtifactContent: '',

    openArtifact: (id) =>
      set((state) => {
        state.activeArtifactId = id;
        state.panelOpen = true;
      }),

    closePanel: () =>
      set((state) => {
        state.panelOpen = false;
        state.activeArtifactId = null;
      }),

    addArtifact: (artifact) =>
      set((state) => {
        state.artifacts[artifact.id] = artifact as unknown as Artifact;
      }),

    setArtifacts: (artifacts) =>
      set((state) => {
        state.artifacts = {};
        for (const artifact of artifacts) {
          state.artifacts[artifact.id] = artifact as unknown as Artifact;
        }
      }),

    clearArtifacts: () =>
      set((state) => {
        state.artifacts = {};
        state.activeArtifactId = null;
        state.panelOpen = false;
      }),

    startStreamingArtifact: (meta) =>
      set((state) => {
        state.streamingArtifactMeta = meta as unknown as typeof state.streamingArtifactMeta;
        state.streamingArtifactContent = '';
      }),

    appendArtifactContent: (chunk) =>
      set((state) => {
        state.streamingArtifactContent += chunk;
      }),

    finalizeStreamingArtifact: (artifact) =>
      set((state) => {
        state.artifacts[artifact.id] = artifact as unknown as Artifact;
        state.activeArtifactId = artifact.id;
        state.streamingArtifactMeta = null;
        state.streamingArtifactContent = '';
      }),
  })),
);
