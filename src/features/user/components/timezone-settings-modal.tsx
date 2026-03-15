'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Check, Globe } from 'lucide-react';
import { useMe } from '../hooks/use-me';
import { useUpdateProfile } from '../hooks/use-update-profile';

const COMMON_TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'UTC-12 (Baker Island)', value: 'Etc/GMT+12' },
  { label: 'UTC-11 (Samoa)', value: 'Pacific/Pago_Pago' },
  { label: 'UTC-10 (Hawaii)', value: 'Pacific/Honolulu' },
  { label: 'UTC-8 (Pacific Time)', value: 'America/Los_Angeles' },
  { label: 'UTC-7 (Mountain Time)', value: 'America/Denver' },
  { label: 'UTC-6 (Central Time)', value: 'America/Chicago' },
  { label: 'UTC-5 (Eastern Time)', value: 'America/New_York' },
  { label: 'UTC-3 (Buenos Aires)', value: 'America/Argentina/Buenos_Aires' },
  { label: 'UTC-3 (Brasília)', value: 'America/Sao_Paulo' },
  { label: 'UTC+0 (London)', value: 'Europe/London' },
  { label: 'UTC+1 (Paris / Berlin)', value: 'Europe/Paris' },
  { label: 'UTC+2 (Cairo / Kyiv)', value: 'Europe/Kiev' },
  { label: 'UTC+3 (Moscow / Istanbul)', value: 'Europe/Istanbul' },
  { label: 'UTC+4 (Dubai)', value: 'Asia/Dubai' },
  { label: 'UTC+5:30 (India)', value: 'Asia/Kolkata' },
  { label: 'UTC+6 (Dhaka)', value: 'Asia/Dhaka' },
  { label: 'UTC+7 (Bangkok / Hanoi)', value: 'Asia/Bangkok' },
  { label: 'UTC+8 (Beijing / Singapore)', value: 'Asia/Singapore' },
  { label: 'UTC+9 (Tokyo / Seoul)', value: 'Asia/Tokyo' },
  { label: 'UTC+10 (Sydney)', value: 'Australia/Sydney' },
  { label: 'UTC+12 (Auckland)', value: 'Pacific/Auckland' },
] as const;

interface TimezoneSettingsModalProps {
  onClose: () => void;
}

export function TimezoneSettingsModal({ onClose }: TimezoneSettingsModalProps) {
  const { data: me } = useMe();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const backdropRef = useRef<HTMLDivElement>(null);

  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [selected, setSelected] = useState<string>(() => {
    return me?.timezone ?? detectedTz;
  });

  useEffect(() => {
    if (me?.timezone) setSelected(me.timezone);
  }, [me?.timezone]);

  const handleSave = () => {
    updateProfile({ timezone: selected }, { onSuccess: onClose });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const options = [
    { label: `Auto-detect (${detectedTz})`, value: detectedTz },
    ...COMMON_TIMEZONES.filter((tz) => tz.value !== detectedTz),
  ];

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end justify-start sm:items-center sm:justify-center bg-black/40"
    >
      <div className="w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-[#1E1C16] border border-[#28261F] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#28261F]">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-200">
            <Globe size={14} className="text-[#CC785C]" />
            Timezone settings
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-stone-700 transition-colors text-stone-400"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-3">
          <label className="block text-xs text-stone-400 mb-1" htmlFor="tz-select">
            Select your timezone
          </label>
          <select
            id="tz-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full bg-[#28261F] border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200
                       focus:outline-none focus:ring-1 focus:ring-[#CC785C]/60 appearance-none cursor-pointer"
          >
            {options.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[11px] text-stone-500">
            The AI agent uses this timezone when answering date &amp; time questions.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#28261F]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg text-stone-400 hover:bg-stone-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#CC785C] hover:bg-[#B8694F]
                       text-white font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={12} />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
