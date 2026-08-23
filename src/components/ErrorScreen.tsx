import React from 'react';
import { CameraStatus } from '../types';
import { EyeOff, AlertTriangle } from 'lucide-react';

interface ErrorScreenProps {
  status: CameraStatus;
  errorMessage: string | null;
  onRetry: () => void;
  onReset: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  status,
  errorMessage,
  onRetry,
  onReset,
}) => {
  const getDetails = () => {
    switch (status) {
      case 'permission_denied':
        return {
          title: 'THE GLASS CANNOT SEE YOU',
          subtitle: 'Camera access is required to awaken the mirror.',
          buttonText: 'TRY AGAIN',
        };
      case 'camera_unavailable':
        return {
          title: 'VISION OBSCURED',
          subtitle: 'Camera device unavailable or currently in use by another program.',
          buttonText: 'RETRY COMMUNION',
        };
      case 'unsupported':
        return {
          title: 'INCOMPATIBLE VESSEL',
          subtitle: 'Camera access requires a secure connection (HTTPS) or iframe permissions.',
          buttonText: 'TRY AGAIN',
        };
      default:
        return {
          title: 'RITUAL INTERRUPTED',
          subtitle: errorMessage || 'The supernatural glass was unable to manifest reflection.',
          buttonText: 'TRY AGAIN',
        };
    }
  };

  const details = getDetails();

  return (
    <div className="absolute inset-0 bg-[#080503]/96 flex flex-col items-center justify-between p-6 text-center z-30 select-none">
      
      {/* Top Warning Icon */}
      <div className="flex flex-col items-center gap-2 mt-6">
        <div className="w-10 h-10 rounded-full border border-[#6b3030] bg-[#1a0c0c] flex items-center justify-center shadow-[0_0_15px_rgba(180,45,45,0.3)]">
          {status === 'permission_denied' ? (
            <EyeOff className="w-4 h-4 text-[#d46a6a]" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#d46a6a]" />
          )}
        </div>

        <h3 className="text-[14px] font-cinzel font-bold text-[#e6b5b5] tracking-[0.2em] uppercase engraved-text mt-1">
          {details.title}
        </h3>

        <p className="text-[11.5px] font-spectral text-[#bdae9c] leading-relaxed max-w-[220px] italic mt-1">
          "{details.subtitle}"
        </p>
      </div>

      {/* Cartouche Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-[220px] mb-4">
        <button
          type="button"
          onClick={onRetry}
          className="w-full py-2.5 px-4 rounded-sm border cartouche-button transition-all duration-200 flex items-center justify-center gap-2 select-none focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
        >
          {/* Plaque Corner Diamond Rivets */}
          <div className="absolute top-1 left-1.5 w-1 h-1 rotate-45 bg-[#785b37]" />
          <div className="absolute top-1 right-1.5 w-1 h-1 rotate-45 bg-[#785b37]" />
          <div className="absolute bottom-1 left-1.5 w-1 h-1 rotate-45 bg-[#785b37]" />
          <div className="absolute bottom-1 right-1.5 w-1 h-1 rotate-45 bg-[#785b37]" />

          <span className="font-cinzel text-[11.5px] tracking-[0.2em] uppercase font-bold text-[#efe3cb] engraved-gold flex items-center gap-2">
            <span className="text-[#d4af37] text-[9px]">✦</span>
            <span>{details.buttonText}</span>
            <span className="text-[#d4af37] text-[9px]">✦</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-1 text-[9px] text-[#7d6d5c] hover:text-[#bdae9d] font-cinzel tracking-[0.18em] uppercase transition-colors focus:outline-none"
        >
          RETURN TO RESTING STATE
        </button>
      </div>
    </div>
  );
};
