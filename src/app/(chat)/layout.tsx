import { Sidebar } from '@/features/threads/components/sidebar';
import { ArtifactPanel } from '@/features/artifacts/components/artifact-panel';
import { SearchModal } from '@/features/threads/components/search-modal';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden bg-chat-bg">{children}</main>
      <ArtifactPanel />
      <SearchModal />
    </div>
  );
}
