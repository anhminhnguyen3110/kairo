import type { ArtifactType } from '@/types';

export const TYPE_LABELS: Record<ArtifactType, string> = {
  html: 'HTML',
  react: 'React',
  mermaid: 'Mermaid',
  drawio: 'Draw.io',
  svg: 'SVG',
  markdown: 'Markdown',
  code: 'Code',
  file: 'File',
};

export const CATEGORY_LABELS: Record<ArtifactType, string> = {
  html: 'Code',
  react: 'Component',
  mermaid: 'Diagram',
  drawio: 'Diagram',
  svg: 'Image',
  markdown: 'Document',
  code: 'Code',
  file: 'File',
};
