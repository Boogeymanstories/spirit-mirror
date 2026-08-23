import { FaceMetrics, ManifestationId, ParanormalState, Point2D } from '../types';
import { ARTWORK, getLoadedImage } from '../assets/artwork';

interface HistoricalFrame {
  center: Point2D;
  scale: number;
  rotationZ: number;
  rotationY: number;
  rotationX: number;
  leftEye: Point2D;
  rightEye: Point2D;
  mouthCenter: Point2D;
  faceWidth: number;
  faceHeight: number;
  timestamp: number;
}

const lagHistory: HistoricalFrame[] = [];
const MAX_HISTORY_LEN = 60;

export function renderManifestationOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  manifestationId: ManifestationId,
  paranormal: ParanormalState,
  timeMs: number,
  reducedMotion: boolean,
  delayedCanvas?: HTMLCanvasElement | null
) {
  if (!metrics.detected) {
    if (manifestationId === 'passenger') {
      renderAmbientPassenger(ctx, width, height, timeMs, reducedMotion);
    }
    return;
  }

  // Update history buffer for temporal effects
  lagHistory.unshift({
    center: { ...metrics.center },
    scale: metrics.scale,
    rotationZ: metrics.rotationZ,
    rotationY: metrics.rotationY,
    rotationX: metrics.rotationX,
    leftEye: { ...metrics.leftEye },
    rightEye: { ...metrics.rightEye },
    mouthCenter: { ...metrics.mouthCenter },
    faceWidth: metrics.faceWidth,
    faceHeight: metrics.faceHeight,
    timestamp: timeMs,
  });
  if (lagHistory.length > MAX_HISTORY_LEN) {
    lagHistory.pop();
  }

  ctx.save();

  switch (manifestationId) {
    case 'hollow':
      renderTheHollow(ctx, width, height, metrics, timeMs, reducedMotion);
      break;
    case 'veiled_one':
      renderTheVeiledOne(ctx, width, height, metrics, timeMs, reducedMotion);
      break;
    case 'grinning_guest':
      renderTheGrinningGuest(ctx, width, height, metrics, timeMs, reducedMotion);
      break;
    case 'doppelganger':
      renderTheDoppelganger(ctx, width, height, metrics, timeMs, reducedMotion, delayedCanvas);
      break;
    case 'passenger':
      renderThePassenger(ctx, width, height, metrics, timeMs, reducedMotion);
      break;
  }

  // Autonomous rare paranormal events if active
  if (paranormal.activeEvent) {
    renderParanormalEffect(ctx, width, height, metrics, paranormal, timeMs, reducedMotion, delayedCanvas);
  }

  ctx.restore();
}

