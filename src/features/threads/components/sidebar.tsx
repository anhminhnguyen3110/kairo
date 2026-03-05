'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PanelLeft, Plus, Search } from 'lucide-react';
import { groupThreadsByTimeFrame, TIME_FRAME_LABELS, TIME_FRAME_ORDER } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';
import { useThreads } from '../hooks/use-threads';
import { SidebarItem } from './sidebar-item';
import { useChatStore } from '@/stores/chat-store';
import { UserMenu } from './user-menu';
import { KairoLogo } from '@/components/kairo-logo';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, openSearch, setIsMobile } = useUiStore();
  const setActiveThread = useChatStore((s) => s.setActiveThread);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useThreads();

  // Detect mobile breakpoint and update store accordingly
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handle = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handle(mq); // run immediately on mount
    mq.addEventListener('change', handle as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handle as (e: MediaQueryListEvent) => void);
  }, [setIsMobile]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const allThreads = data?.pages.flatMap((p) => p.data) ?? [];
  const grouped = groupThreadsByTimeFrame(allThreads);

  return (
    <>
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
      <aside
        className={`h-screen flex flex-col bg-sidebar-bg transition-all duration-200 ease-in-out
        max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-[260px]
        ${sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
        md:shrink-0 ${sidebarOpen ? 'md:w-[260px]' : 'md:w-[60px]'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 pt-3 pb-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex items-center gap-2 p-2.5 rounded-md text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text transition-colors overflow-hidden min-w-[44px]"
          >
            <KairoLogo size={30} className="shrink-0" />
            <span
              className={`text-[16px] font-semibold text-sidebar-text tracking-tight select-none whitespace-nowrap transition-opacity duration-150 ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'
              }`}
            >
              Kairo
            </span>
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-sidebar-text hover:bg-sidebar-hover transition-all duration-150 group ${
              sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 px-0'
            }`}
          >
            <PanelLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="w-full px-2 pb-2 space-y-1">
          {/* New chat button */}
          <button
            type="button"
            onClick={() => {
              setActiveThread(null);
              router.push('/threads');
            }}
            title={sidebarOpen ? undefined : 'New chat'}
            className="flex items-center w-full p-2.5 rounded-lg text-sidebar-text hover:bg-sidebar-hover transition-colors overflow-hidden min-w-[44px]"
          >
            <Plus className="w-5 h-5 shrink-0 text-sidebar-muted" strokeWidth={1.5} />
            <span
              className={`text-[13px] whitespace-nowrap transition-opacity duration-150 ml-2.5 ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 ml-0'
              }`}
            >
              New chat
            </span>
          </button>

          {/* Search button */}
          <button
            type="button"
            onClick={openSearch}
            title={sidebarOpen ? undefined : 'Search'}
            className="flex items-center w-full p-2.5 rounded-lg hover:bg-sidebar-hover transition-colors group overflow-hidden min-w-[44px]"
          >
            <Search className="w-5 h-5 shrink-0 text-sidebar-muted" strokeWidth={1.5} />
            <span
              className={`flex-1 text-left text-[13px] text-sidebar-text whitespace-nowrap transition-opacity duration-150 ml-2.5 ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 ml-0'
              }`}
            >
              Search
            </span>
            {sidebarOpen && (
              <kbd
                className="hidden group-hover:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]
                           text-sidebar-muted bg-sidebar-active border border-[#3A3632] font-mono leading-none"
              >
                Ctrl K
              </kbd>
            )}
          </button>
        </div>

        {/* Thread list or empty space */}
        {sidebarOpen ? (
          <div className="flex-1 overflow-y-auto sidebar-scroll px-2 pt-1 sidebar-content-appear">
            {isLoading ? (
              <SidebarSkeleton />
            ) : allThreads.length === 0 ? (
              <div className="px-2 py-8 text-center">
                <p className="text-xs text-sidebar-muted">No conversations yet</p>
                <button
                  onClick={() => router.push('/threads')}
                  className="mt-2 text-xs text-sidebar-muted underline-offset-2 hover:underline"
                >
                  Start a new chat
                </button>
              </div>
            ) : (
              <>
                {TIME_FRAME_ORDER.map((tf) => {
                  const threads = grouped.get(tf);
                  if (!threads?.length) return null;
                  return (
                    <section key={tf} className="mb-4">
                      {}
                      <h3 className="px-2.5 mb-1 text-[11px] font-medium text-sidebar-muted/60 select-none uppercase tracking-wide">
                        {TIME_FRAME_LABELS[tf]}
                      </h3>
                      <ul className="space-y-0.5">
                        {threads.map((thread) => (
                          <li key={thread.id}>
                            <SidebarItem thread={thread} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}

                {}
                <div ref={loadMoreRef} className="pb-2">
                  {isFetchingNextPage && (
                    <div className="flex justify-center py-2">
                      <div className="w-4 h-4 border-2 border-sidebar-muted border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* User menu */}
        <UserMenu collapsed={!sidebarOpen} />
      </aside>
    </>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-4 px-2 py-2" aria-hidden>
      {['Today', 'Yesterday'].map((label) => (
        <div key={label}>
          <div className="h-2.5 w-16 bg-sidebar-active rounded mb-2 animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 bg-sidebar-hover rounded-md mb-1 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}
