import React from 'react';
import { Sparkles, PowerOff, ShieldCheck, Flame } from 'lucide-react';
import { CameraStatus, Manifestation } from '../types';

interface OccultControlsProps {
  status: CameraStatus;
  currentManifestation: Manifestation | null;
  onAwaken: () => void;
  onSummonNext: () => void;
  onClose: () => void;
  isTransitioning: boolean;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

export const OccultControls: React.FC<OccultControlsProps> = ({
  status,
  currentManifestation,
  onAwaken,
  onSummonNext,
  onClose,
  isTransitioning,
  reducedMotion,
  onToggleReducedMotion,
}) => {
  const isAwakened = status === 'active';
  const isInitializing =
    status === 'requesting_permission' || status === 'initializing_model';

  return (
    <div className="w-full bg-gradient-to-b from-[#140e09] via-[#0f0a06] to-[#0a0704] border-t border-[#261b11] p-3 flex flex-col items-center gap-2.5 z-20">
      {!isAwakened ? (
        // Initial Idle State: Prominent Heavy Brass Ritual Plaque
        <div className="w-full flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={isInitializing}
            onClick={onAwaken}
            className={`w-full relative group overflow-hidden py-3.5 px-4 rounded-sm border transition-all duration-300 flex items-center justify-center gap-2.5 select-none focus:outline-none focus:ring-1 focus:ring-[#d4af37] ${
              isInitializing
                ? 'bg-[#18110b] border-[#4a3622] text-[#8c7456] cursor-wait'
                : 'metal-plaque hover:metal-plaque-hover border-[#856743] hover:border-[#d4af37] text-[#f5ebd2] hover:text-[#fff9eb] active:scale-[0.98]'
            }`}
          >
            {/* Ambient ritual candlelight shimmer */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#d4af37]/20 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

            {/* Brass Corner Rivets on the Plaque */}
            <div className="absolute top-1 left-1.5 w-1 h-1 rounded-full bg-[#54412b] border border-[#2b1f13]" />
            <div className="absolute top-1 right-1.5 w-1 h-1 rounded-full bg-[#54412b] border border-[#2b1f13]" />
            <div className="absolute bottom-1 left-1.5 w-1 h-1 rounded-full bg-[#54412b] border border-[#2b1f13]" />
            <div className="absolute bottom-1 right-1.5 w-1 h-1 rounded-full bg-[#54412b] border border-[#2b1f13]" />

            {isInitializing ? (
              <>
                <div className="w-4 h-4 border-2 border-[#8c7456] border-t-transparent rounded-full animate-spin" />
                <span className="font-cinzel text-[11px] tracking-[0.22em] uppercase font-bold text-shadow">
                  OPENING THE GLASS...
                </span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 text-[#d4af37] group-hover:text-[#ffd700] transition-colors filter drop-shadow-[0_0_5px_rgba(212,175,55,0.7)] animate-flame" />
                <span className="font-cinzel-dec text-[13px] tracking-[0.22em] uppercase font-black engraved-gold">
                  AWAKEN MIRROR
                </span>
              </>
            )}
          </button>
        </div>
      ) : (
        // Active Mirror State: In-World Occult Summoning & Latch Controls
        <div className="w-full flex flex-col gap-2">
          {/* Summon Another Manifestation - Primary In-World Control */}
          <button
            type="button"
            disabled={isTransitioning}
            onClick={onSummonNext}
            className={`w-full py-2.5 px-3 rounded-sm border transition-all duration-200 shadow-md flex items-center justify-center gap-2 select-none focus:outline-none focus:ring-1 focus:ring-[#d4af37] ${
              isTransitioning
                ? 'bg-[#22140d] border-[#78432b] text-[#d68558] animate-pulse cursor-wait'
                : 'metal-plaque hover:metal-plaque-hover border-[#7a5b3a] hover:border-[#c4a164] text-[#f7eedc] active:scale-[0.98]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37] animate-pulse" />
            <span className="font-cinzel-dec text-[11.5px] tracking-[0.2em] uppercase font-bold engraved-text">
              {isTransitioning ? 'COMMUNING...' : 'SUMMON ANOTHER'}
            </span>
          </button>

          {/* Secondary Utility Controls Bar */}
          <div className="w-full flex items-center justify-between pt-1.5 border-t border-[#24190f] px-1">
            {/* Reduced Motion / Tremor Toggle */}
            <button
              type="button"
              onClick={onToggleReducedMotion}
              title={
                reducedMotion
                  ? 'Spectral motion is currently stabilized'
                  : 'Toggle stabilized spectral motion'
              }
              aria-label={
                reducedMotion
                  ? 'Spectral Tremor: Stabilized'
                  : 'Spectral Tremor: Active'
              }
              className={`flex items-center gap-1.5 text-[9.5px] font-cinzel tracking-wider uppercase transition-colors focus:outline-none ${
                reducedMotion
                  ? 'text-[#8cb8a6] hover:text-[#b4e0ce]'
                  : 'text-[#7a6552] hover:text-[#ab9078]'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>{reducedMotion ? 'STABLE REFLECTION' : 'SPECTRAL TREMOR'}</span>
            </button>

            {/* Close Mirror / Camera Off */}
            <button
              type="button"
              onClick={onClose}
              title="Close the mirror and deactivate camera"
              aria-label="Close Mirror"
              className="flex items-center gap-1.5 text-[9.5px] font-cinzel text-[#9c5959] hover:text-[#d17d7d] tracking-wider uppercase transition-colors focus:outline-none"
            >
              <PowerOff className="w-3 h-3" />
              <span>CLOSE MIRROR</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
