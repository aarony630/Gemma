import clsx from 'clsx';
import { IconRiVoiceAiFill } from './icons';

/**
 * Bottom-center action button on Caregiver Logs screens.
 *
 * - `variant="idle"` → lime pill, "Press to Speak" + voice-AI waveform icon
 * - `variant="recording"` → red pill, "Done"
 */
export function PressToSpeakButton({
  onClick,
  variant = 'idle',
  className,
}: {
  onClick?: () => void;
  variant?: 'idle' | 'recording';
  className?: string;
}) {
  if (variant === 'recording') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'flex h-12 items-center justify-center gap-2 rounded-lg bg-alert px-9 py-2.5',
          'transition-transform active:scale-95',
          className,
        )}
      >
        <span className="text-base font-bold text-white">Done</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex h-12 items-center justify-center gap-3 rounded-lg bg-brand-accent px-9 py-2.5',
        'transition-transform active:scale-95',
        className,
      )}
    >
      <IconRiVoiceAiFill className="size-6 text-brand-active" />
      <span className="text-base font-bold text-brand-active">Press to Speak</span>
    </button>
  );
}
