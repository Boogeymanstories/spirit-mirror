import React from 'react';

interface HauntedFrameProps {
  children: React.ReactNode;
}

export const HauntedFrame: React.FC<HauntedFrameProps> = ({ children }) => {
  return (
    <div className="w-full max-w-[340px] mx-auto p-1.5 sm:p-2 select-none">
      {/* Outer Carved Victorian Frame Vessel */}
      <div className="relative rounded-t-3xl rounded-b-md bg-gradient-to-b from-[#211912] via-[#15100c] to-[#0d0a08] border-2 border-[#3d2e20] shadow-[0_12px_36px_rgba(0,0,0,0.95),_inset_0_1px_2px_rgba(255,255,255,0.1),_inset_0_-2px_6px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Antique Tarnished Corner Filigrees (SVG Inlays) */}
        {/* Top Left Filigree */}
        <div className="absolute top-1.5 left-1.5 w-7 h-7 text-[#6e5840] pointer-events-none opacity-80 z-25">
          <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M2 28 C2 12 12 2 28 2 M6 28 C6 15 15 6 28 6 M2 2 L2 10 M2 2 L10 2" />
            <circle cx="9" cy="9" r="1.5" fill="currentColor" />
          </svg>
        </div>

        {/* Top Right Filigree */}
        <div className="absolute top-1.5 right-1.5 w-7 h-7 text-[#6e5840] pointer-events-none opacity-80 z-25 scale-x-[-1]">
          <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M2 28 C2 12 12 2 28 2 M6 28 C6 15 15 6 28 6 M2 2 L2 10 M2 2 L10 2" />
            <circle cx="9" cy="9" r="1.5" fill="currentColor" />
          </svg>
        </div>

        {/* Top Gothic Arch Peak / Pediment Crest */}
        <div className="w-full pt-3 pb-2 px-3 bg-gradient-to-b from-[#2a2016] to-[#17120e] border-b border-[#2d2218] flex flex-col items-center justify-center relative">
          {/* Subtle Occult Top Seal */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-4 h-px bg-[#5e4933]" />
            <div className="w-2.5 h-2.5 rotate-45 border border-[#8a6e4b] bg-[#1a120b] shadow-[0_0_4px_rgba(138,110,75,0.4)]" />
            <span className="w-4 h-px bg-[#5e4933]" />
          </div>

          <h1 className="text-xs font-cinzel-dec font-black tracking-[0.25em] uppercase text-[#d6c7ae] engraved-text text-center">
            BOOGEYMAN STORIES
          </h1>
          <span className="text-[8px] font-cinzel tracking-[0.28em] uppercase text-[#7a6852] mt-0.5">
            HAUNTED OCCULT RELIC
          </span>
        </div>

        {/* Inner Recessed Mirror Chamber Bevel */}
        <div className="relative border-x-2 border-b-2 border-[#120d09] bg-[#070605] recessed-glass overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
