import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Kairo',
  description: 'Kairo — AI Agent Chat Interface',
  openGraph: {
    title: 'Kairo — AI Agent Chat Interface',
    description: 'Chat with a powerful AI agent. Upload files, write code, visualize data — all in one place.',
    url: 'https://fullstack-chat-agent-fe.vercel.app',
    siteName: 'Kairo',
    images: [{ url: 'https://fullstack-chat-agent-fe.vercel.app/kairo.svg', width: 120, height: 120, alt: 'Kairo logo' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Kairo — AI Agent Chat Interface',
    description: 'Chat with a powerful AI agent. Upload files, write code, visualize data — all in one place.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/kairo.svg?v=3" />
        <link rel="shortcut icon" href="/kairo.svg?v=3" />
        <link rel="apple-touch-icon" href="/kairo.svg?v=3" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
