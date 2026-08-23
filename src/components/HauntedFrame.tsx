import React from 'react';
import { ARTWORK } from '../assets/artwork';

interface HauntedFrameProps {
  children: React.ReactNode;
}

export const HauntedFrame: React.FC<HauntedFrameProps> = ({ children }) => {
  return (
    <div className="relative w-full max-w-[340px] mx-auto select-none">
      {/* Deep Ambient Cast Shadow Behind Physical Artifact */}
      <div className="absolute inset-x-4 -bottom-4 h-12 bg-black/95 rounded-full blur-xl pointer-events-none" />

      {/* Main Victorian Haunted Mirror Artifact Container */}
      <div className="relative rounded-[28px] overflow-hidden bg-[#070503] border border-[#2b1c10] shadow-[0_30px_70px_rgba(0,0,0,0.99),0_10px_25px_rgba(0,0,0,0.95)] flex flex-col p-2 pb-2.5">
        
        {/* Layer 1: Rear Mirror Frame Photographic Artwork Base */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-45 mix-blend-luminosity">
          <img
            src={ARTWORK.hauntedFrame}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover filter contrast-125 brightness-75"
          />
        </div>

        {/* Top Ornate Apex Crest Header (Baroque relief & Occult Seal) */}
        <header className="relative w-full flex flex-col items-center justify-center pt-1 pb-1 z-20">
          <div className="relative flex items-center justify-center w-full">
            {/* Left Acanthus Flourish */}
            <div className="w-14 h-3.5 opacity-70 mr-1 hidden sm:block">
              <svg viewBox="0 0 80 20" fill="none" stroke="#a38258" strokeWidth="1.2">
                <path d="M0 10 Q20 18 40 10 Q60 2 80 10" />
                <path d="M20 14 Q30 5 45 10" />
                <circle cx="15" cy="13" r="1.5" fill="#a38258" />
                <circle cx="35" cy="8" r="1.5" fill="#a38258" />
              </svg>
            </div>

            {/* Central Antique Occult Seal Medallion */}
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-b from-[#2a1d12] via-[#150e08] to-[#0a0603] border border-[#96774e] shadow-[0_0_12px_rgba(150,119,78,0.45),inset_0_1px_2px_rgba(255,235,180,0.4),inset_0_-2px_4px_rgba(0,0,0,0.95)] flex items-center justify-center">
              <div className="absolute inset-0.5 rounded-full border border-dashed border-[#574028] opacity-60" />
              
              {/* Intricate Pentagram Occult Seal */}
              <svg viewBox="0 0 36 36" className="w-5.5 h-5.5 text-[#e0cfb0] filter drop-shadow-[0_0_2px_rgba(212,175,55,0.8)]" fill="none" stroke="currentColor">
                <circle cx="18" cy="18" r="15" strokeWidth="0.75" />
                <circle cx="18" cy="18" r="12" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
                <polygon
                  points="18,5 21.8,14.5 32,15 24,21.5 27,31 18,25.5 9,31 12,21.5 4,15 14.2,14.5"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                />
                <circle cx="18" cy="18" r="2.8" strokeWidth="0.6" fill="#150e08" />
              </svg>

              {/* Little radiating spires */}
              <div className="absolute -top-0.5 w-1 h-1 rotate-45 bg-[#d4af37]" />
              <div className="absolute -bottom-0.5 w-1 h-1 rotate-45 bg-[#d4af37]" />
            </div>

            {/* Right Acanthus Flourish */}
            <div className="w-14 h-3.5 opacity-70 ml-1 scale-x-[-1] hidden sm:block">
              <svg viewBox="0 0 80 20" fill="none" stroke="#a38258" strokeWidth="1.2">
                <path d="M0 10 Q20 18 40 10 Q60 2 80 10" />
                <path d="M20 14 Q30 5 45 10" />
                <circle cx="15" cy="13" r="1.5" fill="#a38258" />
                <circle cx="35" cy="8" r="1.5" fill="#a38258" />
              </svg>
            </div>
          </div>
        </header>

        {/* Inner Recessed Mirror Vessel Chamber */}
        <div className="relative w-full rounded-[18px] border-[2px] border-[#22150b] bg-[#030202] shadow-[inset_0_0_40px_16px_rgba(0,0,0,0.98),inset_0_2px_4px_rgba(255,235,180,0.12),inset_0_-2px_6px_rgba(0,0,0,0.95)] overflow-hidden z-10">
          {children}
        </div>

        {/* Foreground Baroque Mirror Overlay Frame Relief (Masked to outer frame edges so mirror interior remains crystal clear) */}
        <div
          className="absolute inset-0 pointer-events-none z-30 opacity-60 mix-blend-screen"
          style={{
            maskImage:
              'radial-gradient(ellipse 68% 74% at 50% 50%, transparent 60%, black 90%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 68% 74% at 50% 50%, transparent 60%, black 90%)',
          }}
        >
          <img
            src={ARTWORK.baroqueOverlay}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Subtle Carved Bevel Rim Overlays */}
        <div className="absolute inset-0 rounded-[28px] border border-[#d4af37]/20 pointer-events-none z-40" />
      </div>
    </div>
  );
};
