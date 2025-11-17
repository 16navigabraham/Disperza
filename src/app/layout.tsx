import type { Metadata } from 'next';
import './globals.css';
import { Web3Provider } from '@/components/web3-provider';
import { Toaster } from '@/components/ui/toaster';
import { FloatingParticles } from '@/components/floating-particles';

export const metadata: Metadata = {
  title: 'Disperza -Token Dispersion',
  description: 'Send multiple ERC20 tokens to multiple recipients in a single transaction .',
  icons: {
    icon: '/icon.png',
  },
  openGraph: {
    images: ['/disperza.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FloatingParticles />
        <Web3Provider>{children}</Web3Provider>
        <Toaster />
      </body>
    </html>
  );
}
