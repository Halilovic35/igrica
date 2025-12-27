import React, { useMemo } from 'react';
import { MapAssets, ParticleAssets, MetalUIAssets, CandyAssets } from '../../assetsIndex';
import { District } from './types';

interface RomanticCityDistrictProps {
  worldYStart: number; // starting Y of this district in world coords (0 for first)
  cameraY: number;
  zoom: number;
  district: District;
}

export const RomanticCityDistrict: React.FC<RomanticCityDistrictProps> = ({
  worldYStart,
  cameraY,
  zoom,
  district,
}) => {
  // Background gradient for romantic dusk city
  const bgStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: district.height,
    background: 'linear-gradient(180deg, #2b1340 0%, #4a1b5f 50%, #5f1f6c 100%)',
    overflow: 'hidden',
  };

  // Sky texture with parallax
  const skyTexture = MapAssets.backgrounds.find((b) => 
    b.includes('stars') || b.includes('simple_purple')
  ) || MapAssets.backgrounds[0];

  // Građevine su uklonjene - izgledaju loše

  // Floating hearts for foreground
  const floatingHearts = useMemo(() => {
    const hearts: Array<{ x: number; y: number; sprite: string; delay: number }> = [];
    const heartSprites = [
      CandyAssets.hearts.find((h) => h.includes('white')) || CandyAssets.hearts[0],
      CandyAssets.hearts.find((h) => h.includes('pink')) || CandyAssets.hearts[4],
      CandyAssets.hearts.find((h) => h.includes('red')) || CandyAssets.hearts[6],
    ];
    
    for (let i = 0; i < 12; i++) {
      hearts.push({
        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1280),
        y: Math.random() * district.height,
        sprite: heartSprites[i % heartSprites.length],
        delay: Math.random() * 3,
      });
    }
    return hearts;
  }, [worldYStart, district.height]);

  return (
    <>
      {/* Background strip */}
      <div style={{...bgStyle, zIndex: 0}}>
        {/* Sky texture with parallax */}
        <img
          src={skyTexture}
          alt=""
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.15,
            transform: `translateY(${cameraY * 0.1}px)`,
            mixBlendMode: 'screen',
          }}
        />

        {/* District name label */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '32px',
            fontWeight: 600,
            textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 182, 193, 0.5)',
            zIndex: 1,
            fontFamily: 'inherit',
            pointerEvents: 'none',
            userSelect: 'none',
            display: 'none',
          }}
        >
          {district.name}
        </div>
      </div>


      {/* Floating hearts (foreground) */}
      {floatingHearts.map((heart, i) => (
        <img
          key={`heart-${i}`}
          src={heart.sprite}
          alt=""
          className="city-floating-heart"
          style={{
            position: 'absolute',
            left: `${heart.x}px`,
            top: `${heart.y}px`,
            width: '32px',
            height: '32px',
            opacity: 0.7,
            filter: 'drop-shadow(0 0 10px rgba(255, 182, 193, 0.8))',
            transform: 'translate(-50%, -50%)',
            zIndex: 3,
            animationDelay: `${heart.delay}s`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Glowing particles (stars/twinkles) */}
      {[0, 1, 2, 3, 4].map((i) => {
        const particle = ParticleAssets.particles.find((p) => 
          p.includes('twinkle') || p.includes('star_1')
        ) || ParticleAssets.particles[0];
        return (
          <img
            key={`glow-${i}`}
            src={particle}
            alt=""
            style={{
              position: 'absolute',
              left: `${200 + i * 600}px`,
              top: `${100 + i * 200}px`,
              width: '24px',
              height: '24px',
              opacity: 0.5,
              filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))',
              animation: 'twinkleCity 3s ease-in-out infinite',
              animationDelay: `${i * 0.5}s`,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </>
  );
};

