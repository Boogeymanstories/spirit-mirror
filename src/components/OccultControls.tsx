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
    <div className="w-full bg-[#120e0b] border-t border-[#2a221b] p-3 flex flex-col items-center gap-2.5 z-20">
      {!isAwakened ? (
        // Initial Idle State: Prominent Awaken Control
        <div className="w-full flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={isInitializing}
            onClick={onAwaken}
            className={`w-full relative group overflow-hidden py-3 px-4 rounded-sm border transition-all duration-300 shadow-[0_4px_14px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2.5 select-none ${
              isInitializing
                ? 'bg-[#1a1510] border-[#4a3b2b] text-[#8c7860] cursor-wait'
                : 'bg-gradient-to-b from-[#2a1e14] to-[#1a120b] hover:from-[#3a2a1c] hover:to-[#24190f] border-[#8a6e4b]/80 hover:border-[#d4af37] text-[#f2e6cb] hover:text-[#fff6e0] active:scale-[0.98]'
            }`}
          >
            {/* Ambient ritual shimmer */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#d4af37]/15 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

            {isInitializing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#8c7860] border-t-transparent rounded-full animate-spin" />
                <span className="font-cinzel text-[11px] tracking-[0.2em] uppercase font-bold text-shadow">
                  OPENING THE GLASS...
                </span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 text-[#d4af37] group-hover:text-[#ffd700] transition-colors filter drop-shadow-[0_0_4px_rgba(212,175,55,0.6)]" />
                <span className="font-cinzel-dec text-[12px] tracking-[0.22em] uppercase font-bold text-shadow">
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
            className={`w-full py-2.5 px-3 rounded-sm border transition-all duration-200 shadow-md flex items-center justify-center gap-2 select-none ${
              isTransitioning
                ? 'bg-[#221610] border-[#6b4530] text-[#c98055] animate-pulse cursor-wait'
                : 'bg-gradient-to-b from-[#2e2017] to-[#1c130d] hover:from-[#3d2a1f] hover:to-[#261911] border-[#7d5c3b] hover:border-[#bfa068] text-[#f5ebd6] active:scale-[0.98]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37] animate-pulse" />
            <span className="font-cinzel-dec text-[11px] tracking-[0.2em] uppercase font-bold engraved-text">
              {isTransitioning ? 'COMMUNING...' : 'SUMMON ANOTHER'}
            </span>
          </button>

          {/* Secondary Utility Controls Bar */}
          <div className="w-full flex items-center justify-between pt-1 border-t border-[#211a14] px-0.5">
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
              className={`flex items-center gap-1.5 text-[10px] font-cinzel tracking-wider uppercase transition-colors ${
                reducedMotion
                  ? 'text-[#82a89a] hover:text-[#a8d1c1]'
                  : 'text-[#6e5d4d] hover:text-[#9e8770]'
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
              className="flex items-center gap-1.5 text-[10px] font-cinzel text-[#825353] hover:text-[#bd7a7a] tracking-wider uppercase transition-colors"
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
