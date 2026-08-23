import React from 'react';
import { CameraStatus } from '../types';
import { RefreshCw, EyeOff, AlertTriangle } from 'lucide-react';

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
          subtitle: 'Camera Permission Denied',
          explanation:
            'The mirror requires access to your front-facing camera to bind the manifestation to your reflection. Please allow camera permissions in your browser bar or iframe settings.',
        };
      case 'camera_unavailable':
        return {
          title: 'VISION OBSCURED',
          subtitle: 'Camera Device Unavailable',
          explanation:
            'No operational front camera could be engaged, or your camera is currently locked by another application.',
        };
      case 'unsupported':
        return {
          title: 'INCOMPATIBLE VESSEL',
          subtitle: 'Security Restriction',
          explanation:
            'Camera access requires a secure connection (HTTPS) or iframe permission delegation (allow="camera").',
        };
      default:
        return {
          title: 'RITUAL INTERRUPTED',
          subtitle: 'Spectral Failure',
          explanation:
            errorMessage ||
            'The supernatural glass was unable to manifest. Ensure camera device connectivity and try once more.',
        };
    }
  };

  const details = getDetails();

  return (
    <div className="absolute inset-0 bg-[#0a0807]/95 flex flex-col items-center justify-center p-5 text-center z-30 select-none">
      {/* Antique Warning Crest */}
      <div className="w-12 h-12 rounded-full border border-[#522b2b] bg-[#1a0f0f] flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(180,50,50,0.2)]">
        {status === 'permission_denied' ? (
          <EyeOff className="w-6 h-6 text-[#c45a5a]" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-[#c45a5a]" />
        )}
      </div>

      <h3 className="text-sm font-cinzel-dec font-bold text-[#e0a8a8] tracking-[0.14em] uppercase mb-1 engraved-text">
        {details.title}
      </h3>

      <div className="text-[11px] font-cinzel text-[#8c6b6b] tracking-wider uppercase mb-3">
        {details.subtitle}
      </div>

      <p className="text-[12px] font-spectral text-[#a39485] leading-relaxed mb-5 max-w-[260px] italic">
        "{details.explanation}"
      </p>

      <div className="flex flex-col gap-2.5 w-full max-w-[220px]">
        <button
          type="button"
          onClick={onRetry}
          className="w-full py-2 px-4 rounded bg-[#241717] hover:bg-[#331f1f] border border-[#6b3535] hover:border-[#964a4a] text-[#f2dada] font-cinzel text-[11px] tracking-[0.18em] uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-md active:scale-98"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          RETRY COMMUNION
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-1.5 px-3 text-[10px] text-[#7a6b5c] hover:text-[#b09e8b] font-cinzel tracking-[0.14em] uppercase transition-colors"
        >
          RETURN TO WAITING STATE
        </button>
      </div>
    </div>
  );
};
