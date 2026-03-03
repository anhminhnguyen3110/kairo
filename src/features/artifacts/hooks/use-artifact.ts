'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useArtifactStore } from '@/stores/artifact-store';
import { artifactsApi } from '../api/artifacts-api';
import { Artifact } from '@/types';

export function useArtifact(artifactId: string) {
  const { artifacts, activeArtifactId, panelOpen, openArtifact, closePanel } = useArtifactStore();

  const artifact = artifacts[artifactId] as Artifact | undefined;

  return {
    artifact,
    isOpen: panelOpen && activeArtifactId === artifactId,
    openArtifact: () => openArtifact(artifactId),
    closePanel,
  };
}

export function useArtifacts(threadId: number | undefined) {
  const { setArtifacts, openArtifact, clearArtifacts } = useArtifactStore();

  const query = useQuery({
    queryKey: ['artifacts', threadId],
    queryFn: () => artifactsApi.listByThread(threadId!),
    enabled: !!threadId,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!threadId) {
      clearArtifacts();
      return;
    }
    if (query.data) {
      setArtifacts(query.data);

      if (query.data.length > 0) {
        const last = query.data[query.data.length - 1];
        openArtifact(last.id);
      }
    }
  }, [query.data, threadId, clearArtifacts, openArtifact, setArtifacts]);

  return query;
}
