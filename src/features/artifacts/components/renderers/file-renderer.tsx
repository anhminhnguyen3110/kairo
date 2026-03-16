'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, File, FileText, FileSpreadsheet, FileCode, ImageIcon } from 'lucide-react';
import type { Artifact } from '@/types';
import { artifactsApi } from '../../api/artifacts-api';

interface FileRendererProps {
  artifact: Artifact;
}

function PdfPreview({ url, filename }: { url: string; filename: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-full text-stone-500 text-sm">
        Loading PDF…
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm px-4 text-center">
        Failed to load: {error}
      </div>
    );

  return (
    <div className="w-full h-full bg-stone-950">
      <iframe
        src={blobUrl ? `${blobUrl}#toolbar=0&navpanes=0` : undefined}
        className="w-full h-full border-0"
        title={filename}
        style={{ minHeight: '500px' }}
      />
    </div>
  );
}

function buildXlsxSrcdoc(tableHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#1a1a1a;color:#e5e5e5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;padding:8px;overflow:auto}
table{border-collapse:collapse;width:100%;white-space:nowrap}
td,th{border:1px solid #333;padding:3px 8px;text-align:left;vertical-align:middle}
tr:first-child td{background:#252525;font-weight:600;color:#fff;position:sticky;top:0;z-index:1}
tr:nth-child(even) td{background:#1d1d1d}
tr:hover td{background:#222}
</style></head><body>${tableHtml}</body></html>`;
}

function XlsxPreview({ url }: { url: string }) {
  const [sheets, setSheets] = useState<{ name: string; html: string }[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const XLSX = await import('xlsx');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        if (!cancelled) {
          setSheets(
            wb.SheetNames.map((name) => ({
              name,
              html: XLSX.utils.sheet_to_html(wb.Sheets[name]),
            })),
          );
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-full text-stone-500 text-sm">
        Loading spreadsheet…
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm px-4 text-center">
        Failed to load: {error}
      </div>
    );

  const active = sheets[activeIdx];
  return (
    <div className="flex flex-col h-full">
      {sheets.length > 1 && (
        <div className="flex gap-0.5 px-2 pt-1.5 bg-[#141414] shrink-0 overflow-x-auto border-b border-[#2a2a2a]">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActiveIdx(i)}
              className={`px-3 py-1 text-xs rounded-t-md font-medium whitespace-nowrap transition-colors ${
                i === activeIdx
                  ? 'bg-[#2a2a2a] text-stone-100'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <iframe
        key={activeIdx}
        srcDoc={buildXlsxSrcdoc(active?.html ?? '')}
        sandbox="allow-scripts"
        className="flex-1 border-0 w-full"
        title={active?.name}
      />
    </div>
  );
}

function DocxPreview({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current) return;
      try {
        const { renderAsync } = await import('docx-preview');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (!cancelled && containerRef.current) {
          await renderAsync(buf, containerRef.current, undefined, {
            className: 'docx-wrapper',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            trimXmlDeclaration: true,
          });
          if (!cancelled) setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="relative h-full overflow-auto bg-[#e8e8e8]">
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#e8e8e8] z-10">
          <span className="text-stone-500 text-sm">Loading document…</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-red-500 text-sm px-4 text-center">Failed to load: {error}</span>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}

function ImagePreview({ url, filename }: { url: string; filename: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-[#141414] p-4 overflow-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={filename} className="max-w-full max-h-full object-contain" />
    </div>
  );
}

function TextPreview({ url, filename }: { url: string; filename: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  let displayContent = content ?? '';
  if (ext === 'json' && content) {
    try {
      displayContent = JSON.stringify(JSON.parse(content), null, 2);
    } catch {}
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-full text-stone-500 text-sm">Loading…</div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm px-4 text-center">
        Failed to load: {error}
      </div>
    );

  return (
    <div className="h-full overflow-auto bg-[#1a1a1a] p-4">
      <pre className="text-stone-300 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
        {displayContent}
      </pre>
    </div>
  );
}

function DownloadCard({
  filename,
  url,
  label,
  iconColor,
  bgColor,
  note,
  Icon = File,
}: {
  filename: string;
  url: string | null;
  label: string;
  iconColor: string;
  bgColor: string;
  note?: string;
  Icon?: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="flex flex-col items-center gap-5 text-center max-w-xs">
        <div className={`${bgColor} ${iconColor} rounded-2xl p-5`}>
          <Icon size={48} />
        </div>
        <div>
          <p className="text-stone-100 font-semibold text-base leading-snug break-all">
            {filename}
          </p>
          <p className="text-stone-500 text-sm mt-1">{label}</p>
          {note && <p className="text-stone-600 text-xs mt-2 italic">{note}</p>}
        </div>
        {url ? (
          <a
            href={url}
            download
            className="flex items-center gap-2 px-5 py-2.5 bg-[#CC785C] hover:bg-[#b86848] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={14} />
            Download
          </a>
        ) : (
          <p className="text-stone-600 text-sm italic">File not yet available</p>
        )}
      </div>
    </div>
  );
}

type FileInfo = {
  label: string;
  iconColor: string;
  bgColor: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

function getFileInfo(filename: string, mimeType?: string): FileInfo {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return {
      label: 'PDF Document',
      iconColor: 'text-red-400',
      bgColor: 'bg-red-400/10',
      Icon: FileText,
    };
  }

  if (ext === 'xlsx' || ext === 'xls' || mimeType?.includes('spreadsheet')) {
    return {
      label: 'Excel Spreadsheet',
      iconColor: 'text-green-400',
      bgColor: 'bg-green-400/10',
      Icon: FileSpreadsheet,
    };
  }

  if (ext === 'docx' || ext === 'doc' || mimeType?.includes('wordprocessingml')) {
    return {
      label: 'Word Document',
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      Icon: FileText,
    };
  }

  if (ext === 'pptx' || ext === 'ppt' || mimeType?.includes('presentationml')) {
    return {
      label: 'PowerPoint Presentation',
      iconColor: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
      Icon: FileText,
    };
  }

  if (ext === 'csv' || mimeType === 'text/csv') {
    return {
      label: 'CSV Spreadsheet',
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      Icon: FileSpreadsheet,
    };
  }

  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'tiff', 'tif'];
  if (imageExts.includes(ext) || mimeType?.startsWith('image/')) {
    return {
      label: 'Image',
      iconColor: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      Icon: ImageIcon,
    };
  }

  const textExts = [
    'txt',
    'md',
    'mdx',
    'json',
    'jsonl',
    'js',
    'mjs',
    'cjs',
    'ts',
    'jsx',
    'tsx',
    'py',
    'sh',
    'bash',
    'zsh',
    'fish',
    'yaml',
    'yml',
    'toml',
    'ini',
    'cfg',
    'env',
    'xml',
    'htm',
    'html',
    'css',
    'scss',
    'less',
    'sql',
    'graphql',
    'gql',
    'java',
    'kt',
    'c',
    'cpp',
    'h',
    'hpp',
    'cs',
    'go',
    'rs',
    'rb',
    'php',
    'swift',
    'r',
    'lua',
    'dart',
    'vue',
    'svelte',
    'log',
    'diff',
    'patch',
  ];
  if (textExts.includes(ext) || mimeType?.startsWith('text/')) {
    return {
      label: 'Text / Code',
      iconColor: 'text-sky-400',
      bgColor: 'bg-sky-400/10',
      Icon: FileCode,
    };
  }

  return {
    label: 'File',
    iconColor: 'text-stone-400',
    bgColor: 'bg-stone-400/10',
    Icon: File,
  };
}

export function FileRenderer({ artifact }: FileRendererProps) {
  const numericId = Number(artifact.id);
  const downloadUrl =
    !isNaN(numericId) && numericId > 0 ? artifactsApi.getDownloadUrl(numericId) : null;

  const filename = artifact.content ?? artifact.title ?? 'file';
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = artifact.language;

  if ((ext === 'pdf' || mimeType === 'application/pdf') && downloadUrl) {
    return <PdfPreview url={downloadUrl} filename={filename} />;
  }

  if ((ext === 'xlsx' || ext === 'xls' || mimeType?.includes('spreadsheet')) && downloadUrl) {
    return <XlsxPreview url={downloadUrl} />;
  }

  if ((ext === 'docx' || ext === 'doc' || mimeType?.includes('wordprocessingml')) && downloadUrl) {
    return <DocxPreview url={downloadUrl} />;
  }

  if ((ext === 'pptx' || ext === 'ppt' || mimeType?.includes('presentationml')) && downloadUrl) {
    const previewUrl = artifactsApi.getPreviewPdfUrl(numericId);
    return <PdfPreview url={previewUrl} filename={`${filename}.pdf`} />;
  }

  if ((ext === 'csv' || mimeType === 'text/csv') && downloadUrl) {
    return <XlsxPreview url={downloadUrl} />;
  }

  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'tiff', 'tif'];
  if ((imageExts.includes(ext) || mimeType?.startsWith('image/')) && downloadUrl) {
    return <ImagePreview url={downloadUrl} filename={filename} />;
  }

  const textExts = [
    'txt',
    'md',
    'mdx',
    'json',
    'jsonl',
    'js',
    'mjs',
    'cjs',
    'ts',
    'jsx',
    'tsx',
    'py',
    'sh',
    'bash',
    'zsh',
    'fish',
    'yaml',
    'yml',
    'toml',
    'ini',
    'cfg',
    'env',
    'xml',
    'htm',
    'html',
    'css',
    'scss',
    'less',
    'sql',
    'graphql',
    'gql',
    'java',
    'kt',
    'c',
    'cpp',
    'h',
    'hpp',
    'cs',
    'go',
    'rs',
    'rb',
    'php',
    'swift',
    'r',
    'lua',
    'dart',
    'vue',
    'svelte',
    'log',
    'diff',
    'patch',
  ];
  if ((textExts.includes(ext) || mimeType?.startsWith('text/')) && downloadUrl) {
    return <TextPreview url={downloadUrl} filename={filename} />;
  }

  const { label, iconColor, bgColor, Icon } = getFileInfo(filename, mimeType);
  return (
    <DownloadCard
      filename={filename}
      url={downloadUrl}
      label={label}
      iconColor={iconColor}
      bgColor={bgColor}
      Icon={Icon}
    />
  );
}
