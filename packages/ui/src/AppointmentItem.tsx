import type { Appointment } from '@alio/mock-data';

/**
 * AppointmentItem — row in the "Upcoming" appointments list.
 * Left: month/day chip. Right: title + provider · time.
 */
export function AppointmentItem({ appt }: { appt: Appointment }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5">
      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-tint-1">
        <span className="text-[10px] font-bold text-brand-primary">{appt.month}</span>
        <span className="text-lg font-bold leading-none text-brand-primary">{appt.day}</span>
      </div>
      <div className="flex flex-1 flex-col leading-tight">
        <span className="text-sm font-bold text-gray-100">{appt.title}</span>
        <span className="text-xs text-gray-60">
          {appt.provider} · {appt.time}
        </span>
      </div>
    </div>
  );
}
