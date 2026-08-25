import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CameraFacing, CameraStatus, FaceMetrics, Manifestation } from '../types';
import { getFaceLandmarker, processVideoFrame, releaseFaceLandmarker } from '../services/faceTracker';
import { renderManifestationOverlay, renderAgedGlassOverlay } from '../rendering/manifestationRenderers';
import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { PowerOff, ShieldCheck, RefreshCw, Shuffle, Camera as CameraIcon, Timer, Download, Share2, RotateCcw } from 'lucide-react';
import { ARTWORK } from '../assets/artwork';


function mapMetricsToCanvas(
  metrics: FaceMetrics,
  drawX: number,
  drawY: number,
  drawW: number,
  drawH: number,
  canvasW: number,
  canvasH: number
): FaceMetrics {
  const mapPoint = (point: { x: number; y: number }) => ({
    x: (drawX + point.x * drawW) / canvasW,
    y: (drawY + point.y * drawH) / canvasH,
  });

  return {
    ...metrics,
    leftEye: mapPoint(metrics.leftEye),
    rightEye: mapPoint(metrics.rightEye),
    mouthCenter: mapPoint(metrics.mouthCenter),
    mouthTop: mapPoint(metrics.mouthTop),
    mouthBottom: mapPoint(metrics.mouthBottom),
    mouthLeft: mapPoint(metrics.mouthLeft),
    mouthRight: mapPoint(metrics.mouthRight),
    chin: mapPoint(metrics.chin),
    forehead: mapPoint(metrics.forehead),
    leftCheek: mapPoint(metrics.leftCheek),
    rightCheek: mapPoint(metrics.rightCheek),
    faceWidth: metrics.faceWidth * (drawW / canvasW),
    faceHeight: metrics.faceHeight * (drawH / canvasH),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The portrait could not be encoded.'))),
      type,
      quality
    );
  });
}

