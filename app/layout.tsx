import type { Metadata } from 'next';
import { Geist_Mono, Source_Sans_3, Instrument_Sans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Providers } from './providers';

const instrumentSansHeading = Instrument_Sans({ subsets: ['latin'], variable: '--font-heading' });
const sourceSans3 = Source_Sans_3({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Newgen Online School — Internal System',
  description: 'Internal admin and agent management system for Newgen Online School',
  icons: {
    icon: '/newgen-logo.png',
    apple: '/newgen-logo.png',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(
      'h-full antialiased',
      sourceSans3.variable,
      instrumentSansHeading.variable,
      geistMono.variable,
    )}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
