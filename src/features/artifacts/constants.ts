import type { ArtifactType } from '@/types';

/** Human-readable label for each artifact type (e.g. shown in the toolbar). */
export const TYPE_LABELS: Record<ArtifactType, string> = {
  html: 'HTML',
  react: 'React',
  mermaid: 'Mermaid',
  svg: 'SVG',
  markdown: 'Markdown',
  code: 'Code',
};

/** Broad category for each artifact type, used in chip / card displays. */
export const CATEGORY_LABELS: Record<ArtifactType, string> = {
  html: 'Code',
  react: 'Component',
  mermaid: 'Diagram',
  svg: 'Image',
  markdown: 'Document',
  code: 'Code',
};