async function loadBlobImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The trapped portrait could not be reopened.'));
    });
    return image;
  } finally {
    // Delay revocation one task so Safari has finished decoding the image resource.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

interface CapturedPortrait {
  blob: Blob;
  signedBlob: Blob;
  url: string;
  maskName: string;
  maskId: string;
  capturedAt: number;
}

interface PendingCaptureDelay {
  timeoutId: number;
  resolve: (isCurrent: boolean) => void;
}

interface PendingPlaybackProbe {
  timeoutId: number;
  frameCallbackId: number | null;
  video: HTMLVideoElement;
  resolve: (isAdvancing: boolean) => void;
}

export interface PortraitCaptureControl {
  isActive: () => boolean;
  cancel: () => void;
}

export interface VideoPlaybackControl {
  resume: (expectedStream: MediaStream) => Promise<boolean>;
}

interface AgedGlassProps {
  status: CameraStatus;
  stream: MediaStream | null;
  cameraFacing: CameraFacing;
  canSwitchCamera: boolean;
  isSwitchingCamera: boolean;
  currentManifestation: Manifestation;
  isTransitioning: boolean;
  reducedMotion: boolean;
  captureControlRef: React.MutableRefObject<PortraitCaptureControl | null>;
  videoPlaybackControlRef: React.MutableRefObject<VideoPlaybackControl | null>;
  onVideoPlaybackFailure: (failedStream: MediaStream) => void;
  onAwaken: () => void;
  onSummonNext: () => void;
  onRandomMask: () => void;
  onSwitchCamera: () => void;
  onClose: () => void;
  onToggleReducedMotion: () => void;
}

export const AgedGlass: React.FC<AgedGlassProps> = ({
  status,
  stream,
  cameraFacing,
  canSwitchCamera,
  isSwitchingCamera,
  currentManifestation,
  isTransitioning,
  reducedMotion,
  captureControlRef,
  videoPlaybackControlRef,
  onVideoPlaybackFailure,
  onAwaken,
  onSummonNext,
  onRandomMask,
  onSwitchCamera,
  onClose,
  onToggleReducedMotion,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const faceDetectedRef = useRef(false);
  const lastFaceProcessTimeRef = useRef(0);
  const lastMetricsRef = useRef<FaceMetrics | null>(null);
  const lastRenderTimeRef = useRef(0);
  const currentStreamRef = useRef<MediaStream | null>(stream);
  const currentFacingRef = useRef<CameraFacing>(cameraFacing);
  const captureLockRef = useRef(false);
  const captureGenerationRef = useRef(0);
  const pendingCaptureDelayRef = useRef<PendingCaptureDelay | null>(null);
  const captureFlashTimerRef = useRef<number | null>(null);
  const pendingPlaybackProbeRef = useRef<PendingPlaybackProbe | null>(null);

  currentStreamRef.current = stream;
  currentFacingRef.current = cameraFacing;

  const [faceDetected, setFaceDetected] = useState(false);
  const [portraitTimerEnabled, setPortraitTimerEnabled] = useState(true);
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  const [isCapturingPortrait, setIsCapturingPortrait] = useState(false);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [capturedPortrait, setCapturedPortrait] = useState<CapturedPortrait | null>(null);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [portraitNotice, setPortraitNotice] = useState<string | null>(null);

  const isCaptureGenerationCurrent = useCallback(
    (generation: number): boolean =>
      captureLockRef.current && captureGenerationRef.current === generation,
    []
  );

  const isCaptureSourceCurrent = useCallback(
    (generation: number, sourceStream: MediaStream, sourceFacing: CameraFacing): boolean => {
      const video = videoRef.current;
      const sourceTrack = sourceStream.getVideoTracks()[0];
      return (
        isCaptureGenerationCurrent(generation) &&
        currentStreamRef.current === sourceStream &&
        currentFacingRef.current === sourceFacing &&
        video?.srcObject === sourceStream &&
        sourceTrack?.readyState === 'live'
      );
    },
    [isCaptureGenerationCurrent]
  );

  const waitForCaptureDelay = useCallback(
    (generation: number, delayMs: number): Promise<boolean> =>
      new Promise((resolve) => {
        if (!isCaptureGenerationCurrent(generation)) {
          resolve(false);
          return;
        }

        const timeoutId = window.setTimeout(() => {
          if (pendingCaptureDelayRef.current?.timeoutId === timeoutId) {
            pendingCaptureDelayRef.current = null;
          }
          resolve(isCaptureGenerationCurrent(generation));
        }, delayMs);

        pendingCaptureDelayRef.current = { timeoutId, resolve };
      }),
    [isCaptureGenerationCurrent]
  );

  const invalidateCapture = useCallback((updateState: boolean) => {
    captureGenerationRef.current += 1;
    captureLockRef.current = false;

    const pendingDelay = pendingCaptureDelayRef.current;
    if (pendingDelay) {
      pendingCaptureDelayRef.current = null;
      window.clearTimeout(pendingDelay.timeoutId);
      pendingDelay.resolve(false);
    }

    if (captureFlashTimerRef.current !== null) {
      window.clearTimeout(captureFlashTimerRef.current);
      captureFlashTimerRef.current = null;
    }

    if (updateState) {
      setCaptureCountdown(null);
      setCaptureFlash(false);
      setIsCapturingPortrait(false);
    }
  }, []);

  useEffect(() => {
    const captureControl: PortraitCaptureControl = {
      isActive: () => captureLockRef.current,
      cancel: () => invalidateCapture(true),
    };
    captureControlRef.current = captureControl;

    return () => {
      if (captureControlRef.current === captureControl) {
        captureControlRef.current = null;
      }
    };
  }, [captureControlRef, invalidateCapture]);

  useEffect(() => {
    return () => invalidateCapture(false);
  }, [invalidateCapture]);

  const cancelPlaybackProbe = useCallback(() => {
    const pendingProbe = pendingPlaybackProbeRef.current;
    if (!pendingProbe) return;

    pendingPlaybackProbeRef.current = null;
    window.clearTimeout(pendingProbe.timeoutId);
    if (pendingProbe.frameCallbackId !== null) {
      pendingProbe.video.cancelVideoFrameCallback(pendingProbe.frameCallbackId);
    }
    pendingProbe.resolve(false);
  }, []);

  const verifyVideoAdvancing = useCallback(
    (video: HTMLVideoElement, expectedStream: MediaStream): Promise<boolean> =>
      new Promise((resolve) => {
        const initialTime = video.currentTime;
        const pendingProbe: PendingPlaybackProbe = {
          timeoutId: 0,
          frameCallbackId: null,
          video,
          resolve,
        };

        const finish = (isAdvancing: boolean, fromFrameCallback = false) => {
          if (pendingPlaybackProbeRef.current !== pendingProbe) return;
          pendingPlaybackProbeRef.current = null;
          window.clearTimeout(pendingProbe.timeoutId);
          if (!fromFrameCallback && pendingProbe.frameCallbackId !== null) {
            video.cancelVideoFrameCallback(pendingProbe.frameCallbackId);
          }
          resolve(
            isAdvancing &&
              video.srcObject === expectedStream &&
              !video.paused &&
              !video.ended
          );
        };

        pendingPlaybackProbeRef.current = pendingProbe;
        pendingProbe.timeoutId = window.setTimeout(() => {
          finish(video.currentTime > initialTime);
        }, 750);

        if (typeof video.requestVideoFrameCallback === 'function') {
          pendingProbe.frameCallbackId = video.requestVideoFrameCallback(() => finish(true, true));
        }
      }),
    []
  );

  const resumeVideoPlayback = useCallback(
    async (expectedStream: MediaStream): Promise<boolean> => {
      cancelPlaybackProbe();
      const video = videoRef.current;
      if (!video || video.srcObject !== expectedStream) return false;

      try {
        await video.play();
      } catch {
        return false;
      }

      if (
        video.srcObject !== expectedStream ||
        video.paused ||
        video.ended ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        return false;
      }

      return verifyVideoAdvancing(video, expectedStream);
    },
    [cancelPlaybackProbe, verifyVideoAdvancing]
  );

  useEffect(() => {
    const playbackControl: VideoPlaybackControl = {
      resume: resumeVideoPlayback,
    };
    videoPlaybackControlRef.current = playbackControl;

    return () => {
      cancelPlaybackProbe();
      if (videoPlaybackControlRef.current === playbackControl) {
        videoPlaybackControlRef.current = null;
      }
    };
  }, [cancelPlaybackProbe, resumeVideoPlayback, videoPlaybackControlRef]);


  const isAwakened = status === 'active';
  const isInitializing =
    status === 'requesting_permission' || status === 'initializing_model';

  // Attach MediaStream to hidden video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    cancelPlaybackProbe();

    if (!stream) {
      video.pause();
      return;
    }

    video.srcObject = stream;
    const playWhenReady = () => {
      video.play().catch((err) => {
        console.warn('Video playback warning:', err);
        if (video.srcObject === stream) {
          onVideoPlaybackFailure(stream);
        }
      });
    };

    if (video.readyState >= 1) playWhenReady();
    else video.addEventListener('loadedmetadata', playWhenReady, { once: true });

    return () => {
      video.removeEventListener('loadedmetadata', playWhenReady);
      if (video.srcObject === stream) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [cancelPlaybackProbe, onVideoPlaybackFailure, stream]);

  useEffect(() => {
    lastFaceProcessTimeRef.current = 0;
    lastMetricsRef.current = null;
    faceDetectedRef.current = false;
    setFaceDetected(false);
  }, [stream, cameraFacing]);

  // Main Render and Face Tracking Loop
  useEffect(() => {
    if (status !== 'active') {
      faceDetectedRef.current = false;
      lastFaceProcessTimeRef.current = 0;
      lastMetricsRef.current = null;
      setFaceDetected(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    getFaceLandmarker().then((landmarker) => {
      if (isSubscribed) {
        landmarkerRef.current = landmarker;
      }
    });

    const renderLoop = (time: number) => {
      if (!isSubscribed) return;
      lastRenderTimeRef.current = time;

      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (canvas && video && video.readyState >= 2) {
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // 1. Process Face Landmarker at ~30fps. Rendering may run faster, but running
          // MediaPipe every animation frame wastes mobile CPU and can make tracking less stable.
          let metrics: FaceMetrics | null = lastMetricsRef.current;
          if (landmarkerRef.current && time - lastFaceProcessTimeRef.current >= 32) {
            metrics = processVideoFrame(landmarkerRef.current, video, time, cameraFacing === 'user');
            lastMetricsRef.current = metrics;
            lastFaceProcessTimeRef.current = time;

            if (faceDetectedRef.current !== metrics.detected) {
              faceDetectedRef.current = metrics.detected;
              setFaceDetected(metrics.detected);
            }
          }

          // 2. Draw the live feed in the same orientation used by face tracking.
          // Front camera behaves like a mirror; rear camera preserves the scene orientation.
          const vWidth = video.videoWidth || 640;
          const vHeight = video.videoHeight || 480;
          const scale = Math.max(width / vWidth, height / vHeight);
          const drawW = vWidth * scale;
          const drawH = vHeight * scale;
          const drawX = (width - drawW) / 2;
          const drawY = (height - drawH) / 2;

          ctx.save();
          if (cameraFacing === 'user') {
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, drawX, drawY, drawW, drawH);
          ctx.restore();

          // 3. Map MediaPipe's normalized video landmarks through the exact same
          // object-fit: cover crop used for the mirrored camera frame. Without this,
          // portrait canvases can place eye anchors incorrectly even when tracking itself is good.
          if (metrics) {
            const canvasMetrics = mapMetricsToCanvas(
              metrics,
              drawX,
              drawY,
              drawW,
              drawH,
              width,
              height
            );

            renderManifestationOverlay(
              ctx,
              width,
              height,
              canvasMetrics,
              currentManifestation.id,
              time,
              reducedMotion
            );
          }

          // 5. Summoning Ritual Transition Distortion
          if (isTransitioning) {
            renderSummoningDistortion(ctx, width, height, time, reducedMotion);
          }

          // 6. High-Resolution Aged Glass Patina Texture Layer (Clean center, edge cracks)
          renderAgedGlassOverlay(ctx, width, height, time, reducedMotion);
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isSubscribed = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [status, currentManifestation, isTransitioning, reducedMotion, cameraFacing, stream]);

  // Clean up FaceLandmarker on unmount
  useEffect(() => {
    return () => {
      landmarkerRef.current = null;
      releaseFaceLandmarker();
    };
  }, []);

  // Revoke captured portrait URLs when a portrait is replaced or this component unmounts.
  useEffect(() => {
    return () => {
      if (capturedPortrait?.url) URL.revokeObjectURL(capturedPortrait.url);
    };
  }, [capturedPortrait]);

  const renderHighResolutionPortrait = async (
    sourceStream: MediaStream,
    sourceFacing: CameraFacing
  ): Promise<Blob> => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1080;
    exportCanvas.height = 1620;
    const exportCtx = exportCanvas.getContext('2d', { alpha: false });
    if (!exportCtx) throw new Error('The portrait canvas could not be prepared.');

    const video = videoRef.current;
    const metrics = lastMetricsRef.current;
    const now = lastRenderTimeRef.current || performance.now();

    if (video && video.srcObject === sourceStream && video.readyState >= 2) {
      const width = exportCanvas.width;
      const height = exportCanvas.height;
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 480;
      const scale = Math.max(width / vWidth, height / vHeight);
      const drawW = vWidth * scale;
      const drawH = vHeight * scale;
      const drawX = (width - drawW) / 2;
      const drawY = (height - drawH) / 2;

      exportCtx.save();
      if (sourceFacing === 'user') {
        exportCtx.translate(width, 0);
        exportCtx.scale(-1, 1);
      }
      exportCtx.drawImage(video, drawX, drawY, drawW, drawH);
      exportCtx.restore();

      if (metrics?.detected) {
        const canvasMetrics = mapMetricsToCanvas(
          metrics,
          drawX,
          drawY,
          drawW,
          drawH,
          width,
          height
        );

        renderManifestationOverlay(
          exportCtx,
          width,
          height,
          canvasMetrics,
          currentManifestation.id,
          now,
          reducedMotion
        );
      }

      renderAgedGlassOverlay(exportCtx, width, height, now, reducedMotion);
    } else {
      throw new Error('The portrait source is no longer current.');
    }

    return canvasToBlob(exportCanvas, 'image/png');
  };

  const signPortraitBlob = async (sourceBlob: Blob): Promise<Blob> => {
    const image = await loadBlobImage(sourceBlob);
    const signedCanvas = document.createElement('canvas');
    signedCanvas.width = image.naturalWidth || 1080;
    signedCanvas.height = image.naturalHeight || 1620;
    const ctx = signedCanvas.getContext('2d', { alpha: false });
    if (!ctx) return sourceBlob;

    ctx.drawImage(image, 0, 0, signedCanvas.width, signedCanvas.height);

    const pad = Math.max(30, signedCanvas.width * 0.035);
    const fontSize = Math.max(22, signedCanvas.width * 0.026);
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.font = `600 ${fontSize}px Georgia, 'Times New Roman', serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(231,214,181,0.78)';
    ctx.fillText('MIRROR MASK  •  BOOGEYMAN STORIES', signedCanvas.width - pad, signedCanvas.height - pad);
    ctx.restore();

    return canvasToBlob(signedCanvas, 'image/png');
  };

  const handleCapturePortrait = async () => {
    if (
      status !== 'active' ||
      isCapturingPortrait ||
      captureLockRef.current ||
      isSwitchingCamera ||
      isTransitioning ||
      capturedPortrait
    ) {
      return;
    }

    const sourceStream = stream;
    const sourceFacing = cameraFacing;
    if (!sourceStream) return;

    const captureGeneration = captureGenerationRef.current + 1;
    captureGenerationRef.current = captureGeneration;
    captureLockRef.current = true;

    if (captureFlashTimerRef.current !== null) {
      window.clearTimeout(captureFlashTimerRef.current);
      captureFlashTimerRef.current = null;
      setCaptureFlash(false);
    }

    setPortraitNotice(null);
    setIsCapturingPortrait(true);

    try {
      if (!isCaptureSourceCurrent(captureGeneration, sourceStream, sourceFacing)) return;

      if (portraitTimerEnabled) {
        for (const count of [3, 2, 1]) {
          setCaptureCountdown(count);
          const delayCompleted = await waitForCaptureDelay(captureGeneration, 760);
          if (
            !delayCompleted ||
            !isCaptureSourceCurrent(captureGeneration, sourceStream, sourceFacing)
          ) {
            return;
          }
        }
        setCaptureCountdown(null);
        const settlingDelayCompleted = await waitForCaptureDelay(captureGeneration, 80);
        if (
          !settlingDelayCompleted ||
          !isCaptureSourceCurrent(captureGeneration, sourceStream, sourceFacing)
        ) {
          return;
        }
      }

      // Freeze the already-smoothed tracking state for this exact export frame.
      // The high-resolution renderer reuses the same metrics without running MediaPipe again.
      if (!isCaptureSourceCurrent(captureGeneration, sourceStream, sourceFacing)) return;
      const blob = await renderHighResolutionPortrait(sourceStream, sourceFacing);
      if (!isCaptureSourceCurrent(captureGeneration, sourceStream, sourceFacing)) return;

      const signedBlob = await signPortraitBlob(blob);
      if (!isCaptureSourceCurrent(captureGeneration, sourceStream, sourceFacing)) return;

      setCaptureFlash(true);
      const flashTimeoutId = window.setTimeout(() => {
        if (
          captureGenerationRef.current !== captureGeneration ||
          captureFlashTimerRef.current !== flashTimeoutId
        ) {
          return;
        }
        captureFlashTimerRef.current = null;
        setCaptureFlash(false);
      }, reducedMotion ? 90 : 210);
      captureFlashTimerRef.current = flashTimeoutId;

      const url = URL.createObjectURL(blob);
      setCapturedPortrait({
        blob,
        signedBlob,
        url,
        maskName: currentManifestation.name,
        maskId: currentManifestation.id,
        capturedAt: Date.now(),
      });
    } catch (error) {
      if (!isCaptureGenerationCurrent(captureGeneration)) return;
      console.warn('Portrait capture failed:', error);
      setPortraitNotice('THE GLASS COULD NOT HOLD THAT IMAGE');
    } finally {
      if (isCaptureGenerationCurrent(captureGeneration)) {
        captureLockRef.current = false;
        setCaptureCountdown(null);
        setIsCapturingPortrait(false);
      }
    }
  };

  const buildExportBlob = (): Blob => {
    if (!capturedPortrait) throw new Error('No portrait is trapped in the glass.');
    return includeSignature ? capturedPortrait.signedBlob : capturedPortrait.blob;
  };

  const portraitFilename = () => {
    if (!capturedPortrait) return 'mirror-mask-portrait.png';
    const safeMask = capturedPortrait.maskId.replace(/_/g, '-');
    return `mirror-mask-${safeMask}-${capturedPortrait.capturedAt}.png`;
  };

  const downloadPortraitBlob = (blob: Blob, filename: string): void => {
    const downloadUrl = URL.createObjectURL(blob);
    let anchor: HTMLAnchorElement | null = null;
    let clickDispatched = false;

    try {
      anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      clickDispatched = true;
    } finally {
      try {
        anchor?.remove();
      } finally {
        let delayedRevocationScheduled = false;
        if (clickDispatched) {
          try {
            window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
            delayedRevocationScheduled = true;
          } catch {
            // Fall through to immediate cleanup if timer scheduling is unavailable.
          }
        }
        if (!delayedRevocationScheduled) {
          URL.revokeObjectURL(downloadUrl);
        }
      }
    }
  };

  const handleSavePortrait = () => {
    if (!capturedPortrait) return;
    setPortraitNotice(null);
    try {
      const blob = buildExportBlob();
      downloadPortraitBlob(blob, portraitFilename());
      setPortraitNotice('PORTRAIT RELEASED');
    } catch (error) {
      console.warn('Portrait save failed:', error);
      setPortraitNotice('SAVE FAILED');
    }
  };

  const handleSharePortrait = async () => {
    if (!capturedPortrait) return;
    setPortraitNotice(null);

    let blob: Blob;
    let filename: string;
    try {
      blob = buildExportBlob();
      filename = portraitFilename();
    } catch (error) {
      console.warn('Portrait export failed:', error);
      setPortraitNotice('SAVE FAILED');
      return;
    }

    const saveFallback = (): void => {
      try {
        downloadPortraitBlob(blob, filename);
        setPortraitNotice('PORTRAIT RELEASED');
      } catch (error) {
        console.warn('Portrait save fallback failed:', error);
        setPortraitNotice('SAVE FAILED');
      }
    };

    if (typeof navigator.share !== 'function') {
      saveFallback();
      return;
    }

    try {
      const file = new File([blob], filename, { type: 'image/png' });
      const sharePayload = {
        files: [file],
        title: `Mirror Mask — ${capturedPortrait.maskName}`,
        text: `I found ${capturedPortrait.maskName} in the Mirror Mask.`,
      };

      if (typeof navigator.canShare === 'function') {
        let canShareFiles = false;
        try {
          canShareFiles = navigator.canShare({ files: [file] });
        } catch {
          canShareFiles = false;
        }

        if (!canShareFiles) {
          saveFallback();
          return;
        }
      }

      await navigator.share(sharePayload);
      setPortraitNotice('PORTRAIT SHARED');
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;
      console.warn('Portrait share failed:', error);
      saveFallback();
    }
  };

  const handleRetakePortrait = () => {
    setCapturedPortrait(null);
    setPortraitNotice(null);
  };

  return (
    <div className="relative w-full aspect-[9/13.5] max-h-[460px] bg-[#050403] overflow-hidden select-none flex items-center justify-center">
      {/* Hidden processing video element */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
        aria-hidden="true"
      />

      {/* Main Canvas rendering mirror & supernatural overlays */}
      <canvas
        ref={canvasRef}
        width={480}
        height={720}
        className={`w-full h-full object-cover transition-opacity duration-700 ${
          status === 'active' ? 'opacity-100' : 'opacity-0'
        } ${isTransitioning && !reducedMotion ? 'summoning-transition' : ''}`}
      />


      {isAwakened && isSwitchingCamera && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#050403]/55 backdrop-blur-[1px] pointer-events-none">
          <div className="px-4 py-2.5 rounded-sm border border-[#7b603d] bg-[#0d0805]/90 shadow-[0_6px_22px_rgba(0,0,0,0.9)] flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
            <span className="font-cinzel text-[10px] tracking-[0.2em] uppercase text-[#eadfc9]">
              TURNING THE GLASS...
            </span>
          </div>
        </div>
      )}

      {isAwakened && captureCountdown !== null && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#030201]/25">
          <div className="w-24 h-24 rounded-full border border-[#caa664]/70 bg-[#090603]/65 shadow-[0_0_45px_rgba(212,175,55,0.22),inset_0_0_25px_rgba(0,0,0,0.9)] flex items-center justify-center">
            <span className="font-cinzel-dec text-[46px] leading-none text-[#f4e8ce] drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)]">
              {captureCountdown}
            </span>
          </div>
          <span className="mt-3 font-cinzel text-[9px] tracking-[0.28em] uppercase text-[#e0c99e]">
            HOLD YOUR REFLECTION
          </span>
        </div>
      )}

      {captureFlash && (
        <div className={`absolute inset-0 z-[55] bg-[#f8edd6] pointer-events-none ${reducedMotion ? 'opacity-35' : 'animate-pulse opacity-60'}`} />
      )}

      {capturedPortrait && (
        <div className="absolute inset-0 z-[70] bg-[#070402]/96 p-3 flex flex-col items-center justify-between overflow-hidden">
          <div className="w-full text-center shrink-0">
            <div className="text-[8px] font-cinzel tracking-[0.28em] uppercase text-[#8f785d]">THE GLASS HAS KEPT IT</div>
            <div className="mt-0.5 text-[14px] font-cinzel-dec tracking-[0.16em] uppercase text-[#efe1c4]">HAUNTED PORTRAIT</div>
          </div>

          <div className="relative my-2 w-full flex-1 min-h-0 overflow-hidden rounded-sm border border-[#6d5435] bg-black shadow-[0_0_28px_rgba(0,0,0,0.95),0_0_16px_rgba(164,124,66,0.18)]">
            <img
              src={capturedPortrait.url}
              alt={`Haunted portrait with ${capturedPortrait.maskName}`}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            {includeSignature && (
              <div className="absolute right-2 bottom-1.5 text-[6.5px] sm:text-[7px] font-serif tracking-[0.08em] text-[#ead9b6]/80 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                MIRROR MASK • BOOGEYMAN STORIES
              </div>
            )}
            <div className="absolute inset-0 pointer-events-none border border-white/5" />
          </div>

          <div className="w-full shrink-0 flex flex-col items-center gap-2">
            <div className="w-full flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRetakePortrait}
                className="flex-1 h-8 rounded-sm border border-[#56422d] bg-[#0e0906] text-[#b8a187] hover:text-[#e2c9a8] hover:border-[#8b6c46] flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="font-cinzel text-[7.5px] tracking-[0.14em] uppercase">RETAKE</span>
              </button>
              <button
                type="button"
                onClick={handleSavePortrait}
                className="flex-1 h-8 rounded-sm border border-[#78603f] bg-[#161008] text-[#dfc79f] hover:text-[#fff1d2] hover:border-[#b68a50] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3 h-3" />
                <span className="font-cinzel text-[7.5px] tracking-[0.14em] uppercase">SAVE</span>
              </button>
              <button
                type="button"
                onClick={handleSharePortrait}
                className="flex-1 h-8 rounded-sm border border-[#9b7848] bg-[#1b1209] text-[#f0d8aa] hover:text-[#fff4d8] hover:border-[#d4af37] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3 h-3" />
                <span className="font-cinzel text-[7.5px] tracking-[0.14em] uppercase">SHARE</span>
              </button>
            </div>

            <div className="w-full flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setIncludeSignature((prev) => !prev)}
                className={`font-cinzel text-[7px] tracking-[0.14em] uppercase transition-colors ${includeSignature ? 'text-[#d2b77e]' : 'text-[#72604d]'}`}
              >
                SIGNATURE {includeSignature ? 'ON' : 'OFF'}
              </button>
              <span className="font-cinzel text-[7px] tracking-[0.12em] uppercase text-[#8f785f]">
                1080 × 1620 PNG
              </span>
            </div>

            <div className="h-3 text-[7px] font-cinzel tracking-[0.18em] uppercase text-[#9f8468]">
              {portraitNotice ?? capturedPortrait.maskName}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* INITIAL DORMANT STATE (HIGH-RES CRACKED GLASS PATINA) */}
      {/* ==================================================== */}
      {!isAwakened && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-5 text-center z-15 overflow-hidden">
          {/* Dormant vessel darkness */}
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#090604] via-[#030202] to-[#090503]" />

          {/* Central sleeping mirror surface */}
          <div className="absolute inset-[9%_8%_15%_8%] z-0 pointer-events-none">
            <div
              className="absolute inset-0 overflow-hidden border border-[#433626] shadow-[inset_0_0_35px_rgba(0,0,0,0.95),inset_0_0_16px_rgba(18,24,24,0.82),0_0_0_1px_rgba(210,180,120,0.06)]"
              style={{ borderRadius: '46% / 40%' }}
            >
              <img
                src={ARTWORK.dormantGlassBg}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover scale-[1.08] opacity-75"
              />

              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,145,150,0.18)_0%,rgba(35,42,44,0.10)_38%,rgba(0,0,0,0.0)_62%)] mix-blend-screen" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.0)_42%,rgba(0,0,0,0.38)_72%,rgba(0,0,0,0.78)_100%)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-black/30 opacity-80 mix-blend-screen" />

              <div className="absolute -left-[8%] top-[7%] h-[72%] w-[26%] rotate-[11deg] bg-gradient-to-r from-transparent via-white/16 to-transparent blur-[10px] opacity-75 mix-blend-screen animate-shimmer" />
              <div className="absolute left-[58%] top-[3%] h-[35%] w-[12%] rotate-[8deg] bg-gradient-to-r from-transparent via-white/8 to-transparent blur-[6px] opacity-60 mix-blend-screen animate-shimmer" />
              <div className="absolute inset-0 border border-white/6" style={{ borderRadius: '46% / 40%' }} />
            </div>
          </div>

          {/* Edge patina */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-35">
            <img
              src={ARTWORK.crackedOverlay}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Top Inscription: "THE GLASS IS WAITING" */}
          <div className="flex flex-col items-center gap-1 mt-6 relative z-10">
            <h2 className="text-[22px] sm:text-[24px] font-cinzel font-normal text-[#efe3cb] tracking-[0.24em] uppercase engraved-silver">
              THE GLASS
            </h2>
            <h3 className="text-[17px] sm:text-[19px] font-cinzel font-normal text-[#d6c8b4] tracking-[0.28em] uppercase engraved-silver -mt-1">
              IS WAITING
            </h3>
          </div>

          {/* Central Cartouche Plaque Button: AWAKEN MIRROR */}
          <div className="w-full max-w-[240px] my-auto flex flex-col items-center gap-4 relative z-20">
            <button
              type="button"
              disabled={isInitializing}
              onClick={onAwaken}
              className={`relative group w-full h-[48px] rounded-sm overflow-hidden border border-[#8c6b41] shadow-[0_6px_20px_rgba(0,0,0,0.95),0_0_12px_rgba(212,175,55,0.25)] transition-all duration-300 transform active:scale-98 hover:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37] ${
                isInitializing ? 'opacity-70 cursor-wait' : 'cursor-pointer hover:shadow-[0_8px_25px_rgba(0,0,0,0.98),0_0_20px_rgba(212,175,55,0.45)]'
              }`}
            >
              <img
                src={ARTWORK.brassPlaque}
                alt="AWAKEN MIRROR"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover filter contrast-125 brightness-95 group-hover:brightness-110 transition-all duration-300"
              />

              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="font-cinzel text-[13px] tracking-[0.24em] font-bold text-[#fcf5e6] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                  AWAKEN MIRROR
                </span>
              </div>

              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

              {isInitializing && (
                <div className="absolute inset-0 bg-[#120c08]/90 z-20 flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
                  <span className="font-cinzel text-[10.5px] tracking-[0.22em] uppercase font-bold text-[#e8ded0]">
                    AWAKENING...
                  </span>
                </div>
              )}
            </button>

            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-cinzel tracking-[0.22em] uppercase text-[#a3907a] text-center font-semibold">
                YOUR REFLECTION
              </span>
              <span className="text-[8.5px] font-cinzel tracking-[0.2em] uppercase text-[#82725e] text-center">
                NEVER LEAVES THE GLASS
              </span>
              <div className="text-[10px] text-[#8c7457] tracking-[0.3em] mt-0.5">
                ✦ ✣ ✦
              </div>
            </div>
          </div>
        </div>
      )}

      {isAwakened && (
        <>
          {/* Top Ambient HUD: Manifestation Latin Name & Tracking Status */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-20">
            {/* Manifestation Name Cartouche */}
            <div className="px-2.5 py-1 rounded bg-[#0b0805]/90 border border-[#4a3620] shadow-[0_4px_12px_rgba(0,0,0,0.9)] backdrop-blur-xs flex flex-col">
              <span className="text-[7.5px] font-cinzel tracking-[0.22em] uppercase text-[#9e886f]">
                {currentManifestation.latinName}
              </span>
              <span className="text-[10.5px] font-cinzel font-bold text-[#efe3cb] tracking-[0.14em] uppercase engraved-text">
                {currentManifestation.name}
              </span>
            </div>

            {/* Subtle Ocular Tracking Indicator */}
            <div
              className={`px-2 py-0.5 rounded text-[8px] font-cinzel tracking-wider uppercase border flex items-center gap-1.5 transition-colors duration-300 ${
                isSwitchingCamera
                  ? 'bg-[#15110a]/90 border-[#6b5432] text-[#e0c889]'
                  : faceDetected
                  ? 'bg-[#09140c]/90 border-[#2b4c36] text-[#a4dcb8]'
                  : 'bg-[#170e07]/90 border-[#472f1b] text-[#c9a378]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSwitchingCamera
                    ? 'bg-[#d4af37] animate-pulse'
                    : faceDetected
                    ? 'bg-[#4ade80] shadow-[0_0_6px_#4ade80]'
                    : 'bg-[#f59e0b] animate-ping'
                }`}
              />
              <span>{isSwitchingCamera ? 'TURNING' : faceDetected ? 'BOUND' : 'SEEKING'}</span>
            </div>
          </div>

          {/* Central Lower Cartouche Plaque Button: TRY ANOTHER MASK */}
          <div className="absolute bottom-4 inset-x-4 flex flex-col items-center gap-2 z-25">
            <button
              type="button"
              disabled={isTransitioning || isSwitchingCamera}
              onClick={onSummonNext}
              className={`relative group w-full max-w-[220px] h-[46px] rounded-sm overflow-hidden border border-[#8c6b41] shadow-[0_6px_20px_rgba(0,0,0,0.95),0_0_12px_rgba(212,175,55,0.25)] transition-all duration-200 transform active:scale-98 hover:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37] ${
                isTransitioning ? 'opacity-75 cursor-wait' : 'cursor-pointer hover:shadow-[0_8px_25px_rgba(0,0,0,0.98),0_0_18px_rgba(212,175,55,0.4)]'
              }`}
            >
              {/* High-Resolution Brass Cartouche Plaque Asset */}
              <img
                src={ARTWORK.brassPlaque}
                alt="TRY ANOTHER MASK"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover filter contrast-125 brightness-95 group-hover:brightness-110 transition-all duration-200"
              />

              {/* Plaque Text Overlay */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="font-cinzel text-[11.5px] tracking-[0.22em] font-bold text-[#fcf5e6] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                  TRY ANOTHER MASK
                </span>
              </div>

              {/* Shimmering Glint */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

              {isTransitioning && (
                <div className="absolute inset-0 bg-[#140c07]/90 z-20 flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
                  <span className="font-cinzel text-[10.5px] tracking-[0.2em] uppercase font-bold text-[#e8ded0]">
                    CHANGING MASK...
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              disabled={isTransitioning || isSwitchingCamera || isCapturingPortrait}
              onClick={handleCapturePortrait}
              title={portraitTimerEnabled ? 'Capture haunted portrait after a 3 second countdown' : 'Capture haunted portrait instantly'}
              className="w-full max-w-[220px] h-8 rounded-sm border border-[#8e7048] bg-[#120c07]/95 hover:border-[#d4af37] text-[#e5cfaa] hover:text-[#fff0d2] flex items-center justify-center gap-2 transition-all focus:outline-none disabled:opacity-45 disabled:cursor-wait shadow-[0_4px_12px_rgba(0,0,0,0.65)]"
            >
              <CameraIcon className="w-3.5 h-3.5" />
              <span className="font-cinzel text-[8px] tracking-[0.17em] uppercase">
                {isCapturingPortrait ? 'HOLD STILL...' : 'CAPTURE PORTRAIT'}
              </span>
            </button>

            <div className="flex items-center gap-2 w-full max-w-[220px]">
              {canSwitchCamera && (
                <button
                  type="button"
                  disabled={isSwitchingCamera || isTransitioning || isCapturingPortrait}
                  onClick={onSwitchCamera}
                  title={`Switch to ${cameraFacing === 'user' ? 'rear' : 'front'} camera`}
                  className="flex-1 h-7 rounded-sm border border-[#4f3b26] bg-[#0e0906]/90 hover:border-[#8d6c43] text-[#aa9275] hover:text-[#e1c79d] flex items-center justify-center gap-1.5 transition-all focus:outline-none disabled:opacity-40 disabled:cursor-wait"
                >
                  <RefreshCw className={`w-3 h-3 ${isSwitchingCamera ? 'animate-spin' : ''}`} />
                  <span className="font-cinzel text-[7.5px] tracking-[0.14em] uppercase">
                    {isSwitchingCamera ? 'TURNING...' : 'FLIP CAMERA'}
                  </span>
                </button>
              )}

              <button
                type="button"
                disabled={isTransitioning || isSwitchingCamera}
                onClick={onRandomMask}
                title="Choose a random mask"
                className={`${canSwitchCamera ? 'flex-1' : 'w-full'} h-7 rounded-sm border border-[#4f3b26] bg-[#0e0906]/90 hover:border-[#8d6c43] text-[#aa9275] hover:text-[#e1c79d] flex items-center justify-center gap-1.5 transition-all focus:outline-none disabled:opacity-40`}
              >
                <Shuffle className="w-3 h-3" />
                <span className="font-cinzel text-[7.5px] tracking-[0.14em] uppercase">RANDOM MASK</span>
              </button>
            </div>

            {/* Discreet Secondary Latch Bar */}
            <div className="flex items-center justify-between w-full max-w-[230px] px-0.5 text-[7.5px] font-cinzel tracking-wider uppercase">
              <button
                type="button"
                onClick={() => setPortraitTimerEnabled((prev) => !prev)}
                title="Toggle portrait countdown"
                className={`flex items-center gap-1 transition-colors focus:outline-none ${portraitTimerEnabled ? 'text-[#c8aa73] hover:text-[#eed099]' : 'text-[#77634e] hover:text-[#b49b7b]'}`}
              >
                <Timer className="w-2.5 h-2.5" />
                <span>{portraitTimerEnabled ? '3S TIMER' : 'INSTANT'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleReducedMotion}
                title="Toggle stabilized spectral motion"
                className="text-[#877562] hover:text-[#c4b3a0] flex items-center gap-1 transition-colors focus:outline-none"
              >
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>{reducedMotion ? 'STABLE' : 'TREMOR'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                title="Close the mirror"
                className="text-[#965e5e] hover:text-[#d68585] flex items-center gap-1 transition-colors focus:outline-none"
              >
                <PowerOff className="w-2.5 h-2.5" />
                <span>REST</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Summoning transition ritual distortion flash
function renderSummoningDistortion(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  reducedMotion: boolean
) {
  if (reducedMotion) return;

  ctx.save();
  const flashAlpha = 0.25 + 0.2 * Math.sin(timeMs * 0.03);
  ctx.fillStyle = `rgba(212, 175, 55, ${flashAlpha * 0.45})`;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  for (let i = 0; i < height; i += 7) {
    if (Math.sin(i + timeMs * 0.015) > 0.4) {
      ctx.fillRect(0, i, width, 2.5);
    }
  }
  ctx.restore();
}
