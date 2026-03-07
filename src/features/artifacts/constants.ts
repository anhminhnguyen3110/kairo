import type { ArtifactType } from '@/types';

export const TYPE_LABELS: Record<ArtifactType, string> = {
  html: 'HTML',
  react: 'React',
  mermaid: 'Mermaid',
  svg: 'SVG',
  markdown: 'Markdown',
  code: 'Code',
};

export const CATEGORY_LABELS: Record<ArtifactType, string> = {
  html: 'Code',
  react: 'Component',
  mermaid: 'Diagram',
  svg: 'Image',
  markdown: 'Document',
  code: 'Code',
};
