'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import {
  IconClose,
  IconMicrophoneFilled,
  IconImage,
  IconCameraFilled,
} from './icons';

export type UploadKind = 'voice' | 'photo' | 'camera';

/**
 * UploadWheel — floating column of upload options that fans out above the
 * "+" plus button in FM /ai-check (Figma "FM - upload plus button" 400:5069).
 *
 * When `open=true`:
 *   1. Renders 3 stacked white squares for the upload sources (mic is brand-primary)
 *   2. The "+" position itself becomes an X close button
 *
 * The component is `position: absolute` — render it inside a relatively-
 * positioned parent that also contains the "+" button so the wheel anchors
 * to the same right edge.
 */
export function UploadWheel({
  open,
  onClose,
  onPick,
  className,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (kind: UploadKind) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Close when tapping outside the wheel
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={ref} className={clsx('absolute z-30 flex flex-col items-center gap-[10px]', className)}>
      <UploadButton tone="purple" label="Record audio" onClick={() => onPick('voice')}>
        <IconMicrophoneFilled className="size-[22px] text-white" />
      </UploadButton>
      <UploadButton tone="white" label="Choose photo" onClick={() => onPick('photo')}>
        <IconImage className="size-[22px] text-gray-100" />
      </UploadButton>
      <UploadButton tone="white" label="Open camera" onClick={() => onPick('camera')}>
        <IconCameraFilled className="size-[22px] text-gray-100" />
      </UploadButton>
      {/* Close button — sits where the "+" was */}
      <button
        type="button"
        aria-label="Close upload menu"
        onClick={onClose}
        className="flex size-[44px] items-center justify-center rounded-[12px] bg-white shadow-md transition-transform active:scale-95"
      >
        <IconClose className="size-[20px] text-brand-primary" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function UploadButton({
  tone,
  label,
  onClick,
  children,
}: {
  tone: 'white' | 'purple';
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx(
        'flex size-[44px] items-center justify-center rounded-[12px] shadow-md transition-transform active:scale-95',
        tone === 'purple' ? 'bg-brand-primary' : 'bg-white',
      )}
    >
      {children}
    </button>
  );
}
