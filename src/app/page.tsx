import Image from 'next/image';
import { Header } from '@/components/header';
import { DispersionTabs } from '@/components/dispersion-tabs';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <DispersionTabs />
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground">
        <p>
          Built for the Celo & Base ecosystems 💙.
        </p>
      </footer>
    </div>
  );
}
