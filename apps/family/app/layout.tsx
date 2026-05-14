import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import '@alio/theme/globals.css';

const centuryGothic = localFont({
  src: [
    {
      path: '../../../packages/theme/fonts/CenturyGothic-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../packages/theme/fonts/CenturyGothic-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-century-gothic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Alio — Family',
  description: 'AI copilot for elder care · Family portal',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#5E69F6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={centuryGothic.variable}>
      <body>{children}</body>
    </html>
  );
}
