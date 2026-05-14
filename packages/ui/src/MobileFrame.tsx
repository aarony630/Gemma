import { type ReactNode } from 'react';

/**
 * MobileFrame — wraps app content in a phone-shaped viewport (iPhone 16, 393×852).
 * On mobile devices it fills the screen.
 * On desktop it shows a centered phone-shaped frame for demo viewing.
 *
 * The inner is transparent — each screen sets its own background.
 */
export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-30 sm:p-6">
      <div
        className="
          relative w-full
          sm:w-[393px] sm:h-[852px]
          sm:rounded-[40px] sm:overflow-hidden
          sm:shadow-2xl sm:ring-1 sm:ring-black/10
          min-h-screen sm:min-h-0
          bg-brand-tint-2
        "
      >
        {children}
      </div>
    </div>
  );
}
