import type { Artifact } from '@/types';
import { apiClient } from '@/lib/api-client';
import type { ArtifactDto } from '../types/artifact.types';

export type { ArtifactDto };

function dtoToArtifact(dto: ArtifactDto): Artifact {
  return {
    id: String(dto.id),
    type: dto.type,
    title: dto.title,
    content: dto.content,
    language: dto.language ?? undefined,
    messageId: dto.messageId ?? -1,
    version: dto.version,
    parentId: dto.parentId != null ? String(dto.parentId) : null,
  };
}

export const artifactsApi = {
  async listByThread(threadId: number): Promise<Artifact[]> {
    const items = await apiClient.get<ArtifactDto[]>(`/threads/${threadId}/artifacts`);
    return items.map(dtoToArtifact);
  },

  async getById(artifactId: number): Promise<Artifact> {
    const dto = await apiClient.get<ArtifactDto>(`/artifacts/${artifactId}`);
    return dtoToArtifact(dto);
  },

  getDownloadUrl(artifactId: number): string {
    return `/api/proxy/artifacts/${artifactId}/download`;
  },

  getPreviewPdfUrl(artifactId: number): string {
    return `/api/proxy/artifacts/${artifactId}/preview-pdf`;
  },
};
