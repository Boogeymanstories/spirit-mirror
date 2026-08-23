import React, { useState, useEffect, useCallback } from 'react';
import { CameraStatus, ManifestationId } from './types';
import { MANIFESTATIONS, MANIFESTATION_ORDER } from './data/manifestations';
import { requestUserCamera, stopUserCamera } from './services/cameraService';
import { HauntedFrame } from './components/HauntedFrame';
import { AgedGlass } from './components/AgedGlass';
import { DiscoveryGlyphs } from './components/DiscoveryGlyphs';
import { OccultControls } from './components/OccultControls';
import { PrivacyNotice } from './components/PrivacyNotice';
import { ErrorScreen } from './components/ErrorScreen';

export default function App() {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manifestation state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [discovered, setDiscovered] = useState<Set<ManifestationId>>(
    new Set<ManifestationId>(['hollow'])
  );
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Reduced motion support
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const currentManifestationId = MANIFESTATION_ORDER[currentIndex];
  const currentManifestation = MANIFESTATIONS[currentManifestationId];

  // Awaken the mirror (request camera on explicit interaction)
  const handleAwaken = useCallback(async () => {
    setStatus('requesting_permission');
    setErrorMessage(null);

    const result = await requestUserCamera();

    if (result.status === 'active' && result.stream) {
      setStream(result.stream);
      setStatus('active');
      setDiscovered((prev) => new Set(prev).add(currentManifestationId));
    } else {
      setStatus(result.status);
      setErrorMessage(result.error);
    }
  }, [currentManifestationId]);

  // Summon another manifestation with in-world ritual transition
  const handleSummonNext = useCallback(() => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    // Occult transition duration ~600ms
    setTimeout(() => {
      setCurrentIndex((prev) => {
        const nextIdx = (prev + 1) % MANIFESTATION_ORDER.length;
        const nextId = MANIFESTATION_ORDER[nextIdx];
        setDiscovered((d) => new Set(d).add(nextId));
        return nextIdx;
      });
      setIsTransitioning(false);
    }, 550);
  }, [isTransitioning]);

  // Direct selection of discovered manifestation via glyph
  const handleSelectManifestation = useCallback((id: ManifestationId) => {
    const idx = MANIFESTATION_ORDER.indexOf(id);
    if (idx !== -1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(idx);
        setIsTransitioning(false);
      }, 350);
    }
  }, []);

  // Close mirror & shutdown webcam tracks
  const handleClose = useCallback(() => {
    stopUserCamera();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setStatus('idle');
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopUserCamera();
    };
  }, []);

  const isErrorState =
    status === 'permission_denied' ||
    status === 'camera_unavailable' ||
    status === 'unsupported' ||
    status === 'error';

  return (
    <main
      className="w-full min-h-screen bg-[#070605] flex flex-col items-center justify-center p-2 sm:p-4 text-[#c4b998] select-none"
      id="mirror-mask-app"
    >
      <HauntedFrame>
        {/* Mirror Glass Core */}
        <div className="relative w-full">
          <AgedGlass
            status={status}
            stream={stream}
            currentManifestation={currentManifestation}
            isTransitioning={isTransitioning}
            reducedMotion={reducedMotion}
          />

          {/* Designed Gothic Error Overlay */}
          {isErrorState && (
            <ErrorScreen
              status={status}
              errorMessage={errorMessage}
              onRetry={handleAwaken}
              onReset={() => setStatus('idle')}
            />
          )}
        </div>

        {/* Discovery Glyphs Bar */}
        <DiscoveryGlyphs
          discovered={discovered}
          currentId={currentManifestationId}
          onSelectManifestation={handleSelectManifestation}
          isAwakened={status === 'active'}
        />

        {/* Occult In-World Action Controls */}
        <OccultControls
          status={status}
          currentManifestation={status === 'active' ? currentManifestation : null}
          onAwaken={handleAwaken}
          onSummonNext={handleSummonNext}
          onClose={handleClose}
          isTransitioning={isTransitioning}
          reducedMotion={reducedMotion}
          onToggleReducedMotion={() => setReducedMotion((prev) => !prev)}
        />

        {/* Privacy Assurance Microcopy */}
        <PrivacyNotice />
      </HauntedFrame>
    </main>
  );
}
