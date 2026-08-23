import React, { useEffect, useRef, useState } from 'react';
import { CameraStatus, FaceMetrics, Manifestation, ManifestationId, ParanormalState } from '../types';
import { getFaceLandmarker, processVideoFrame, releaseFaceLandmarker } from '../services/faceTracker';
import { renderManifestationOverlay } from '../rendering/manifestationRenderers';
import { ParanormalScheduler } from '../services/paranormalScheduler';
import { FaceLandmarker } from '@mediapipe/tasks-vision';

interface AgedGlassProps {
  status: CameraStatus;
  stream: MediaStream | null;
  currentManifestation: Manifestation;
  isTransitioning: boolean;
  reducedMotion: boolean;
}

export const AgedGlass: React.FC<AgedGlassProps> = ({
  status,
  stream,
  currentManifestation,
  isTransitioning,
  reducedMotion,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const paranormalSchedulerRef = useRef<ParanormalScheduler | null>(null);

  const [faceDetected, setFaceDetected] = useState(false);
  const [paranormalState, setParanormalState] = useState<ParanormalState>({
    activeEvent: null,
    intensity: 0,
    variant: 0,
    startTime: 0,
    durationMs: 0,
  });

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

    // Load Face Landmarker lazily on camera active
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

          // 2. Draw Mirrored Live Video Feed to Canvas
          ctx.save();
          // Horizontal flip for true mirror reflection
          ctx.translate(width, 0);
          ctx.scale(-1, 1);

          // Video aspect ratio cover calculation
          const vWidth = video.videoWidth || 640;
          const vHeight = video.videoHeight || 480;
          const scale = Math.max(width / vWidth, height / vHeight);
          const drawW = vWidth * scale;
          const drawH = vHeight * scale;
          const drawX = (width - drawW) / 2;
          const drawY = (height - drawH) / 2;

          ctx.drawImage(video, drawX, drawY, drawW, drawH);
          ctx.restore();

          // 3. Aged Glass Color & Chemical Toning Filter
          ctx.save();
          // Slight antique cold desaturation & vintage silver tint
          ctx.fillStyle = 'rgba(12, 18, 15, 0.18)';
          ctx.fillRect(0, 0, width, height);

          // Subtle antique greenish-amber cast in the highlights
          const tintGrad = ctx.createLinearGradient(0, 0, 0, height);
          tintGrad.addColorStop(0, 'rgba(18, 22, 16, 0.08)');
          tintGrad.addColorStop(1, 'rgba(10, 14, 18, 0.16)');
          ctx.fillStyle = tintGrad;
          ctx.fillRect(0, 0, width, height);

          // Deep edge vignette around the mirror boundary
          const vigGrad = ctx.createRadialGradient(
            width * 0.5,
            height * 0.48,
            width * 0.35,
            width * 0.5,
            height * 0.48,
            width * 0.75
          );
          vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vigGrad.addColorStop(0.65, 'rgba(5, 7, 6, 0.45)');
          vigGrad.addColorStop(1, 'rgba(2, 3, 2, 0.92)');
          ctx.fillStyle = vigGrad;
          ctx.fillRect(0, 0, width, height);

          ctx.restore();

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
              reducedMotion
            );
          }

          // 5. Summoning Ritual Transition Distortion
          if (isTransitioning) {
            renderSummoningDistortion(ctx, width, height, time, reducedMotion);
          }

          // 6. Aged Glass Surface Grime, Micro-Scratches & Hairline Fractures
          renderGlassScratches(ctx, width, height);
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

  // Clean up FaceLandmarker when component unmounts
  useEffect(() => {
    return () => {
      releaseFaceLandmarker();
    };
  }, []);

  return (
    <div className="relative w-full aspect-[9/13] max-h-[440px] bg-[#050504] overflow-hidden select-none flex items-center justify-center">
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
        height={460}
        className={`w-full h-full object-cover transition-opacity duration-700 ${
          status === 'active' ? 'opacity-100' : 'opacity-0'
        } ${isTransitioning && !reducedMotion ? 'summoning-transition' : ''}`}
      />

      {/* UN-AWAKENED INITIAL STATE OVERLAY */}
      {status !== 'active' && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#090706] via-[#050403] to-[#0a0807] text-center z-10">
          {/* Subtle occult background rune watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <svg
              viewBox="0 0 200 200"
              className="w-48 h-48 text-[#c4af85] animate-ethereal"
            >
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 6"
              />
              <polygon
                points="100,25 165,138 35,138"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
              <polygon
                points="100,175 35,62 165,62"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
              <circle
                cx="100"
                cy="100"
                r="35"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.75"
              />
            </svg>
          </div>

          {/* Top Title Bar */}
          <div className="flex flex-col items-center gap-1 mt-3">
            <span className="text-[10px] font-cinzel tracking-[0.3em] uppercase text-[#73634e]">
              ARTIFACT NO. 1894
            </span>
            <h2 className="text-xl font-cinzel-dec font-extrabold text-[#e2d5be] tracking-[0.18em] uppercase engraved-text">
              MIRROR MASK
            </h2>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#8a6e4b] to-transparent my-1" />
          </div>

          {/* Central Atmospheric Message */}
          <div className="flex flex-col items-center gap-2 my-auto max-w-[220px]">
            <div className="text-[14px] font-cinzel text-[#d9ccb2] tracking-[0.16em] uppercase font-bold engraved-text">
              THE GLASS IS WAITING
            </div>
            <p className="text-[12px] font-spectral italic text-[#8c7a65] leading-snug">
              Look into the antique silvering to awaken the entities dormant within your reflection.
            </p>
          </div>

          {/* Bottom subtle instruction */}
          <div className="text-[10px] font-cinzel text-[#5a4c3c] tracking-[0.14em] uppercase">
            COMMUNION OCCURS LOCALLY IN BROWSER
          </div>
        </div>
      )}

      {/* ACTIVE MIRROR ATMOSPHERIC HUD */}
      {status === 'active' && (
        <div className="absolute top-2.5 inset-x-3 flex items-center justify-between pointer-events-none z-15">
          {/* Manifestation Name Plate */}
          <div className="px-2.5 py-1 rounded bg-[#0a0806]/80 border border-[#3b2d20]/80 shadow-md backdrop-blur-xs flex flex-col">
            <span className="text-[8px] font-cinzel tracking-[0.2em] uppercase text-[#8a7760]">
              {currentManifestation.latinName}
            </span>
            <span className="text-[11px] font-cinzel-dec font-bold text-[#e6d8be] tracking-[0.14em] uppercase engraved-text">
              {currentManifestation.name}
            </span>
          </div>

          {/* Face Detection Status Indicator */}
          <div
            className={`px-2 py-0.5 rounded text-[9px] font-cinzel tracking-wider uppercase border flex items-center gap-1.5 transition-colors duration-300 ${
              faceDetected
                ? 'bg-[#0f1712]/80 border-[#2a4d3b] text-[#93c7a8]'
                : 'bg-[#1a120c]/80 border-[#4a3520] text-[#a88d6c]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                faceDetected
                  ? 'bg-[#4ade80] shadow-[0_0_5px_#4ade80]'
                  : 'bg-[#eab308] animate-ping'
              }`}
            />
            <span>{faceDetected ? 'BOUND' : 'SEEKING'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Procedural Glass Hairline Scratches & Cracks
function renderGlassScratches(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 0.75;
  ctx.beginPath();

  // Scratch 1 (top right corner)
  ctx.moveTo(width * 0.85, height * 0.05);
  ctx.lineTo(width * 0.78, height * 0.14);
  ctx.lineTo(width * 0.81, height * 0.22);

  // Scratch 2 (bottom left corner)
  ctx.moveTo(width * 0.08, height * 0.88);
  ctx.lineTo(width * 0.18, height * 0.82);

  // Corner hairline fracture
  ctx.moveTo(width * 0.95, height * 0.9);
  ctx.lineTo(width * 0.88, height * 0.94);

  ctx.stroke();

  // Edge grime & specks
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(0, 0, width, 4);
  ctx.fillRect(0, height - 4, width, 4);
  ctx.fillRect(0, 0, 4, height);
  ctx.fillRect(width - 4, 0, 4, height);

  ctx.restore();
}

// Summoning transition glitch & distortion burst
function renderSummoningDistortion(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  reducedMotion: boolean
) {
  if (reducedMotion) return;

  ctx.save();
  // Spectral burst flash
  const flashAlpha = 0.25 + 0.2 * Math.sin(timeMs * 0.02);
  ctx.fillStyle = `rgba(212, 175, 55, ${flashAlpha * 0.4})`;
  ctx.fillRect(0, 0, width, height);

  // Scanline distortion bars
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  for (let i = 0; i < height; i += 8) {
    if (Math.sin(i + timeMs * 0.01) > 0.5) {
      ctx.fillRect(0, i, width, 3);
    }
  }
  ctx.restore();
}
