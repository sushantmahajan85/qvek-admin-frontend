import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Qvek Admin',
  description: 'Qvek EV scooter rental — admin panel.',
  icons: { icon: '/assets/qvek-mark.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B1120',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="admin">
        <Providers>{children}</Providers>
        <noscript>
          <p style={{ padding: 24 }}>The Qvek admin panel needs JavaScript enabled.</p>
        </noscript>
      </body>
    </html>
  );
}
