import React, { useEffect, useRef, useState } from 'react';
import { CameraStatus, FaceMetrics, Manifestation, ParanormalState } from '../types';
import { getFaceLandmarker, processVideoFrame, releaseFaceLandmarker } from '../services/faceTracker';
import { renderManifestationOverlay, renderAgedGlassOverlay } from '../rendering/manifestationRenderers';
import { ParanormalScheduler } from '../services/paranormalScheduler';
import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { PowerOff, ShieldCheck } from 'lucide-react';
import { ARTWORK } from '../assets/artwork';

interface AgedGlassProps {
  status: CameraStatus;
  stream: MediaStream | null;
  currentManifestation: Manifestation;
  isTransitioning: boolean;
  reducedMotion: boolean;
  onAwaken: () => void;
  onSummonNext: () => void;
  onClose: () => void;
  onToggleReducedMotion: () => void;
}

export const AgedGlass: React.FC<AgedGlassProps> = ({
  status,
  stream,
  currentManifestation,
  isTransitioning,
  reducedMotion,
  onAwaken,
  onSummonNext,
  onClose,
  onToggleReducedMotion,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const paranormalSchedulerRef = useRef<ParanormalScheduler | null>(null);

  // Offscreen canvas frame buffer for Doppelgänger temporal reflection anomaly
  const delayedBufferRef = useRef<HTMLCanvasElement[]>([]);
  const bufferIndexRef = useRef<number>(0);

  const [faceDetected, setFaceDetected] = useState(false);
  const [paranormalState, setParanormalState] = useState<ParanormalState>({
    activeEvent: null,
    intensity: 0,
    variant: 0,
    startTime: 0,
    durationMs: 0,
  });

  const isAwakened = status === 'active';
  const isInitializing =
    status === 'requesting_permission' || status === 'initializing_model';

  // Attach MediaStream to hidden video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current
        .play()
        .catch((err) => console.warn('Video playback warning:', err));
    }
  }, [stream]);

  // Initialize Paranormal Autonomous Scheduler
  useEffect(() => {
    if (status === 'active') {
      const scheduler = new ParanormalScheduler((state) => {
        setParanormalState({ ...state });
      });
      paranormalSchedulerRef.current = scheduler;
      scheduler.start();

      return () => {
        scheduler.stop();
        paranormalSchedulerRef.current = null;
      };
    }
  }, [status]);

  // Main Render and Face Tracking Loop
  useEffect(() => {
    if (status !== 'active') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    // Initialize rolling delayed canvas ring buffer (16 frames for richer temporal anomalies)
    if (delayedBufferRef.current.length === 0) {
      for (let i = 0; i < 16; i++) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 320;
        offCanvas.height = 480;
        delayedBufferRef.current.push(offCanvas);
      }
    }

    getFaceLandmarker().then((landmarker) => {
      if (isSubscribed) {
        landmarkerRef.current = landmarker;
      }
    });

    const renderLoop = (time: number) => {
      if (!isSubscribed) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (canvas && video && video.readyState >= 2) {
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // 1. Process Face Landmarker (mirrored coordinates)
          let metrics: FaceMetrics | null = null;
          if (landmarkerRef.current) {
            metrics = processVideoFrame(landmarkerRef.current, video, time);
            setFaceDetected(metrics.detected);
          }

          // 2. Draw Mirrored Live Video Feed to Canvas (Crisp & Natural)
          ctx.save();
          ctx.translate(width, 0);
          ctx.scale(-1, 1);

          const vWidth = video.videoWidth || 640;
          const vHeight = video.videoHeight || 480;
          const scale = Math.max(width / vWidth, height / vHeight);
          const drawW = vWidth * scale;
          const drawH = vHeight * scale;
          const drawX = (width - drawW) / 2;
          const drawY = (height - drawH) / 2;

          ctx.drawImage(video, drawX, drawY, drawW, drawH);
          ctx.restore();

          // 3. Update rolling delayed frame buffer for Doppelgänger
          let delayedCanvas: HTMLCanvasElement | null = null;
          if (delayedBufferRef.current.length > 0) {
            const bufLen = delayedBufferRef.current.length;
            const currentIdx = bufferIndexRef.current;
            const writeCanvas = delayedBufferRef.current[currentIdx];
            const writeCtx = writeCanvas.getContext('2d');
            if (writeCtx) {
              writeCtx.drawImage(canvas, 0, 0, width, height);
            }
            // Read from 4-6 frames in the past
            const readIdx = (currentIdx + bufLen / 2) % bufLen;
            delayedCanvas = delayedBufferRef.current[Math.floor(readIdx)];
            bufferIndexRef.current = (currentIdx + 1) % bufLen;
          }

          // 4. Render Face-Attached Supernatural Manifestation
          if (metrics) {
            renderManifestationOverlay(
              ctx,
              width,
              height,
              metrics,
              currentManifestation.id,
              paranormalState,
              time,
              reducedMotion,
              delayedCanvas
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
  }, [status, currentManifestation, isTransitioning, paranormalState, reducedMotion]);

  // Clean up FaceLandmarker on unmount
  useEffect(() => {
    return () => {
      releaseFaceLandmarker();
    };
  }, []);

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
        width={320}
        height={480}
        className={`w-full h-full object-cover transition-opacity duration-700 ${
          status === 'active' ? 'opacity-100' : 'opacity-0'
        } ${isTransitioning && !reducedMotion ? 'summoning-transition' : ''}`}
      />

      {/* ==================================================== */}
      {/* INITIAL DORMANT STATE (HIGH-RES CRACKED GLASS PATINA) */}
      {/* ==================================================== */}
      {!isAwakened && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-5 text-center z-15 overflow-hidden">
          
          {/* Layer 1: High-Resolution Cracked Mirror Overlay Texture */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src={ARTWORK.crackedOverlay}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter contrast-125 brightness-75 opacity-60"
            />
            {/* Atmospheric dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#080503]/90 via-[#030202]/85 to-[#070402]/92 mix-blend-multiply" />
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
              {/* High-Resolution Brass Cartouche Plaque Asset */}
              <img
                src={ARTWORK.brassPlaque}
                alt="AWAKEN MIRROR"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover filter contrast-125 brightness-95 group-hover:brightness-110 transition-all duration-300"
              />

              {/* Plaque Text Overlay */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="font-cinzel text-[13px] tracking-[0.24em] font-bold text-[#fcf5e6] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                  AWAKEN MIRROR
                </span>
              </div>

              {/* Shimmering Glint on Hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

              {/* Loading Spinner during permission/model init */}
              {isInitializing && (
                <div className="absolute inset-0 bg-[#120c08]/90 z-20 flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
                  <span className="font-cinzel text-[10.5px] tracking-[0.22em] uppercase font-bold text-[#e8ded0]">
                    AWAKENING...
                  </span>
                </div>
              )}
            </button>

            {/* Bottom Inscription: "YOUR REFLECTION NEVER LEAVES THE GLASS" */}
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

      {/* ==================================================== */}
      {/* ACTIVE MIRROR STATE HUD & IN-GLASS CARTOUCHE BUTTON  */}
      {/* ==================================================== */}
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
                faceDetected
                  ? 'bg-[#09140c]/90 border-[#2b4c36] text-[#a4dcb8]'
                  : 'bg-[#170e07]/90 border-[#472f1b] text-[#c9a378]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  faceDetected
                    ? 'bg-[#4ade80] shadow-[0_0_6px_#4ade80]'
                    : 'bg-[#f59e0b] animate-ping'
                }`}
              />
              <span>{faceDetected ? 'BOUND' : 'SEEKING'}</span>
            </div>
          </div>

          {/* Central Lower Cartouche Plaque Button: SUMMON ANOTHER */}
          <div className="absolute bottom-4 inset-x-4 flex flex-col items-center gap-2 z-25">
            <button
              type="button"
              disabled={isTransitioning}
              onClick={onSummonNext}
              className={`relative group w-full max-w-[220px] h-[46px] rounded-sm overflow-hidden border border-[#8c6b41] shadow-[0_6px_20px_rgba(0,0,0,0.95),0_0_12px_rgba(212,175,55,0.25)] transition-all duration-200 transform active:scale-98 hover:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37] ${
                isTransitioning ? 'opacity-75 cursor-wait' : 'cursor-pointer hover:shadow-[0_8px_25px_rgba(0,0,0,0.98),0_0_18px_rgba(212,175,55,0.4)]'
              }`}
            >
              {/* High-Resolution Brass Cartouche Plaque Asset */}
              <img
                src={ARTWORK.brassPlaque}
                alt="SUMMON ANOTHER"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover filter contrast-125 brightness-95 group-hover:brightness-110 transition-all duration-200"
              />

              {/* Plaque Text Overlay */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="font-cinzel text-[11.5px] tracking-[0.22em] font-bold text-[#fcf5e6] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                  SUMMON ANOTHER
                </span>
              </div>

              {/* Shimmering Glint */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

              {isTransitioning && (
                <div className="absolute inset-0 bg-[#140c07]/90 z-20 flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
                  <span className="font-cinzel text-[10.5px] tracking-[0.2em] uppercase font-bold text-[#e8ded0]">
                    COMMUNING...
                  </span>
                </div>
              )}
            </button>

            {/* Discreet Secondary Latch Bar (Tremor Toggle & Rest) */}
            <div className="flex items-center justify-between w-full max-w-[220px] px-1 text-[8.5px] font-cinzel tracking-wider uppercase">
              <button
                type="button"
                onClick={onToggleReducedMotion}
                title="Toggle stabilized spectral motion"
                className="text-[#877562] hover:text-[#c4b3a0] flex items-center gap-1 transition-colors focus:outline-none"
              >
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>{reducedMotion ? 'STABILIZED' : 'TREMOR'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                title="Close the mirror"
                className="text-[#965e5e] hover:text-[#d68585] flex items-center gap-1 transition-colors focus:outline-none"
              >
                <PowerOff className="w-2.5 h-2.5" />
                <span>REST MIRROR</span>
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
