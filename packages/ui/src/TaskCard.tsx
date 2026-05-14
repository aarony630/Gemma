'use client';

import { useState } from 'react';
import clsx from 'clsx';

export type Task = {
  id: string;
  label: string;
  done: boolean;
};

/**
 * TaskCard — AI response card with intro text + interactive task checklist.
 * Used in the Caregiver Logs conversation view.
 */
export function TaskCard({
  intro,
  tasks: initialTasks,
}: {
  intro: string;
  tasks: Task[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  return (
    <div className="self-start max-w-[260px] rounded-2xl bg-white/70 p-3 shadow-sm">
      <p className="text-sm leading-snug text-gray-100">{intro}</p>
      <ul className="mt-2 space-y-1.5">
        {tasks.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() =>
                setTasks((prev) =>
                  prev.map((p) => (p.id === t.id ? { ...p, done: !p.done } : p)),
                )
              }
              className="flex items-center gap-2 text-left"
              aria-pressed={t.done}
            >
              <span
                className={clsx(
                  'flex size-4 shrink-0 items-center justify-center rounded-sm border-[1.5px]',
                  t.done ? 'border-gray-60 bg-gray-60' : 'border-gray-60 bg-transparent',
                )}
              >
                {t.done && (
                  <svg viewBox="0 0 12 12" className="size-3 text-white" fill="none">
                    <path
                      d="M2.5 6.5l2.5 2.5 4.5-5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span
                className={clsx(
                  'text-sm leading-snug',
                  t.done ? 'text-gray-60 line-through' : 'text-gray-100',
                )}
              >
                {t.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
