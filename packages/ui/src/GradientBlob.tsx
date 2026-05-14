import clsx from 'clsx';

/**
 * GradientBlob — soft pink/coral/purple gaussian-blur watercolor blob.
 *
 * The OUTER element handles layout/positioning. The INNER element handles the
 * pulse animation (scale + opacity + hue-rotate) so it doesn't fight any
 * `translate-*` classes on the wrapper.
 */
export function GradientBlob({
  className,
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <div className={clsx('pointer-events-none', className)} aria-hidden>
      <div
        className={clsx(
          'h-full w-full rounded-full',
          active ? 'animate-[blob-pulse_2.6s_ease-in-out_infinite]' : 'opacity-90',
        )}
        style={{
          background:
            'radial-gradient(circle at 30% 25%, #B7AEFE 0%, transparent 55%),' +
            'radial-gradient(circle at 75% 60%, #F9B5C9 0%, transparent 55%),' +
            'radial-gradient(circle at 50% 80%, #FFC9A7 0%, transparent 55%),' +
            'radial-gradient(circle at 60% 30%, #C5C9F8 0%, transparent 60%)',
          filter: 'blur(28px)',
        }}
      />
    </div>
  );
}
