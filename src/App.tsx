import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CameraFacing, CameraStatus, ManifestationId } from './types';
import { MANIFESTATIONS, MANIFESTATION_ORDER } from './data/manifestations';
import {
  beginCameraRequestGeneration,
  countVideoInputs,
  invalidateCameraRequests,
  isCameraRequestGenerationCurrent,
  requestCamera,
  stopUserCamera,
} from './services/cameraService';
import { resetFaceTrackingSmoothing } from './services/faceTracker';
import { HauntedFrame } from './components/HauntedFrame';
import {
  AgedGlass,
  type PortraitCaptureControl,
  type VideoPlaybackControl,
} from './components/AgedGlass';
import { DiscoveryGlyphs } from './components/DiscoveryGlyphs';
import { ErrorScreen } from './components/ErrorScreen';
import { MASK_ARTWORK, preloadMask } from './assets/artwork';

interface PendingCameraSwitchDelay {
  timeoutId: number;
  requestGeneration: number;
  resolve: (completed: boolean) => void;
}

export default function App() {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('user');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);
  const cameraOperationRef = useRef<number | null>(null);
  const cameraSwitchDelayRef = useRef<PendingCameraSwitchDelay | null>(null);
  const portraitCaptureControlRef = useRef<PortraitCaptureControl | null>(null);
  const videoPlaybackControlRef = useRef<VideoPlaybackControl | null>(null);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [discovered, setDiscovered] = useState<Set<ManifestationId>>(
    new Set<ManifestationId>()
  );
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const transitionTimerRef = useRef<number | null>(null);
  const transitionGenerationRef = useRef(0);
  const transitionLockRef = useRef(false);

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const currentManifestationId = MANIFESTATION_ORDER[currentIndex];
  const currentManifestation = MANIFESTATIONS[currentManifestationId];

  const refreshCameraAvailability = useCallback(async (requestGeneration: number) => {
    const count = await countVideoInputs();
    if (!isCameraRequestGenerationCurrent(requestGeneration)) return;
    setCanSwitchCamera(count > 1);
  }, []);

  const cancelCameraSwitchDelay = useCallback(() => {
    const pendingDelay = cameraSwitchDelayRef.current;
    if (!pendingDelay) return;

    cameraSwitchDelayRef.current = null;
    window.clearTimeout(pendingDelay.timeoutId);
    pendingDelay.resolve(false);
  }, []);

  const waitForCameraSwitchRelease = useCallback(
    (requestGeneration: number): Promise<boolean> =>
      new Promise((resolve) => {
        if (
          !isCameraRequestGenerationCurrent(requestGeneration) ||
          cameraOperationRef.current !== requestGeneration
        ) {
          resolve(false);
          return;
        }

        const timeoutId = window.setTimeout(() => {
          const pendingDelay = cameraSwitchDelayRef.current;
          if (
            pendingDelay?.timeoutId !== timeoutId ||
            pendingDelay.requestGeneration !== requestGeneration
          ) {
            resolve(false);
            return;
          }

          cameraSwitchDelayRef.current = null;
          resolve(
            isCameraRequestGenerationCurrent(requestGeneration) &&
              cameraOperationRef.current === requestGeneration
          );
        }, 80);

        cameraSwitchDelayRef.current = {
          timeoutId,
          requestGeneration,
          resolve,
        };
      }),
    []
  );

  const attemptCameraRecovery = useCallback(
    async (expectedStream?: MediaStream): Promise<void> => {
      if (
        status !== 'active' ||
        !stream ||
        (expectedStream && expectedStream !== stream) ||
        document.visibilityState !== 'visible' ||
        isSwitchingCamera ||
        portraitCaptureControlRef.current?.isActive() ||
        cameraOperationRef.current !== null
      ) {
        return;
      }

      const recoveryGeneration = beginCameraRequestGeneration();
      cameraOperationRef.current = recoveryGeneration;
      const recoveryStream = stream;
      const recoveryFacing = cameraFacing;

      try {
        const track = recoveryStream.getVideoTracks()[0];
        if (track?.readyState === 'live') {
          const playbackResumed =
            (await videoPlaybackControlRef.current?.resume(recoveryStream)) ?? false;

          if (
            !isCameraRequestGenerationCurrent(recoveryGeneration) ||
            cameraOperationRef.current !== recoveryGeneration
          ) {
            return;
          }

          if (playbackResumed && track.readyState === 'live' && !track.muted) {
            return;
          }
        }

        if (
          !isCameraRequestGenerationCurrent(recoveryGeneration) ||
          cameraOperationRef.current !== recoveryGeneration
        ) {
          return;
        }

        setStream(null);
        resetFaceTrackingSmoothing();
        const recovered = await requestCamera(recoveryGeneration, recoveryFacing);

        if (
          !isCameraRequestGenerationCurrent(recoveryGeneration) ||
          cameraOperationRef.current !== recoveryGeneration ||
          recovered.status === 'stale'
        ) {
          return;
        }

        if (recovered.status === 'active' && recovered.stream) {
          setStream(recovered.stream);
          setCameraFacing(recovered.facing);
          setStatus('active');
          setErrorMessage(null);
          resetFaceTrackingSmoothing();
          void refreshCameraAvailability(recoveryGeneration);
          return;
        }

        setStream(null);
        setStatus(recovered.status);
        setErrorMessage(recovered.error || 'The mirror could not restore the camera session.');
      } finally {
        if (cameraOperationRef.current === recoveryGeneration) {
          cameraOperationRef.current = null;
        }
      }
    },
    [cameraFacing, isSwitchingCamera, refreshCameraAvailability, status, stream]
  );

  const handleVideoPlaybackFailure = useCallback(
    (failedStream: MediaStream) => {
      if (
        status !== 'active' ||
        stream !== failedStream ||
        document.visibilityState !== 'visible' ||
        isSwitchingCamera
      ) {
        return;
      }

      portraitCaptureControlRef.current?.cancel();
      invalidateCameraRequests();
      cancelCameraSwitchDelay();
      cameraOperationRef.current = null;
      stopUserCamera();
      failedStream.getTracks().forEach((track) => track.stop());
      resetFaceTrackingSmoothing();
      setStream(null);
      setStatus('error');
      setErrorMessage('Camera playback stopped. Tap retry to reopen the mirror.');
      setIsSwitchingCamera(false);
    }, [cancelCameraSwitchDelay, isSwitchingCamera, status, stream]
  );

  const handleAwaken = useCallback(async () => {
    if (cameraOperationRef.current !== null) return;

    const requestGeneration = beginCameraRequestGeneration();
    cameraOperationRef.current = requestGeneration;

    setStatus('requesting_permission');
    setErrorMessage(null);
    resetFaceTrackingSmoothing();

    try {
      const result = await requestCamera(requestGeneration, 'user');

      if (cameraOperationRef.current !== requestGeneration || result.status === 'stale') return;

      if (result.status === 'active' && result.stream) {
        setStream(result.stream);
        setCameraFacing(result.facing);
        setStatus('active');
        setDiscovered((prev) => new Set(prev).add(currentManifestationId));
        void refreshCameraAvailability(requestGeneration);
      } else {
        setStatus(result.status);
        setErrorMessage(result.error);
      }
    } finally {
      if (cameraOperationRef.current === requestGeneration) {
        cameraOperationRef.current = null;
      }
    }
  }, [currentManifestationId, refreshCameraAvailability]);

  const scheduleTransition = useCallback((durationMs: number, complete: () => void): boolean => {
    if (transitionLockRef.current) return false;

    transitionLockRef.current = true;
    const transitionGeneration = transitionGenerationRef.current + 1;
    transitionGenerationRef.current = transitionGeneration;
    setIsTransitioning(true);

    const timeoutId = window.setTimeout(() => {
      if (
        transitionGenerationRef.current !== transitionGeneration ||
        transitionTimerRef.current !== timeoutId
      ) {
        return;
      }

      transitionTimerRef.current = null;
      try {
        complete();
      } finally {
        if (transitionGenerationRef.current === transitionGeneration) {
          transitionLockRef.current = false;
          setIsTransitioning(false);
        }
      }
    }, durationMs);

    transitionTimerRef.current = timeoutId;
    return true;
  }, []);

  const handleSummonNext = useCallback(() => {
    if (isTransitioning || isSwitchingCamera) return;

    scheduleTransition(550, () => {
      setCurrentIndex((prev) => {
        const nextIdx = (prev + 1) % MANIFESTATION_ORDER.length;
        const nextId = MANIFESTATION_ORDER[nextIdx];
        setDiscovered((d) => new Set(d).add(nextId));
        return nextIdx;
      });
    });
  }, [isTransitioning, isSwitchingCamera, scheduleTransition]);

  const handleRandomMask = useCallback(() => {
    if (isTransitioning || isSwitchingCamera || MANIFESTATION_ORDER.length < 2) return;

    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * MANIFESTATION_ORDER.length);
    }

    const nextId = MANIFESTATION_ORDER[nextIndex];
    preloadMask(MASK_ARTWORK[nextId]);
    scheduleTransition(420, () => {
      setCurrentIndex(nextIndex);
      setDiscovered((d) => new Set(d).add(nextId));
    });
  }, [currentIndex, isTransitioning, isSwitchingCamera, scheduleTransition]);

  const handleSelectManifestation = useCallback(
    (id: ManifestationId) => {
      if (isSwitchingCamera) return;
      const idx = MANIFESTATION_ORDER.indexOf(id);
      if (idx !== -1) {
        scheduleTransition(350, () => {
          setCurrentIndex(idx);
          setDiscovered((d) => new Set(d).add(id));
        });
      }
    },
    [isSwitchingCamera, scheduleTransition]
  );

  const handleSwitchCamera = useCallback(async () => {
    if (
      status !== 'active' ||
      isSwitchingCamera ||
      !canSwitchCamera ||
      portraitCaptureControlRef.current?.isActive() ||
      cameraOperationRef.current !== null
    ) {
      return;
    }

    const requestGeneration = beginCameraRequestGeneration();
    cameraOperationRef.current = requestGeneration;

    const previousFacing = cameraFacing;
    const nextFacing: CameraFacing = previousFacing === 'user' ? 'environment' : 'user';

    setIsSwitchingCamera(true);
    setErrorMessage(null);
    resetFaceTrackingSmoothing();

    // Clearing the React stream first lets Safari release the old srcObject before
    // cameraService stops its tracks and asks for the opposite lens.
    setStream(null);
    const releaseDelayCompleted = await waitForCameraSwitchRelease(requestGeneration);

    try {
      if (
        !releaseDelayCompleted ||
        !isCameraRequestGenerationCurrent(requestGeneration) ||
        cameraOperationRef.current !== requestGeneration
      ) {
        return;
      }

      const switched = await requestCamera(requestGeneration, nextFacing, true);

      if (cameraOperationRef.current !== requestGeneration || switched.status === 'stale') return;

      if (switched.status === 'active' && switched.stream) {
        setStream(switched.stream);
        setCameraFacing(switched.facing);
        setStatus('active');
        resetFaceTrackingSmoothing();
        setIsSwitchingCamera(false);
        void refreshCameraAvailability(requestGeneration);
        return;
      }

      // If the requested lens fails, recover the previous working camera automatically.
      const recovered = await requestCamera(requestGeneration, previousFacing);

      if (cameraOperationRef.current !== requestGeneration || recovered.status === 'stale') return;

      if (recovered.status === 'active' && recovered.stream) {
        setStream(recovered.stream);
        setCameraFacing(recovered.facing);
        setStatus('active');
        setErrorMessage(null);
        resetFaceTrackingSmoothing();
        setIsSwitchingCamera(false);
        void refreshCameraAvailability(requestGeneration);
        return;
      }

      setStream(null);
      setStatus(recovered.status);
      setErrorMessage(recovered.error || switched.error || 'The mirror could not reopen a camera.');
      setIsSwitchingCamera(false);
    } finally {
      if (cameraOperationRef.current === requestGeneration) {
        cameraOperationRef.current = null;
      }
    }
  }, [
    cameraFacing,
    canSwitchCamera,
    isSwitchingCamera,
    refreshCameraAvailability,
    status,
    waitForCameraSwitchRelease,
  ]);

  const handleClose = useCallback(() => {
    invalidateCameraRequests();
    cancelCameraSwitchDelay();
    portraitCaptureControlRef.current?.cancel();
    cameraOperationRef.current = null;
    stopUserCamera();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    resetFaceTrackingSmoothing();
    setStream(null);
    setStatus('idle');
    setCameraFacing('user');
    setCanSwitchCamera(false);
    setIsSwitchingCamera(false);
  }, [cancelCameraSwitchDelay, stream]);

  useEffect(() => {
    if (status !== 'active' || !stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const recoverFromTrackFailure = () => {
      if (document.visibilityState !== 'visible') return;
      if (portraitCaptureControlRef.current?.isActive()) {
        portraitCaptureControlRef.current.cancel();
      }
      void attemptCameraRecovery(stream);
    };

    const handleTrackEnded = () => recoverFromTrackFailure();
    const handleTrackMute = () => recoverFromTrackFailure();

    track.addEventListener('ended', handleTrackEnded);
    track.addEventListener('mute', handleTrackMute);
    return () => {
      track.removeEventListener('ended', handleTrackEnded);
      track.removeEventListener('mute', handleTrackMute);
    };
  }, [attemptCameraRecovery, status, stream]);

  useEffect(() => {
    const handleForeground = () => {
      if (document.visibilityState !== 'visible') return;
      if (portraitCaptureControlRef.current?.isActive()) {
        portraitCaptureControlRef.current.cancel();
      }
      void attemptCameraRecovery();
    };

    document.addEventListener('visibilitychange', handleForeground);
    window.addEventListener('pageshow', handleForeground);
    return () => {
      document.removeEventListener('visibilitychange', handleForeground);
      window.removeEventListener('pageshow', handleForeground);
    };
  }, [attemptCameraRecovery]);

  useEffect(() => {
    return () => {
      invalidateCameraRequests();
      cancelCameraSwitchDelay();
      cameraOperationRef.current = null;
      stopUserCamera();
      resetFaceTrackingSmoothing();
    };
  }, [cancelCameraSwitchDelay]);

  useEffect(() => {
    return () => {
      transitionGenerationRef.current += 1;
      transitionLockRef.current = false;
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, []);

  const isErrorState =
    status === 'permission_denied' ||
    status === 'camera_unavailable' ||
    status === 'unsupported' ||
    status === 'error';

  return (
    <main
      className="w-full min-h-screen bg-[#060504] flex flex-col items-center justify-center p-2 sm:p-4 text-[#c4b998] select-none"
      id="mirror-mask-app"
    >
      <HauntedFrame>
        <div className="relative w-full">
          <AgedGlass
            status={status}
            stream={stream}
            cameraFacing={cameraFacing}
            canSwitchCamera={canSwitchCamera}
            isSwitchingCamera={isSwitchingCamera}
            currentManifestation={currentManifestation}
            isTransitioning={isTransitioning}
            reducedMotion={reducedMotion}
            captureControlRef={portraitCaptureControlRef}
            videoPlaybackControlRef={videoPlaybackControlRef}
            onVideoPlaybackFailure={handleVideoPlaybackFailure}
            onAwaken={handleAwaken}
            onSummonNext={handleSummonNext}
            onRandomMask={handleRandomMask}
            onSwitchCamera={handleSwitchCamera}
            onClose={handleClose}
            onToggleReducedMotion={() => setReducedMotion((prev) => !prev)}
          />

          {isErrorState && (
            <ErrorScreen
              status={status}
              errorMessage={errorMessage}
              onRetry={handleAwaken}
              onReset={() => setStatus('idle')}
            />
          )}
        </div>

        <DiscoveryGlyphs
          discovered={discovered}
          currentId={currentManifestationId}
          onSelectManifestation={handleSelectManifestation}
          isAwakened={status === 'active'}
        />
      </HauntedFrame>
    </main>
  );
}
