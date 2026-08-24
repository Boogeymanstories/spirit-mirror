import React, { useEffect, useRef } from 'react';
import { MANIFESTATIONS, MANIFESTATION_ORDER } from '../data/manifestations';
import { ManifestationId } from '../types';
import { MASK_ARTWORK, preloadMask } from '../assets/artwork';

interface DiscoveryGlyphsProps {
  discovered: Set<ManifestationId>;
  currentId: ManifestationId;
  onSelectManifestation?: (id: ManifestationId) => void;
  isAwakened: boolean;
}

export const DiscoveryGlyphs: React.FC<DiscoveryGlyphsProps> = ({
  currentId,
  onSelectManifestation,
  isAwakened,
}) => {
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const currentIndex = MANIFESTATION_ORDER.indexOf(currentId);

  useEffect(() => {
    if (isAwakened) {
      activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentId, isAwakened]);


  useEffect(() => {
    if (!isAwakened || currentIndex < 0) return;
    for (let offset = -2; offset <= 2; offset += 1) {
      const idx = (currentIndex + offset + MANIFESTATION_ORDER.length) % MANIFESTATION_ORDER.length;
      const id = MANIFESTATION_ORDER[idx];
      preloadMask(MASK_ARTWORK[id]);
    }
  }, [currentIndex, isAwakened]);

  return (
    <div
      className="w-full pt-1.5 pb-1 flex flex-col items-center justify-center z-20"
      role="region"
      aria-label="Mask selector"
    >
      <div className="w-full overflow-x-auto overscroll-x-contain px-1 mask-strip-scroll">
        <div className="flex items-center gap-2 min-w-max py-1.5">
          {MANIFESTATION_ORDER.map((id, index) => {
            const item = MANIFESTATIONS[id];
            const isActive = isAwakened && currentId === id;
            const maskImg = MASK_ARTWORK[id];

            return (
              <button
                key={id}
                ref={isActive ? activeRef : null}
                type="button"
                disabled={!isAwakened}
                onClick={() => isAwakened && onSelectManifestation?.(id)}
                title={isAwakened ? `Try ${item.name}` : 'Awaken the mirror first'}
                aria-label={`Mask ${index + 1}: ${item.name}`}
                className={`relative group w-11 h-11 shrink-0 rounded-full flex items-center justify-center overflow-hidden transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] bg-[#0a0705] ${
                  isActive
                    ? 'scale-110 border border-[#ffd76a] shadow-[0_0_14px_rgba(255,200,80,0.78)]'
                    : isAwakened
                    ? 'border border-[#5e432c] hover:border-[#d4af37] opacity-90'
                    : 'border border-[#261910] opacity-25 cursor-not-allowed grayscale'
                }`}
              >
                <img
                  src={maskImg}
                  alt=""
                  className={`w-[92%] h-[92%] object-contain transition-all duration-200 ${
                    isActive ? 'brightness-110' : 'brightness-75 group-hover:brightness-100'
                  }`}
                />
                <span className="absolute bottom-0 right-0 min-w-[14px] h-[14px] px-0.5 rounded-tl-md bg-black/70 text-[7px] leading-[14px] text-[#d8c6a4] font-cinzel">
                  {index + 1}
                </span>
                {isActive && (
                  <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-[#ffe48a]/70 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      </div>
      {isAwakened && (
        <div className="mt-0.5 flex items-center gap-2 text-[7px] font-cinzel tracking-[0.16em] uppercase text-[#806e59]">
          <span>MASK {currentIndex + 1} / {MANIFESTATION_ORDER.length}</span>
          <span className="text-[#4e4032]">•</span>
          <span>SWIPE TO BROWSE</span>
        </div>
      )}
    </div>
  );
};
