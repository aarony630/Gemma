import type { ComponentType, SVGProps } from 'react';
import clsx from 'clsx';

/**
 * VitalTile — small white tile inside the Today's Status card.
 * Horizontal layout: icon box (30px) + label/value stack.
 *
 * Text scale (shared with MedicationsTile for consistency):
 *   • label = 10px bold
 *   • value = 12px bold
 */
export function VitalTile({
  label,
  value,
  Icon,
  className,
}: {
  label: string;
  value: string;
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-center gap-[6px] rounded-[12px] bg-white p-[8px]', className)}>
      {Icon && (
        <span className="flex w-[30px] shrink-0 items-center justify-center rounded-[8px] bg-brand-tint-2 p-[5px]">
          <Icon className="size-5 text-brand-primary" />
        </span>
      )}
      <div className="flex flex-col gap-[4px] leading-none text-gray-90">
        <span className="text-[10px] font-bold">{label}</span>
        <span className="text-[12px] font-bold">{value}</span>
      </div>
    </div>
  );
}
