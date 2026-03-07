'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Globe, LogOut } from 'lucide-react';
import { authApi } from '@/features/auth/api/auth-api';
import { useMe, displayNameFromEmail } from '@/features/user/hooks/use-me';
import { TimezoneSettingsModal } from '@/features/user/components/timezone-settings-modal';

export function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showTimezone, setShowTimezone] = useState(false);
  const { data: me } = useMe();

  const displayName = me?.email ? displayNameFromEmail(me.email) : 'Account';
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } finally {
      queryClient.clear();
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <>
      {showTimezone && <TimezoneSettingsModal onClose={() => setShowTimezone(false)} />}

      <div className="px-2 py-2.5 border-t border-[#28261F]">
        <div
          className={
            collapsed
              ? 'flex items-center justify-center w-full p-2 rounded-lg text-sidebar-text'
              : 'flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-[13px] text-sidebar-text group'
          }
        >
          <div
            className="w-6 h-6 rounded-full bg-[#CC785C]/20 border border-[#CC785C]/40
                          flex items-center justify-center shrink-0"
          >
            <span className="text-[10px] font-semibold text-[#CC785C] leading-none">{initial}</span>
          </div>

          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{displayName}</span>
              <button
                onClick={() => setShowTimezone(true)}
                title="Timezone settings"
                className="p-1 rounded hover:bg-sidebar-hover transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-sidebar-muted hover:text-sidebar-text transition-colors shrink-0" />
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Sign out"
                className="p-1 rounded hover:bg-sidebar-hover transition-colors disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5 text-sidebar-muted hover:text-sidebar-text transition-colors shrink-0" />
              </button>
            </>
          )}

          {collapsed && (
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sign out"
              className="sr-only"
            />
          )}
        </div>
      </div>
    </>
  );
}
