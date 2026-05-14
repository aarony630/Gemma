'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { IconPlayFilled, IconChevronDown } from './icons';

/**
 * AudioBubble — voice message bubble used in the conversation view.
 * Purple-blue background, white play button + static waveform + timestamp.
 * Chevron at bottom expands/collapses the transcript inline.
 */
export function AudioBubble({
  time,
  transcript,
  defaultExpanded = false,
}: {
  time: string;
  transcript: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="self-end max-w-[260px]">
      <div className="rounded-2xl bg-brand-primary px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Play audio"
            className="flex size-7 items-center justify-center rounded-md bg-white/25 transition-colors active:bg-white/40"
          >
            <IconPlayFilled className="size-4 text-white" />
          </button>
          <StaticWaveform className="flex-1" />
          <span className="text-xs font-bold text-white tabular-nums">{time}</span>
        </div>

        {expanded && (
          <p className="mt-2 text-sm leading-snug text-white">
            {transcript}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-label={expanded ? 'Collapse transcript' : 'Expand transcript'}
        className="mt-1 flex w-full justify-center"
      >
        <IconChevronDown
          className={clsx(
            'size-4 text-gray-60 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>
    </div>
  );
}

function StaticWaveform({ className }: { className?: string }) {
  // 22 bars of varying heights — purely visual
  const heights = [4, 8, 14, 10, 18, 22, 16, 10, 6, 14, 20, 16, 10, 8, 18, 22, 14, 10, 6, 4, 8, 12];
  return (
    <div className={clsx('flex h-6 items-center gap-[2px]', className)}>
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-[2px] rounded-sm bg-white"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}
