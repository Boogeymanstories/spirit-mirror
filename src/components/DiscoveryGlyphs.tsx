import React from 'react';
import { MANIFESTATIONS, MANIFESTATION_ORDER } from '../data/manifestations';
import { ManifestationId } from '../types';
import { ARTWORK } from '../assets/artwork';

interface DiscoveryGlyphsProps {
  discovered: Set<ManifestationId>;
  currentId: ManifestationId;
  onSelectManifestation?: (id: ManifestationId) => void;
  isAwakened: boolean;
}

export const DiscoveryGlyphs: React.FC<DiscoveryGlyphsProps> = ({
  discovered,
  currentId,
  onSelectManifestation,
  isAwakened,
}) => {
  return (
    <div
      className="w-full pt-2 pb-0.5 flex flex-col items-center justify-center z-20"
      role="region"
      aria-label="Discovered Manifestation Sigils"
    >
      {/* Medallion Sockets Row */}
      <div className="flex items-center justify-center gap-2 sm:gap-2.5 w-full">
        {MANIFESTATION_ORDER.map((id, index) => {
          const item = MANIFESTATIONS[id];
          const isDiscovered = discovered.has(id);
          const isActive = isAwakened && currentId === id;
          const talismanImg = ARTWORK.talismanSigils[index];
          const celestialImg = ARTWORK.celestialSigils[index];

          return (
            <button
              key={id}
              type="button"
              disabled={!isAwakened || !isDiscovered}
              onClick={() => {
                if (isAwakened && isDiscovered && onSelectManifestation) {
                  onSelectManifestation(id);
                }
              }}
              title={
                isDiscovered
                  ? `${index + 1}. ${item.name} (${item.latinName})`
                  : 'Dormant Sigil — Awaken in the mirror'
              }
              aria-label={
                isDiscovered
                  ? `${index + 1}. ${item.name}`
                  : `Sigil ${index + 1}`
              }
              className={`relative group w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] ${
                isActive
                  ? 'scale-115 shadow-[0_0_14px_rgba(255,200,80,0.8)] border border-[#ffd700]'
                  : isDiscovered
                  ? 'border border-[#5e432c] hover:border-[#d4af37] hover:scale-105 opacity-90'
                  : 'border border-[#261910] opacity-35 cursor-not-allowed filter grayscale'
              }`}
            >
              {/* Production Talisman / Celestial Sigil Graphic Coin */}
              <img
                src={isActive ? celestialImg : talismanImg}
                alt={item.name}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-contain rounded-full transition-all duration-300 ${
                  isActive
                    ? 'filter drop-shadow-[0_0_8px_rgba(255,180,40,0.95)] brightness-110'
                    : isDiscovered
                    ? 'brightness-90 group-hover:brightness-110'
                    : 'brightness-50'
                }`}
              />

              {/* Active Golden Glow Under Coin */}
              {isActive && (
                <span className="absolute -bottom-1.5 w-2 h-2 rounded-full bg-[#ffd700] shadow-[0_0_8px_#ffd700] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
