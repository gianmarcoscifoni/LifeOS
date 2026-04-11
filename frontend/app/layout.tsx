import type { Metadata, Viewport } from 'next';
import { Syne, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Sidebar } from '@/components/shared/Sidebar';
import { BottomNav } from '@/components/shared/BottomNav';
import { NebulaBackground } from '@/components/shared/NebulaBackground';
import { VoiceOrb } from '@/components/voice/VoiceOrb';

// Syne — ultra-sharp, futuristic headings (Zara / Apple vibes)
const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

// Inter — the precision body font. Clean, readable, trusted.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LifeOS — Digital Aura',
  description: 'Personal life operating system with RPG gamification',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0A0415',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="it"
      className={`${syne.variable} ${inter.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen text-foreground font-inter antialiased" style={{ backgroundColor: '#0A0415' }}>
        <Providers>
          <NebulaBackground />
          <div className="flex min-h-screen">
            <aside className="hidden lg:flex lg:w-64 lg:flex-shrink-0">
              <Sidebar />
            </aside>
            <main className="flex-1 overflow-auto pb-16 lg:pb-0">
              {children}
            </main>
          </div>
          <BottomNav />
          <VoiceOrb />
        </Providers>
      </body>
    </html>
  );
}
