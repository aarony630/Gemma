import clsx from 'clsx';
import { IconPlus } from './icons';

/**
 * FloatingAddButton — lime green FAB used on Family Home (bottom-right, above tab bar).
 */
export function FloatingAddButton({
  onClick,
  className,
  'aria-label': ariaLabel = 'Add',
}: {
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={clsx(
        'flex size-12 items-center justify-center rounded-xl bg-brand-accent shadow-lg',
        'transition-transform active:scale-95',
        className,
      )}
    >
      <IconPlus className="size-6 text-brand-active" />
    </button>
  );
}