// ----------------------------------------------------------------------
// 1. THE HOLLOW (Umbra Vacua) - Cursed Sunken Relic Transformation
// ----------------------------------------------------------------------
function renderTheHollow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  timeMs: number,
  reducedMotion: boolean
) {
  const cx = metrics.center.x * width;
  const cy = metrics.center.y * height;
  const lx = metrics.leftEye.x * width;
  const ly = metrics.leftEye.y * height;
  const rx = metrics.rightEye.x * width;
  const ry = metrics.rightEye.y * height;
  const fw = Math.max(metrics.faceWidth * width, 70);
  const fh = Math.max(metrics.faceHeight * height, 90);

  ctx.save();

  // Cold mortuary tint that preserves the live face rather than replacing it.
  const ashenGrad = ctx.createRadialGradient(cx, cy, fw * 0.12, cx, cy, fw * 0.9);
  ashenGrad.addColorStop(0, 'rgba(22, 30, 29, 0.34)');
  ashenGrad.addColorStop(0.58, 'rgba(12, 18, 17, 0.26)');
  ashenGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ashenGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, fw * 0.8, fh * 0.9, metrics.rotationZ, 0, Math.PI * 2);
  ctx.fill();

  // Cursed stone texture is now a secondary material treatment, not a full opaque mask.
  const maskImg = getLoadedImage(ARTWORK.cursedStoneMask);
  if (maskImg) {
    ctx.save();
    ctx.translate(cx, cy - fh * 0.015);
    ctx.rotate(metrics.rotationZ);
    const maskW = fw * 1.72;
    const maskH = (maskW * maskImg.naturalHeight) / maskImg.naturalWidth;
    ctx.beginPath();
    ctx.ellipse(0, 0, fw * 0.73, fh * 0.84, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.44;
    ctx.drawImage(maskImg, -maskW / 2, -maskH * 0.47, maskW, maskH);
    ctx.restore();
  }

  // Deep eye sockets are the defining feature. Keep them soft-edged and face-bound.
  const socketRadius = Math.max(fw * 0.205, 15);
  const drawSocket = (ex: number, ey: number, seed: number) => {
    const socketGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, socketRadius);
    socketGrad.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
    socketGrad.addColorStop(0.48, 'rgba(1, 3, 4, 0.9)');
    socketGrad.addColorStop(0.78, 'rgba(8, 11, 11, 0.46)');
    socketGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = socketGrad;
    ctx.beginPath();
    ctx.ellipse(ex, ey, socketRadius * 1.18, socketRadius * 0.93, metrics.rotationZ, 0, Math.PI * 2);
    ctx.fill();

    const pulse = reducedMotion ? 0.72 : 0.58 + 0.16 * Math.sin(timeMs * 0.0026 + seed);
    ctx.fillStyle = `rgba(218, 180, 74, ${pulse})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 245, 205, ${pulse * 0.72})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 1.1, 0, Math.PI * 2);
    ctx.fill();
  };
  drawSocket(lx, ly, 0.2);
  drawSocket(rx, ry, 1.1);

  // Subtle hollowing under cheeks gives depth without turning into painted face art.
  const drawCheekHollow = (x: number, y: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, fw * 0.28);
    g.addColorStop(0, 'rgba(2, 4, 4, 0.48)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, fw * 0.3, fh * 0.2, metrics.rotationZ, 0, Math.PI * 2);
    ctx.fill();
  };
  drawCheekHollow(metrics.leftCheek.x * width, metrics.leftCheek.y * height);
  drawCheekHollow(metrics.rightCheek.x * width, metrics.rightCheek.y * height);

  // A few gilded fissures tie the face back to the artifact without drawing a vector mask.
  const fx = metrics.forehead.x * width;
  const fy = metrics.forehead.y * height;
  ctx.strokeStyle = 'rgba(190, 151, 65, 0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(fx, fy + 2);
  ctx.lineTo(fx + fw * 0.035, fy + fh * 0.1);
  ctx.lineTo(fx - fw * 0.025, fy + fh * 0.18);
  ctx.stroke();

  ctx.restore();
}

// ----------------------------------------------------------------------
// 2. THE VEILED ONE (Mors Velata) - Ghostly Mourning Spirit Apparition
// ----------------------------------------------------------------------
function renderTheVeiledOne(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  timeMs: number,
  reducedMotion: boolean
) {
  const cx = metrics.center.x * width;
  const cy = metrics.center.y * height;
  const lx = metrics.leftEye.x * width;
  const ly = metrics.leftEye.y * height;
  const rx = metrics.rightEye.x * width;
  const ry = metrics.rightEye.y * height;
  const fw = Math.max(metrics.faceWidth * width, 70);
  const fh = Math.max(metrics.faceHeight * height, 90);

  ctx.save();

  // Pale spectral wash: the visitor remains recognizably themselves.
  const paleGlow = ctx.createRadialGradient(cx, cy, fw * 0.08, cx, cy, fw * 0.9);
  paleGlow.addColorStop(0, 'rgba(205, 220, 219, 0.2)');
  paleGlow.addColorStop(0.6, 'rgba(135, 159, 162, 0.11)');
  paleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = paleGlow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, fw * 0.8, fh * 0.9, metrics.rotationZ, 0, Math.PI * 2);
  ctx.fill();

  // Veil-only artwork replaces the previous second-face overlay. It should surround the face,
  // not substitute another person's face over the visitor.
  const veilImg = getLoadedImage(ARTWORK.mourningVeil);
  if (veilImg) {
    const driftY = reducedMotion ? 0 : Math.sin(timeMs * 0.00135) * 2.2;
    const driftX = reducedMotion ? 0 : Math.sin(timeMs * 0.0009 + 0.7) * 1.5;
    const yawParallax = -metrics.rotationY * fw * 0.05;
    const veilW = fw * 2.35;
    const veilH = (veilW * veilImg.naturalHeight) / veilImg.naturalWidth;

    // Dark fabric body.
    ctx.save();
    ctx.translate(cx + driftX + yawParallax, cy - fh * 0.18 + driftY);
    ctx.rotate(metrics.rotationZ * 0.8);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.22;
    ctx.drawImage(veilImg, -veilW / 2, -veilH * 0.31, veilW, veilH);
    ctx.restore();

    // Lace and edge highlights.
    ctx.save();
    ctx.translate(cx + driftX + yawParallax, cy - fh * 0.18 + driftY);
    ctx.rotate(metrics.rotationZ * 0.8);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.44;
    ctx.drawImage(veilImg, -veilW / 2, -veilH * 0.31, veilW, veilH);
    ctx.restore();
  }

  // Dead-white irises with smoky sockets; intentionally symmetric and tied to tracked eyes.
  const drawMourningEye = (ex: number, ey: number, phase: number) => {
    const socket = ctx.createRadialGradient(ex, ey, 0, ex, ey, fw * 0.17);
    socket.addColorStop(0, 'rgba(4, 5, 7, 0.7)');
    socket.addColorStop(0.68, 'rgba(8, 12, 15, 0.28)');
    socket.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = socket;
    ctx.beginPath();
    ctx.ellipse(ex, ey, fw * 0.17, fw * 0.13, metrics.rotationZ, 0, Math.PI * 2);
    ctx.fill();

    const glow = reducedMotion ? 0.72 : 0.62 + 0.12 * Math.sin(timeMs * 0.0018 + phase);
    ctx.fillStyle = `rgba(225, 235, 231, ${glow})`;
    ctx.beginPath();
    ctx.ellipse(ex, ey, fw * 0.052, fw * 0.036, metrics.rotationZ, 0, Math.PI * 2);
    ctx.fill();

    const tear = ctx.createLinearGradient(ex, ey + 2, ex, ey + fh * 0.25);
    tear.addColorStop(0, `rgba(50, 61, 64, ${glow * 0.55})`);
    tear.addColorStop(1, 'rgba(30, 36, 38, 0)');
    ctx.strokeStyle = tear;
    ctx.lineWidth = Math.max(1, fw * 0.008);
    ctx.beginPath();
    ctx.moveTo(ex, ey + 4);
    ctx.bezierCurveTo(ex - 1, ey + fh * 0.08, ex + 2, ey + fh * 0.15, ex, ey + fh * 0.23);
    ctx.stroke();
  };
  drawMourningEye(lx, ly, 0.2);
  drawMourningEye(rx, ry, 1.1);

  // A shadow under the jaw makes the veil feel like it wraps around the head.
  const jawY = metrics.chin.y * height;
  const shroud = ctx.createRadialGradient(cx, jawY, fw * 0.15, cx, jawY + fh * 0.18, fw * 0.9);
  shroud.addColorStop(0, 'rgba(22, 28, 30, 0.12)');
  shroud.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shroud;
  ctx.fillRect(0, jawY - fh * 0.1, width, height - jawY + fh * 0.1);

  ctx.restore();
}

// ----------------------------------------------------------------------
// 3. THE GRINNING GUEST (Hospes Ridens) - Integrated Porcelain Demon Grin
// ----------------------------------------------------------------------
function renderTheGrinningGuest(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  timeMs: number,
  reducedMotion: boolean
) {
  const lx = metrics.leftEye.x * width;
  const ly = metrics.leftEye.y * height;
  const rx = metrics.rightEye.x * width;
  const ry = metrics.rightEye.y * height;
  const mx = metrics.mouthCenter.x * width;
  const my = metrics.mouthCenter.y * height;
  const fw = Math.max(metrics.faceWidth * width, 70);
  const fh = Math.max(metrics.faceHeight * height, 90);

  ctx.save();

  // Mouth-only production artwork replaces the previous full-face porcelain sticker.
  const mouthImg = getLoadedImage(ARTWORK.grinningMouth);
  if (mouthImg) {
    ctx.save();
    ctx.translate(mx, my + fh * 0.025);
    ctx.rotate(metrics.rotationZ);
    const mouthW = fw * 1.05;
    const mouthH = (mouthW * mouthImg.naturalHeight) / mouthImg.naturalWidth;

    // Dark cavity anchors the impossible smile to the real mouth.
    const cavity = ctx.createRadialGradient(0, 0, fw * 0.04, 0, 0, fw * 0.55);
    cavity.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
    cavity.addColorStop(0.64, 'rgba(8, 1, 2, 0.44)');
    cavity.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cavity;
    ctx.beginPath();
    ctx.ellipse(0, 0, fw * 0.55, fh * 0.21, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.78;
    ctx.drawImage(mouthImg, -mouthW / 2, -mouthH / 2, mouthW, mouthH);
    ctx.restore();
  }

  // Eye sockets stay recognizable but become subtly too dark and intent.
  const drawManicEye = (ex: number, ey: number, phase: number) => {
    const socketGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, fw * 0.135);
    socketGrad.addColorStop(0, 'rgba(5, 2, 4, 0.7)');
    socketGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = socketGrad;
    ctx.beginPath();
    ctx.ellipse(ex, ey, fw * 0.15, fw * 0.115, metrics.rotationZ, 0, Math.PI * 2);
    ctx.fill();

    const gleam = reducedMotion ? 0.8 : 0.66 + 0.14 * Math.sin(timeMs * 0.0035 + phase);
    ctx.fillStyle = `rgba(238, 231, 215, ${gleam})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
    ctx.fill();
  };
  drawManicEye(lx, ly, 0.3);
  drawManicEye(rx, ry, 1.4);

  ctx.restore();
}

