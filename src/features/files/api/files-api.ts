import { apiClient, uploadFile } from '@/lib/api-client';
import type { FileAttachment } from '@/types';

export const filesApi = {
  async upload(threadId: number, file: File): Promise<FileAttachment> {
    const form = new FormData();
    form.append('file', file);
    form.append('threadId', String(threadId));
    const res = await uploadFile(form);
    const json = (await res.json()) as { data: FileAttachment } | FileAttachment;
    return 'data' in json && typeof (json as { data: FileAttachment }).data === 'object'
      ? (json as { data: FileAttachment }).data
      : (json as FileAttachment);
  },

  listByThread(threadId: number): Promise<FileAttachment[]> {
    return apiClient.get<FileAttachment[]>(`/threads/${threadId}/files`);
  },

  delete(fileId: number): Promise<void> {
    return apiClient.delete<void>(`/files/${fileId}`);
  },

  getDownloadUrl(fileId: number): string {
    return `/api/proxy/files/${fileId}/download`;
  },
};
