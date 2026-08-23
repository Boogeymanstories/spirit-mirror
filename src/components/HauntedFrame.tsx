import React from 'react';
import { ARTWORK } from '../assets/artwork';

interface HauntedFrameProps {
  children: React.ReactNode;
}

export const HauntedFrame: React.FC<HauntedFrameProps> = ({ children }) => {
  return (
    <div className="relative w-full max-w-[340px] mx-auto select-none">
      {/* Deep ambient shadow makes the artifact feel physically separate from the page. */}
      <div className="absolute inset-x-4 -bottom-4 h-12 bg-black/95 rounded-full blur-xl pointer-events-none" />

      <div className="relative rounded-[28px] overflow-hidden bg-[#070503] border border-[#2b1c10] shadow-[0_30px_70px_rgba(0,0,0,0.99),0_10px_25px_rgba(0,0,0,0.95)] flex flex-col p-2 pb-2.5">
        {/* Real production artwork is the frame. Do not redraw the ornament with CSS/SVG. */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-70">
          <img
            src={ARTWORK.hauntedFrame}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover contrast-[1.08] brightness-[0.68] saturate-[0.82]"
          />
        </div>

        {/* Asset-driven crest. The previous procedural SVG crest was intentionally removed. */}
        <header className="relative w-full h-10 z-20 pointer-events-none overflow-visible">
          <img
            src={ARTWORK.hauntedFrame}
            alt=""
            referrerPolicy="no-referrer"
            className="absolute left-1/2 -top-1 -translate-x-1/2 w-[118%] h-[92px] object-cover object-top opacity-90 contrast-[1.08] brightness-[0.82]"
            style={{
              maskImage: 'linear-gradient(to bottom, black 0%, black 54%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 54%, transparent 100%)',
            }}
          />
        </header>

        {/* Recessed mirror vessel. */}
        <div className="relative w-full rounded-[18px] border-[2px] border-[#22150b] bg-[#030202] shadow-[inset_0_0_40px_16px_rgba(0,0,0,0.98),inset_0_2px_4px_rgba(255,235,180,0.10),inset_0_-2px_6px_rgba(0,0,0,0.95)] overflow-hidden z-10">
          {children}
        </div>

        {/* High-resolution foreground frame artwork creates real material depth around the glass. */}
        <div
          className="absolute inset-0 pointer-events-none z-30 opacity-85"
          style={{
            maskImage:
              'radial-gradient(ellipse 68% 74% at 50% 50%, transparent 58%, black 86%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 68% 74% at 50% 50%, transparent 58%, black 86%)',
          }}
        >
          <img
            src={ARTWORK.baroqueOverlay}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover contrast-[1.08] brightness-[0.78] saturate-[0.88]"
          />
        </div>

        <div className="absolute inset-0 rounded-[28px] border border-[#d4af37]/16 pointer-events-none z-40" />
      </div>
    </div>
  );
};
