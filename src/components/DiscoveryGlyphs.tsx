import React from 'react';
import { MANIFESTATIONS, MANIFESTATION_ORDER } from '../data/manifestations';
import { ManifestationId } from '../types';

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
      className="w-full px-3 py-2 border-t border-[#261f18] bg-[#0c0a08]/90 flex flex-col items-center gap-1.5"
      role="region"
      aria-label="Discovered Manifestation Sigils"
    >
      <div className="flex items-center justify-center gap-2.5 sm:gap-3 w-full">
        {MANIFESTATION_ORDER.map((id) => {
          const item = MANIFESTATIONS[id];
          const isDiscovered = discovered.has(id);
          const isActive = isAwakened && currentId === id;

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
                  ? `${item.name} (${item.latinName}) — ${item.glyphTitle}`
                  : 'Undiscovered Manifestation — Summon to awaken'
              }
              aria-label={
                isDiscovered
                  ? `${item.name}: ${item.glyphTitle}`
                  : 'Undiscovered Manifestation'
              }
              className={`relative group w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 focus:outline-none focus:ring-1 focus:ring-[#8c7b60] ${
                isActive
                  ? 'bg-[#1e1913] border border-[#d4af37]/70 shadow-[0_0_10px_rgba(212,175,55,0.35)] scale-110'
                  : isDiscovered
                  ? 'bg-[#14100c] border border-[#4a3d2e] hover:border-[#8c7352] hover:bg-[#1a1510]'
                  : 'bg-[#0a0807] border border-[#1e1914]/60 opacity-40 cursor-not-allowed'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`w-4 h-4 transition-all duration-300 ${
                  isActive
                    ? 'text-[#f0e2b6] filter drop-shadow-[0_0_3px_rgba(240,226,182,0.8)]'
                    : isDiscovered
                    ? 'text-[#9c8972] group-hover:text-[#c4b39b]'
                    : 'text-[#383026]'
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth={isDiscovered ? '1.75' : '1.2'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.glyph} />
              </svg>

              {/* Active occult beacon dot */}
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#d4af37] shadow-[0_0_4px_#d4af37]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Discovery Count Micro-engraving */}
      <div className="text-[10px] tracking-[0.2em] uppercase text-[#695d4d] font-cinzel select-none flex items-center gap-1">
        <span>BOUND SIGILS:</span>
        <span className="text-[#a8957c] font-semibold">
          {discovered.size} / {MANIFESTATION_ORDER.length}
        </span>
      </div>
    </div>
  );
};
