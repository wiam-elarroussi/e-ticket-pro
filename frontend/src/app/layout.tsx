import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'E-Ticket Pro — Command Center',
  description: 'Centre de contrôle E-Ticket Pro — Stade de Casablanca',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export const viewport = {
  themeColor: '#00875A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=6" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon.png?v=6" />
        <link rel="apple-touch-icon" href="/icon.png?v=6" />
        {/* Applique le thème sombre sauvegardé avant l'hydratation React —
            évite le flash clair et toute course avec l'ordre des effets. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('eticketpro.theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className={`${jakarta.variable} font-sans antialiased bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
