/* Hand-drawn or imported icons not present in the Caesarzkn set.
 * Sized 24x24 unless noted, paths use currentColor for CSS theming.
 */
import type { SVGProps } from 'react';

/**
 * IconKeyboard — outline keyboard (3-row dot pattern + rounded border).
 * Source: /icons/keyboard.svg (user-provided). Native viewBox is 22x14 — we
 * render at 24x24 to align with other icons, with padding around the strokes.
 */
export function IconKeyboard(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 22 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5.2 5.2H5.22812M8.8 5.2H8.82812M15.9719 5.2H16M12.4 5.2H12.4281M7 8.8H7.02812M10.6 8.8H10.6281M14.2 8.8H14.2281M3.4 13H17.8C19.1255 13 20.2 11.9255 20.2 10.6V3.4C20.2 2.07452 19.1255 1 17.8 1H3.4C2.07452 1 1 2.07452 1 3.4V10.6C1 11.9255 2.07452 13 3.4 13Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
