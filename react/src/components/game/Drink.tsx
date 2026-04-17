import { useEffect, useState } from 'react';
import type { DrinkingReason } from '../../president-client/types';

type Props = {
  onClose: () => void;
  drinkingReason: DrinkingReason;
};

const DRINKING_TEXT: Record<DrinkingReason, { title: string; subtitle: string }> = {
  passed:  { title: 'PASSED',  subtitle: "Have yourself a drink for passing!" },
  social:  { title: 'SOOOCIAL!',  subtitle: "Everyone drinks!" },
  skipped: { title: 'SKIIIIIP!',  subtitle: "Dang, you got skipped! Take a drink!" },
};

const BUBBLES = [
  { size: 14, left: '12%', bottom: '18%', delay: 0.0, dur: 3.2 },
  { size:  9, left: '28%', bottom: '38%', delay: 0.8, dur: 2.6 },
  { size: 18, left: '45%', bottom: '12%', delay: 0.3, dur: 3.8 },
  { size: 11, left: '62%', bottom: '52%', delay: 1.2, dur: 2.9 },
  { size:  7, left: '75%', bottom: '28%', delay: 0.5, dur: 3.4 },
  { size: 16, left: '88%', bottom: '62%', delay: 0.1, dur: 2.7 },
  { size: 10, left: '55%', bottom: '72%', delay: 1.5, dur: 3.1 },
  { size: 13, left: '22%', bottom: '82%', delay: 0.9, dur: 2.4 },
  { size:  8, left: '70%', bottom: '46%', delay: 0.4, dur: 3.6 },
  { size: 20, left: '38%', bottom: '66%', delay: 1.1, dur: 3.0 },
  { size: 12, left:  '5%', bottom: '55%', delay: 0.7, dur: 2.8 },
  { size:  6, left: '93%', bottom: '35%', delay: 1.3, dur: 3.3 },
];

export default function Drink({ onClose, drinkingReason }: Props) {
  const { title, subtitle } = DRINKING_TEXT[drinkingReason];
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDone(true), 4400); // 600ms delay + ~3800ms drain
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100dvh', background: 'black', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes liquidDrain {
          0%   { transform: translateY(0); }
          100% { transform: translateY(100%); }
        }
        @keyframes waveScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes bubbleFloat {
          0%   { transform: translateY(0);      opacity: 0.55; }
          100% { transform: translateY(-90vh);  opacity: 0; }
        }
      `}</style>

      <div style={{ position: 'absolute', top: '32px', left: 0, right: 0, textAlign: 'center', zIndex: 1 }}>
        <h1 style={{ margin: 0, fontFamily: "'Barriecito', Arial, sans-serif", fontWeight: '400', fontSize: '72px', color: '#fff', letterSpacing: '2px' }}>
          {title}
        </h1>
        <p style={{ margin: '4px 0 0', fontFamily: "'Barriecito', Arial, sans-serif", fontWeight: '400', fontSize: '32px', color: 'rgba(255,255,255,0.85)', letterSpacing: '1px' }}>
          {subtitle}
        </p>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        background: 'rgba(210, 148, 18, 0.88)',
        animation: 'liquidDrain 3.8s ease-in 0.6s forwards',
        overflow: 'visible',
      }}>
        {/* Wavy surface */}
        <div style={{
          position: 'absolute',
          top: -16,
          left: 0,
          width: '200%',
          animation: 'waveScroll 1.8s linear infinite',
        }}>
          <svg viewBox="0 0 2880 32" width="100%" height="32" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0,16 C180,0 360,32 540,16 C720,0 900,32 1080,16 C1260,0 1440,32 1620,16 C1800,0 1980,32 2160,16 C2340,0 2520,32 2700,16 C2790,8 2880,16 2880,16 L2880,32 L0,32 Z"
              fill="rgba(210, 148, 18, 0.88)"
            />
          </svg>
        </div>

        {/* Bubbles */}
        {BUBBLES.map((b, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: b.left,
            bottom: b.bottom,
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            background: 'rgba(255, 230, 120, 0.22)',
            border: '1.5px solid rgba(255, 240, 160, 0.45)',
            animation: `bubbleFloat ${b.dur}s ease-in ${b.delay}s infinite`,
          }} />
        ))}
      </div>

      {done && (
        <button
          onClick={onClose}
          style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', padding: '14px 28px', background: '#3ab600', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '900', letterSpacing: '1px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}
        >
          OK THAT'S ALL I CAN TAKE
        </button>
      )}
    </div>
  );
}
