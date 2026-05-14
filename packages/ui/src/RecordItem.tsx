import clsx from 'clsx';
import {
  IconChevronRight,
  IconMedicalPrescription,
  IconPills,
  IconMedicalRecord,
} from './icons';
import type { MedicalRecord, RecordType } from '@alio/mock-data';

const ICON_FOR_TYPE: Record<RecordType, typeof IconMedicalPrescription> = {
  'Lab report':   IconMedicalPrescription,
  'Prescription': IconPills,
  'Other':        IconMedicalRecord,
};

/**
 * RecordItem — single row in the Records list.
 * Matches Figma FM-records (388:4141): bg-brand-tint-1 card, 48px icon box,
 * title (14px Bold) + "Type | Date" subtitle (12px gray), right chevron.
 */
export function RecordItem({ record, onClick }: { record: MedicalRecord; onClick?: () => void }) {
  const Icon = ICON_FOR_TYPE[record.type] ?? IconMedicalRecord;
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex h-[70px] w-full items-center gap-[12px] rounded-[12px] bg-brand-tint-1 pl-[14px] pr-[16px]',
        'transition-colors active:bg-brand-border',
      )}
    >
      <span className="flex size-[48px] shrink-0 items-center justify-center rounded-[10px] bg-white">
        <Icon className="size-[24px] text-brand-primary" />
      </span>
      <div className="flex flex-1 flex-col gap-[4px] text-left leading-none">
        <span className="text-[14px] font-bold text-[#28292C]">{record.title}</span>
        {/* Figma uses #6C6E76 (medium gray, slightly different from gray-60) */}
        <span className="text-[12px] font-bold text-[#6C6E76]">
          {record.type} | {record.date}
        </span>
      </div>
      <IconChevronRight className="size-[20px] shrink-0 text-brand-primary" />
    </button>
  );
}
