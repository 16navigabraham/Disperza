"use client";

import { useState, useEffect } from 'react';

interface Seed {
  id: number;
  left: string;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
  type: 'seed1' | 'seed2' | 'seed3';
}

export function FloatingSeeds() {
  const [seeds, setSeeds] = useState<Seed[]>([]);

  useEffect(() => {
    const generateSeeds = () => {
      const seedTypes: ('seed1' | 'seed2' | 'seed3')[] = ['seed1', 'seed2', 'seed3'];
      const newSeeds: Seed[] = Array.from({ length: 25 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 12 + 8, // size between 8px and 20px
        duration: Math.random() * 15 + 15, // duration between 15s and 30s
        delay: Math.random() * 15, // delay up to 15s
        rotation: Math.random() * 360, // random initial rotation
        type: seedTypes[Math.floor(Math.random() * seedTypes.length)],
      }));
      setSeeds(newSeeds);
    };

    generateSeeds();
  }, []);

  const getSeedShape = (type: string, size: number) => {
    const color = 'rgba(76, 175, 80, 0.4)'; // green with more opacity
    const strokeColor = 'rgba(76, 175, 80, 0.6)';
    
    switch (type) {
      case 'seed1':
        // Oval seed
        return (
          <svg width={size} height={size * 1.6} viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="5" cy="8" rx="4" ry="7" fill={color} stroke={strokeColor} strokeWidth="0.5" />
          </svg>
        );
      case 'seed2':
        // Teardrop seed
        return (
          <svg width={size} height={size * 1.5} viewBox="0 0 10 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 0C5 0 1 5 1 9C1 12 2.5 15 5 15C7.5 15 9 12 9 9C9 5 5 0 5 0Z" fill={color} stroke={strokeColor} strokeWidth="0.5" />
          </svg>
        );
      case 'seed3':
        // Almond-shaped seed
        return (
          <svg width={size} height={size * 1.4} viewBox="0 0 10 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 0C2 2 1 4 1 7C1 10 2 12 5 14C8 12 9 10 9 7C9 4 8 2 5 0Z" fill={color} stroke={strokeColor} strokeWidth="0.5" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
      {seeds.map((seed) => (
        <div
          key={seed.id}
          className="absolute bottom-[-30px] animate-float-up"
          style={{
            left: seed.left,
            animationDuration: `${seed.duration}s`,
            animationDelay: `${seed.delay}s`,
            transform: `rotate(${seed.rotation}deg)`,
          }}
        >
          {getSeedShape(seed.type, seed.size)}
        </div>
      ))}
    </div>
  );
}