// ----------------------------------------------------------------------
// 4. THE DOPPELGÄNGER (Duplex Umbra) - Pure Temporal Reflection Anomaly
// ----------------------------------------------------------------------
function renderTheDoppelganger(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  timeMs: number,
  reducedMotion: boolean,
  delayedCanvas?: HTMLCanvasElement | null
) {
  const lagCycle = reducedMotion ? 0 : Math.sin(timeMs * 0.00105);
  const lagDepth = reducedMotion ? 3 : Math.floor(6 + 8 * Math.max(0, lagCycle));
  const delayedIndex = Math.min(lagHistory.length - 1, lagDepth);
  const delayedFrame = lagHistory[delayedIndex] || metrics;

  const fw = Math.max(metrics.faceWidth * width, 65);
  const fh = Math.max(metrics.faceHeight * height, 85);
  const cx = metrics.center.x * width;
  const cy = metrics.center.y * height;
  const dcx = delayedFrame.center.x * width;
  const dcy = delayedFrame.center.y * height;

  const motionDx = dcx - cx;
  const motionDy = dcy - cy;
  const hesitation = reducedMotion ? 0 : Math.max(0, Math.sin(timeMs * 0.00072 - 0.8));
  const baseOffset = reducedMotion ? 1 : 2.5 + hesitation * 4.5;
  const ghostX = Math.max(-10, Math.min(10, motionDx * 0.55 + baseOffset));
  const ghostY = Math.max(-7, Math.min(7, motionDy * 0.45 - hesitation * 1.5));

  ctx.save();

  if (delayedCanvas && delayedCanvas.width > 0) {
    // Restrict the anomaly to the head and upper shoulders so the room doesn't double.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(dcx, dcy + fh * 0.16, fw * 1.05, fh * 1.18, delayedFrame.rotationZ, 0, Math.PI * 2);
    ctx.clip();

    // The actual delayed reflection: visible enough to read as another version of the user.
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = reducedMotion ? 0.16 : 0.22 + hesitation * 0.12;
    ctx.translate(ghostX, ghostY);
    ctx.drawImage(delayedCanvas, 0, 0, width, height);
    ctx.restore();

    // Two restrained chromatic echoes, deliberately much weaker than the delayed face.
    if (!reducedMotion) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.08 + hesitation * 0.05;
      ctx.translate(ghostX + 2.5, ghostY);
      ctx.drawImage(delayedCanvas, 0, 0, width, height);
      ctx.fillStyle = 'rgba(58, 190, 205, 0.16)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.07 + hesitation * 0.04;
      ctx.translate(ghostX - 2.5, ghostY + 0.5);
      ctx.drawImage(delayedCanvas, 0, 0, width, height);
      ctx.fillStyle = 'rgba(170, 54, 64, 0.14)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Face-only horizontal displacement slices make the reflection feel briefly unsynchronized.
    if (!reducedMotion && hesitation > 0.45) {
      const sliceCenterY = dcy - fh * 0.05;
      const sliceH = Math.max(3, fh * 0.065);
      for (let i = -1; i <= 1; i++) {
        const sy = sliceCenterY + i * fh * 0.18;
        const shift = (i % 2 === 0 ? 1 : -1) * (2 + hesitation * 3);
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        ctx.rect(dcx - fw * 0.72, sy - sliceH / 2, fw * 1.44, sliceH);
        ctx.clip();
        ctx.translate(shift, 0);
        ctx.drawImage(delayedCanvas, 0, 0, width, height);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // A very faint second outline remains even during stillness so the state never looks "off".
  const outlineAlpha = reducedMotion ? 0.12 : 0.08 + 0.06 * (0.5 + 0.5 * Math.sin(timeMs * 0.0014));
  ctx.strokeStyle = `rgba(170, 205, 206, ${outlineAlpha})`;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(dcx + ghostX * 0.45, dcy + ghostY * 0.45, fw * 0.72, fh * 0.86, delayedFrame.rotationZ, 0, Math.PI * 2);
  ctx.stroke();

  // Delayed eye glints are intentionally tiny and dim—no cartoon black-eye treatment.
  if (!reducedMotion && hesitation > 0.3) {
    const eyeAlpha = 0.12 + hesitation * 0.13;
    ctx.fillStyle = `rgba(210, 226, 220, ${eyeAlpha})`;
    ctx.beginPath();
    ctx.arc(delayedFrame.leftEye.x * width + ghostX, delayedFrame.leftEye.y * height + ghostY, 1.1, 0, Math.PI * 2);
    ctx.arc(delayedFrame.rightEye.x * width + ghostX, delayedFrame.rightEye.y * height + ghostY, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ----------------------------------------------------------------------
// 5. THE PASSENGER (Spectrum Post Tergum) - Lurking Deep Mirror Wraith
// ----------------------------------------------------------------------
function renderThePassenger(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  timeMs: number,
  reducedMotion: boolean
) {
  const fw = Math.max(metrics.faceWidth * width, 70);
  const fh = Math.max(metrics.faceHeight * height, 90);
  const faceX = metrics.center.x * width;
  const faceY = metrics.center.y * height;

  // Put the figure on the side with more empty mirror space.
  const side = metrics.center.x > 0.5 ? -1 : 1;
  const parallax = -metrics.rotationY * width * 0.035;
  const px = Math.max(width * 0.16, Math.min(width * 0.84, faceX + side * width * 0.31 + parallax));
  const py = faceY - fh * 0.17;
  const swayX = reducedMotion ? 0 : Math.sin(timeMs * 0.00085) * 2.2;
  const swayY = reducedMotion ? 0 : Math.cos(timeMs * 0.00072) * 1.6;
  const breath = reducedMotion ? 0.44 : 0.34 + 0.1 * (0.5 + 0.5 * Math.sin(timeMs * 0.0012));

  ctx.save();

  // Exclude the visitor's central face from the apparition layer. This simulates occlusion and
  // makes the Passenger read as "behind" the person even without full person segmentation.
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.ellipse(faceX, faceY + fh * 0.04, fw * 0.72, fh * 0.82, metrics.rotationZ, 0, Math.PI * 2);
  ctx.clip('evenodd');

  const shadowImg = getLoadedImage(ARTWORK.shadowPassenger);
  if (shadowImg) {
    ctx.save();
    ctx.translate(px + swayX, py + swayY);
    const entityW = width * 0.48;
    const entityH = (entityW * shadowImg.naturalHeight) / shadowImg.naturalWidth;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = breath;
    ctx.drawImage(shadowImg, -entityW / 2, -entityH * 0.28, entityW, entityH);
    ctx.restore();
  }

  // A dim cold halo in the mirror depth keeps the figure legible in dark rooms.
  const halo = ctx.createRadialGradient(px, py, 0, px, py, width * 0.2);
  halo.addColorStop(0, `rgba(122, 151, 142, ${breath * 0.16})`);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(px, py + height * 0.04, width * 0.18, height * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // Restrained eye points, positioned on the figure rather than on the user's face.
  const eyeAlpha = reducedMotion ? 0.48 : 0.34 + 0.16 * (0.5 + 0.5 * Math.sin(timeMs * 0.0017 + 0.6));
  const eyeY = py - height * 0.018;
  const spread = width * 0.018;
  ctx.fillStyle = `rgba(207, 227, 214, ${eyeAlpha})`;
  ctx.beginPath();
  ctx.arc(px - spread, eyeY, 1.45, 0, Math.PI * 2);
  ctx.arc(px + spread, eyeY, 1.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Wispy fog may cross the face slightly; keep it extremely subtle so it feels like mirror depth.
  const fog = ctx.createRadialGradient(px, py + fh * 0.25, 4, px, py + fh * 0.25, width * 0.34);
  fog.addColorStop(0, `rgba(125, 145, 137, ${breath * 0.055})`);
  fog.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, width, height);
}

function renderAmbientPassenger(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  reducedMotion: boolean
) {
  const alpha = reducedMotion ? 0.45 : 0.3 + 0.18 * Math.sin(timeMs * 0.001);
  ctx.fillStyle = `rgba(2, 4, 5, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(width * 0.8, height * 0.35, width * 0.32, height * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ----------------------------------------------------------------------
// AGED GLASS OVERLAY - Subtle Edge Patina & Clear Center Reflection
// ----------------------------------------------------------------------
export function renderAgedGlassOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  reducedMotion: boolean
) {
  ctx.save();

  // 1. Production Cracked Mirror Patina Asset (Restrained so center remains crystal clear)
  const crackedImg = getLoadedImage(ARTWORK.crackedOverlay);
  if (crackedImg) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.09;
    ctx.drawImage(crackedImg, 0, 0, width, height);
    ctx.restore();
  }

  // 2. Very subtle cold antique toning; keep the live face natural and readable.
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(44, 62, 55, 0.07)';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 3. Deep Edge Vignette - Frames the mirror naturally without washing out the center
  const vigGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.46,
    width * 0.36,
    width * 0.5,
    height * 0.46,
    width * 0.78
  );
  vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vigGrad.addColorStop(0.68, 'rgba(3, 4, 3, 0.2)');
  vigGrad.addColorStop(0.88, 'rgba(2, 3, 2, 0.58)');
  vigGrad.addColorStop(1, 'rgba(1, 2, 1, 0.92)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, width, height);

  // 4. Subtle Antique Mirror Bevel Rim
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, width, height);

  ctx.restore();
}

// ----------------------------------------------------------------------
// PARANORMAL AUTONOMOUS EVENTS
// ----------------------------------------------------------------------
function renderParanormalEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  paranormal: ParanormalState,
  timeMs: number,
  reducedMotion: boolean,
  delayedCanvas?: HTMLCanvasElement | null
) {
  const progress = Math.min((timeMs - paranormal.startTime) / paranormal.durationMs, 1.0);
  const envelope = Math.sin(progress * Math.PI);

  switch (paranormal.activeEvent) {
    case 'peripheral_face': {
      // Use actual apparition artwork rather than procedural circles. Only a sliver is shown,
      // so the visitor is never certain whether they really saw something at the edge.
      const ghost = getLoadedImage(ARTWORK.shadowPassenger);
      if (ghost) {
        const onLeft = paranormal.variant > 0.5;
        const gx = onLeft ? width * 0.035 : width * 0.965;
        const gy = height * (0.28 + paranormal.variant * 0.28);
        const ghostW = width * 0.34;
        const ghostH = (ghostW * ghost.naturalHeight) / ghost.naturalWidth;
        ctx.save();
        ctx.beginPath();
        if (onLeft) {
          ctx.rect(0, 0, width * 0.22, height);
        } else {
          ctx.rect(width * 0.78, 0, width * 0.22, height);
        }
        ctx.clip();
        ctx.globalAlpha = envelope * 0.3;
        ctx.drawImage(ghost, gx - ghostW / 2, gy - ghostH * 0.28, ghostW, ghostH);
        ctx.restore();
      }
      break;
    }

    case 'black_frame': {
      const darkAlpha = envelope * 0.94;
      ctx.fillStyle = `rgba(0, 0, 0, ${darkAlpha})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'wrong_eyes': {
      if (metrics.detected) {
        const alpha = envelope * 0.72;
        const drawWrongEye = (ex: number, ey: number, drift: number) => {
          const shadow = ctx.createRadialGradient(ex, ey, 0, ex, ey, 14);
          shadow.addColorStop(0, `rgba(0, 0, 0, ${alpha * 0.9})`);
          shadow.addColorStop(0.7, `rgba(4, 7, 7, ${alpha * 0.42})`);
          shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = shadow;
          ctx.beginPath();
          ctx.ellipse(ex, ey, 14, 10, metrics.rotationZ, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(218, 232, 224, ${alpha * 0.75})`;
          ctx.beginPath();
          ctx.arc(ex + drift, ey - 0.5, 1.35, 0, Math.PI * 2);
          ctx.fill();
        };
        const drift = (paranormal.variant - 0.5) * 5;
        drawWrongEye(metrics.leftEye.x * width, metrics.leftEye.y * height, drift);
        drawWrongEye(metrics.rightEye.x * width, metrics.rightEye.y * height, drift);
      }
      break;
    }

    case 'glass_pulse': {
      const cracked = getLoadedImage(ARTWORK.crackedOverlay);
      if (cracked) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = envelope * 0.2;
        ctx.drawImage(cracked, 0, 0, width, height);
        ctx.restore();
      }
      break;
    }

    case 'reflection_lag': {
      if (delayedCanvas && metrics.detected) {
        const cx = metrics.center.x * width;
        const cy = metrics.center.y * height;
        const fw = Math.max(metrics.faceWidth * width, 65);
        const fh = Math.max(metrics.faceHeight * height, 85);
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy + fh * 0.12, fw * 0.95, fh * 1.1, metrics.rotationZ, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = envelope * 0.2;
        ctx.translate((paranormal.variant - 0.5) * 7, 0);
        ctx.drawImage(delayedCanvas, 0, 0, width, height);
        ctx.restore();
      }
      break;
    }
  }
}
