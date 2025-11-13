"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Particle {
  id: number;
  left: string;
  size: number;
  duration: number;
  delay: number;
}

export function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles: Particle[] = Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 6 + 2, // size between 2px and 8px
        duration: Math.random() * 10 + 10, // duration between 10s and 20s
        delay: Math.random() * 10, // delay up to 10s
      }));
      setParticles(newParticles);
    };

    generateParticles();
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-[-10px] block bg-primary/20 rounded-full animate-float-up"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
