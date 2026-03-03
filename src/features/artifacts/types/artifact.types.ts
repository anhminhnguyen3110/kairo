import type { ArtifactType } from '@/types';

export type ViewMode = 'preview' | 'code';

export interface ArtifactDto {
  id: number;
  threadId: number;
  messageId: number | null;
  type: ArtifactType;
  title: string;
  content: string;
  language: string | null;
  version: number;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
}
