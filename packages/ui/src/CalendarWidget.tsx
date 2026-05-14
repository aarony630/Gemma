'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { CalendarMonth, Appointment } from '@alio/mock-data';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * CalendarWidget — single-week strip + Upcoming appointments, in one
 * brand-tint-2 card. Matches the Figma node 254:2880 / page 254:2609.
 *
 * The week shown is the week containing `todayDay` (Monday → Sunday).
 * Appointments are rendered below as a divided list; days that have an
 * appointment in the visible week get a small white-pill marker.
 */
export function CalendarWidget({
  month,
  appointments = [],
}: {
  month: CalendarMonth;
  appointments?: Appointment[];
}) {
  const [selectedDay, setSelectedDay] = useState<number>(month.selectedDay);

  // Visible week: Monday → Sunday around today.
  // Per the Figma mock, today is positioned as the 3rd column (Wed),
  // so the week spans todayDay-2 to todayDay+4.
  const weekStart = month.todayDay - 2;
  const week = Array.from({ length: 7 }, (_, i) => weekStart + i);

  // Which days in the visible week have an appointment?
  const eventDays = new Set(
    appointments
      .filter((a) => MONTH_NAMES[month.month].startsWith(a.month))
      .map((a) => a.day),
  );

  return (
    <div className="flex flex-col gap-[24px] rounded-[15px] bg-brand-tint-2 px-[16px] pb-[16px] pt-[20px]">
      {/* --- Calendar (single week strip) --- */}
      <div className="flex flex-col gap-[12px]">
        {/* Caption: "May 2026" */}
        <div className="flex items-center gap-[8px]">
          <span className="text-[18px] font-bold text-gray-100">
            {MONTH_NAMES[month.month]}
          </span>
          <span className="text-[18px] font-bold text-gray-100">{month.year}</span>
        </div>

        {/* Weekday labels (M T W T F S S) */}
        <div className="grid grid-cols-7">
          {DAY_LABELS.map((d, i) => {
            const isWeekend = i >= 5;
            return (
              <span
                key={i}
                className={clsx(
                  'flex h-[40px] items-center justify-center text-[16px] font-bold',
                  isWeekend ? 'text-alert' : 'text-gray-100',
                )}
              >
                {d}
              </span>
            );
          })}
        </div>

        {/* Thin separator under weekday labels */}
        <div className="-mt-[6px] h-px w-full bg-gray-30" aria-hidden />

        {/* Week strip — 7 day cells */}
        <div className="grid grid-cols-7">
          {week.map((day, colIdx) => {
            const isWeekend = colIdx >= 5;
            const isToday = day === month.todayDay;
            const isSelected = day === selectedDay;
            const hasEvent = eventDays.has(day);
            return (
              <button
                key={colIdx}
                type="button"
                onClick={() => setSelectedDay(day)}
                className="flex h-[48px] items-center justify-center"
              >
                <span
                  className={clsx(
                    'flex size-[40px] items-center justify-center text-[16px] font-normal transition-colors',
                    isToday && 'rounded-full bg-brand-primary text-white',
                    !isToday && isSelected && 'rounded-[12px] border-[1.5px] border-brand-primary text-gray-100',
                    !isToday && !isSelected && hasEvent && 'rounded-[10px] bg-white text-gray-100',
                    !isToday && !isSelected && !hasEvent && isWeekend && 'text-alert',
                    !isToday && !isSelected && !hasEvent && !isWeekend && 'text-gray-100',
                  )}
                >
                  {day}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- Upcoming --- */}
      {appointments.length > 0 && (
        <div className="flex flex-col gap-[8px]">
          <p className="text-[14px] font-bold text-gray-100">Upcoming</p>
          <ul className="flex flex-col">
            {appointments.map((appt, i) => (
              <li
                key={appt.id}
                className={clsx(
                  'flex items-center gap-[10px] py-[10px]',
                  i < appointments.length - 1 && 'border-b-[0.5px] border-brand-border',
                )}
              >
                {/* Date chip */}
                <div className="flex size-[56px] shrink-0 flex-col items-center justify-center gap-[4px] rounded-[12px] border border-brand-border bg-brand-tint-1">
                  <span className="text-[12px] font-bold text-brand-primary leading-none">
                    {appt.month}
                  </span>
                  <span className="text-[16px] font-bold text-gray-100 leading-none">
                    {appt.day}
                  </span>
                </div>
                {/* Title + subtitle */}
                <div className="flex flex-col gap-[4px] pl-[4px]">
                  <p className="text-[16px] font-bold text-gray-100 leading-tight">
                    {appt.title}
                  </p>
                  <p className="text-[14px] font-normal text-gray-100 leading-tight">
                    {appt.provider}・{appt.time}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
