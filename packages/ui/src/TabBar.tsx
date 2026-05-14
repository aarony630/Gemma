'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';
import clsx from 'clsx';
import {
  IconHome,
  IconMicrophone,
  IconChat,
  IconMedicalRecord,
  IconProfile,
} from './icons';

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;
type Tab = { href: string; label: string; icon: IconCmp };

// Both tab sets live INSIDE TabBar so they're never serialized from a
// Server Component (icon component references can't cross that boundary).
const CAREGIVER_TABS: Tab[] = [
  { href: '/home', label: 'Home', icon: IconHome },
  { href: '/logs', label: 'Log', icon: IconMicrophone },
  { href: '/chat', label: 'Chat', icon: IconChat },
  { href: '/profiles', label: 'Profiles', icon: IconProfile },
];

const FAMILY_TABS: Tab[] = [
  { href: '/home', label: 'Home', icon: IconHome },
  { href: '/ai-check', label: 'AI', icon: IconMicrophone },
  { href: '/chat', label: 'Chat', icon: IconChat },
  { href: '/records', label: 'Records', icon: IconMedicalRecord },
];

export type TabBarVariant = 'caregiver' | 'family';

// Geometry — see comments in earlier file.
const NAV_W = 365;
const NAV_H = 69;
const PAD = 5;
const SLOT_W = (NAV_W - PAD * 2) / 4;

/**
 * TabBar — glassmorphic bottom nav. Use `variant` to switch between caregiver
 * and family tab sets.
 */
export function TabBar({
  className,
  variant = 'caregiver',
}: {
  className?: string;
  variant?: TabBarVariant;
}) {
  const pathname = usePathname();
  const tabs = variant === 'family' ? FAMILY_TABS : CAREGIVER_TABS;
  const activeIdx = tabs.findIndex(
    (t) => pathname === t.href || pathname?.startsWith(t.href + '/'),
  );

  const isFirst = activeIdx === 0;
  const isLast = activeIdx === tabs.length - 1;
  const pillLeft = isFirst ? 0 : PAD + activeIdx * SLOT_W;
  const pillWidth = isFirst || isLast ? SLOT_W + PAD : SLOT_W;

  return (
    <nav
      // See lengthy note in earlier revision: we set position via inline style
      // so the parent's `absolute bottom-4 ...` className wins over any
      // Tailwind base position class.
      className={clsx(
        'flex items-stretch',
        'rounded-full border border-white/80 bg-white/40',
        'shadow-[0_2px_22px_rgba(0,0,0,0.15)] backdrop-blur-2xl',
        className,
      )}
      style={{ width: NAV_W, height: NAV_H, padding: PAD, position: 'absolute' }}
      aria-label="Primary navigation"
    >
      {activeIdx >= 0 && (
        <div
          className="absolute rounded-full bg-gray-30 transition-[left,width] duration-200 ease-out"
          style={{ top: PAD, bottom: PAD, left: pillLeft, width: pillWidth }}
          aria-hidden
        />
      )}

      {tabs.map((tab, idx) => {
        const isActive = idx === activeIdx;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className="relative z-10 flex flex-1 flex-col items-center justify-center gap-1"
          >
            <Icon
              className={clsx(
                'size-6',
                isActive ? 'text-brand-active' : 'text-gray-100',
              )}
            />
            <span
              className={clsx(
                'text-[11.5px] font-bold leading-none',
                isActive ? 'text-brand-active' : 'text-gray-100',
              )}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
