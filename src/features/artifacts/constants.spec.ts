import { describe, it, expect } from 'vitest';
import { TYPE_LABELS, CATEGORY_LABELS } from './constants';
import type { ArtifactType } from '@/types';

const ALL_TYPES: ArtifactType[] = [
  'html',
  'react',
  'mermaid',
  'drawio',
  'svg',
  'markdown',
  'code',
  'file',
];

describe('TYPE_LABELS', () => {
  it('has an entry for every ArtifactType', () => {
    for (const t of ALL_TYPES) {
      expect(TYPE_LABELS).toHaveProperty(t);
    }
  });

  it('maps known types correctly', () => {
    expect(TYPE_LABELS.html).toBe('HTML');
    expect(TYPE_LABELS.react).toBe('React');
    expect(TYPE_LABELS.mermaid).toBe('Mermaid');
    expect(TYPE_LABELS['drawio']).toBe('Draw.io');
    expect(TYPE_LABELS.svg).toBe('SVG');
    expect(TYPE_LABELS.markdown).toBe('Markdown');
    expect(TYPE_LABELS.code).toBe('Code');
    expect(TYPE_LABELS.file).toBe('File');
  });

  it('contains no extra/unexpected keys', () => {
    expect(Object.keys(TYPE_LABELS)).toHaveLength(ALL_TYPES.length);
  });
});

describe('CATEGORY_LABELS', () => {
  it('has an entry for every ArtifactType', () => {
    for (const t of ALL_TYPES) {
      expect(CATEGORY_LABELS).toHaveProperty(t);
    }
  });

  it('maps known types correctly', () => {
    expect(CATEGORY_LABELS.html).toBe('Code');
    expect(CATEGORY_LABELS.react).toBe('Component');
    expect(CATEGORY_LABELS.mermaid).toBe('Diagram');
    expect(CATEGORY_LABELS['drawio']).toBe('Diagram');
    expect(CATEGORY_LABELS.svg).toBe('Image');
    expect(CATEGORY_LABELS.markdown).toBe('Document');
    expect(CATEGORY_LABELS.code).toBe('Code');
    expect(CATEGORY_LABELS.file).toBe('File');
  });

  it('contains no extra/unexpected keys', () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(ALL_TYPES.length);
  });
});
