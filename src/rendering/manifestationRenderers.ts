import { FaceMetrics, ManifestationId, ParanormalState, Point2D } from '../types';

// History buffer for Doppelgänger lag effect
interface HistoricalFrame {
  center: Point2D;
  scale: number;
  rotationZ: number;
  rotationY: number;
  leftEye: Point2D;
  rightEye: Point2D;
  mouthCenter: Point2D;
  faceWidth: number;
  faceHeight: number;
  timestamp: number;
}

const lagHistory: HistoricalFrame[] = [];
const MAX_HISTORY_LEN = 30;

export function renderManifestationOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  manifestationId: ManifestationId,
  paranormal: ParanormalState,
  timeMs: number,
  reducedMotion: boolean
) {
  if (!metrics.detected) {
    // Fade out or show ambient mirror presence if not detected
    if (manifestationId === 'passenger') {
      renderAmbientPassenger(ctx, width, height, timeMs, reducedMotion);
    }
    return;
  }

  // Update history buffer for Doppelgänger
  lagHistory.unshift({
    center: { ...metrics.center },
    scale: metrics.scale,
    rotationZ: metrics.rotationZ,
    rotationY: metrics.rotationY,
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
      renderTheDoppelganger(ctx, width, height, metrics, timeMs, reducedMotion);
      break;
    case 'passenger':
      renderThePassenger(ctx, width, height, metrics, timeMs, reducedMotion);
      break;
  }

  // Render autonomous paranormal effects if active
  if (paranormal.activeEvent) {
    renderParanormalEffect(ctx, width, height, metrics, paranormal, timeMs, reducedMotion);
  }

  ctx.restore();
}

// ----------------------------------------------------
// 1. THE HOLLOW (Umbra Vacua)
// ----------------------------------------------------
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
  const fw = Math.max(metrics.faceWidth * width, 50);
  const fh = Math.max(metrics.faceHeight * height, 70);

  // 1. Ashen facial desaturation vignette
  const faceGrad = ctx.createRadialGradient(cx, cy, fw * 0.1, cx, cy, fw * 0.9);
  faceGrad.addColorStop(0, 'rgba(15, 20, 18, 0.45)');
  faceGrad.addColorStop(0.6, 'rgba(25, 30, 28, 0.35)');
  faceGrad.addColorStop(1, 'rgba(10, 12, 10, 0)');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, fw * 0.85, fh * 0.95, metrics.rotationZ, 0, Math.PI * 2);
  ctx.fill();

  // 2. Sunken Cheekbone Hollow Shadows
  const rotCos = Math.cos(metrics.rotationZ);
  const rotSin = Math.sin(metrics.rotationZ);
  const cheekOffset = fw * 0.42;
  const cheekYOffset = fh * 0.15;

  ctx.fillStyle = 'rgba(8, 10, 8, 0.6)';
  // Left cheek hollow
  ctx.beginPath();
  ctx.ellipse(
    cx - cheekOffset * rotCos + cheekYOffset * rotSin,
    cy - cheekOffset * rotSin - cheekYOffset * rotCos,
    fw * 0.22,
    fh * 0.28,
    metrics.rotationZ - 0.2,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Right cheek hollow
  ctx.beginPath();
  ctx.ellipse(
    cx + cheekOffset * rotCos + cheekYOffset * rotSin,
    cy + cheekOffset * rotSin - cheekYOffset * rotCos,
    fw * 0.22,
    fh * 0.28,
    metrics.rotationZ + 0.2,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 3. Deepening void around eye sockets
  const eyeRadius = fw * 0.22;
  const drawSocket = (ex: number, ey: number) => {
    const socketGrad = ctx.createRadialGradient(ex, ey, eyeRadius * 0.1, ex, ey, eyeRadius);
    socketGrad.addColorStop(0, 'rgba(2, 2, 2, 0.95)');
    socketGrad.addColorStop(0.5, 'rgba(10, 12, 12, 0.85)');
    socketGrad.addColorStop(0.85, 'rgba(20, 25, 22, 0.5)');
    socketGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = socketGrad;
    ctx.beginPath();
    ctx.arc(ex, ey, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Piercing cold pinpoint glimmer in the dark
    const pulse = reducedMotion ? 0.6 : 0.4 + 0.3 * Math.sin(timeMs * 0.003 + ex);
    ctx.fillStyle = `rgba(180, 230, 220, ${pulse})`;
    ctx.beginPath();
    ctx.arc(ex, ey - 1, 1.4, 0, Math.PI * 2);
    ctx.fill();
  };

  drawSocket(lx, ly);
  drawSocket(rx, ry);

  // 4. Delicate cracked clay fractures branching down forehead and cheeks
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(metrics.rotationZ);
  ctx.strokeStyle = 'rgba(10, 12, 10, 0.7)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();

  // Forehead crack
  ctx.moveTo(0, -fh * 0.3);
  ctx.lineTo(-fw * 0.08, -fh * 0.5);
  ctx.lineTo(fw * 0.04, -fh * 0.65);
  ctx.lineTo(-fw * 0.02, -fh * 0.82);

  // Left cheek branch
  ctx.moveTo(-fw * 0.2, ly - cy + eyeRadius * 0.8);
  ctx.lineTo(-fw * 0.35, fh * 0.2);
  ctx.lineTo(-fw * 0.28, fh * 0.38);
  ctx.lineTo(-fw * 0.42, fh * 0.52);

  // Right cheek branch
  ctx.moveTo(fw * 0.22, ry - cy + eyeRadius * 0.8);
  ctx.lineTo(fw * 0.32, fh * 0.18);
  ctx.lineTo(fw * 0.38, fh * 0.35);

  ctx.stroke();
  ctx.restore();
}

// ----------------------------------------------------
// 2. THE VEILED ONE (Mors Velata)
// ----------------------------------------------------
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
  const fw = Math.max(metrics.faceWidth * width, 60);
  const fh = Math.max(metrics.faceHeight * height, 80);

  // 1. Ghostly skeletal contours under skin
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(metrics.rotationZ);

  // Skeletal nose cavity hint
  ctx.fillStyle = 'rgba(5, 5, 8, 0.55)';
  ctx.beginPath();
  ctx.moveTo(0, -fh * 0.02);
  ctx.lineTo(-fw * 0.08, fh * 0.08);
  ctx.lineTo(0, fh * 0.05);
  ctx.lineTo(fw * 0.08, fh * 0.08);
  ctx.closePath();
  ctx.fill();

  // Malar bone & jaw skeletal shading
  ctx.strokeStyle = 'rgba(180, 190, 205, 0.2)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  // Zygomatic arches
  ctx.arc(-fw * 0.3, -fh * 0.05, fw * 0.15, 0, Math.PI * 0.7);
  ctx.arc(fw * 0.3, -fh * 0.05, fw * 0.15, Math.PI * 0.3, Math.PI);
  ctx.stroke();

  // 2. Funeral Mourning Lace Veil Draped Over Crown
  const wave = reducedMotion ? 0 : Math.sin(timeMs * 0.002) * 4;
  const veilTop = -fh * 0.85;
  const veilBottom = fh * 0.95;

  // Dark sheer veil layer
  const veilGrad = ctx.createLinearGradient(0, veilTop, 0, veilBottom);
  veilGrad.addColorStop(0, 'rgba(8, 7, 12, 0.92)');
  veilGrad.addColorStop(0.3, 'rgba(12, 10, 16, 0.75)');
  veilGrad.addColorStop(0.7, 'rgba(15, 12, 18, 0.6)');
  veilGrad.addColorStop(1, 'rgba(5, 5, 8, 0.85)');

  ctx.fillStyle = veilGrad;
  ctx.beginPath();
  ctx.moveTo(-fw * 0.75, veilTop + fh * 0.3);
  ctx.quadraticCurveTo(0, veilTop - 10, fw * 0.75, veilTop + fh * 0.3);
  ctx.quadraticCurveTo(fw * 0.85 + wave, cy + fh * 0.4, fw * 0.65, veilBottom);
  ctx.quadraticCurveTo(0, veilBottom + 15, -fw * 0.65, veilBottom);
  ctx.quadraticCurveTo(-fw * 0.85 - wave, cy + fh * 0.4, -fw * 0.75, veilTop + fh * 0.3);
  ctx.closePath();
  ctx.fill();

  // Victorian Lace Filigree Patterns on Veil
  ctx.strokeStyle = 'rgba(140, 130, 155, 0.22)';
  ctx.lineWidth = 0.9;
  for (let i = -3; i <= 3; i++) {
    const xOffset = i * (fw * 0.2);
    ctx.beginPath();
    ctx.arc(xOffset, -fh * 0.4, fw * 0.18, 0, Math.PI);
    ctx.arc(xOffset, 0, fw * 0.18, 0, Math.PI);
    ctx.arc(xOffset, fh * 0.4, fw * 0.18, 0, Math.PI);
    ctx.stroke();
  }

  // Wispy trailing tendrils at veil hem
  ctx.strokeStyle = 'rgba(20, 18, 26, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let j = -4; j <= 4; j++) {
    const startX = j * (fw * 0.14);
    const drop = 15 + Math.sin(timeMs * 0.003 + j) * 8;
    ctx.moveTo(startX, veilBottom);
    ctx.quadraticCurveTo(startX + (reducedMotion ? 0 : Math.sin(timeMs * 0.002 + j) * 6), veilBottom + drop * 0.5, startX, veilBottom + drop);
  }
  ctx.stroke();

  ctx.restore();
}

// ----------------------------------------------------
// 3. THE GRINNING GUEST (Hospes Ridens)
// ----------------------------------------------------
function renderTheGrinningGuest(
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
  const mx = metrics.mouthCenter.x * width;
  const my = metrics.mouthCenter.y * height;
  const fw = Math.max(metrics.faceWidth * width, 60);
  const fh = Math.max(metrics.faceHeight * height, 80);

  // 1. Deep sunken void eyes
  const eyeR = fw * 0.2;
  const drawDeepSocket = (ex: number, ey: number) => {
    const sGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, eyeR);
    sGrad.addColorStop(0, '#000000');
    sGrad.addColorStop(0.7, 'rgba(5, 0, 0, 0.9)');
    sGrad.addColorStop(1, 'rgba(20, 5, 5, 0)');
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Red-ember tiny ocular pinpoint
    const emberPulse = reducedMotion ? 0.7 : 0.5 + 0.4 * Math.sin(timeMs * 0.004);
    ctx.fillStyle = `rgba(190, 45, 45, ${emberPulse})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 1.8, 0, Math.PI * 2);
    ctx.fill();
  };

  drawDeepSocket(lx, ly);
  drawDeepSocket(rx, ry);

  // 2. Impossible Widened Needled Smile
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(metrics.rotationZ);

  const grinWidth = fw * 0.92; // Stretches almost across cheekbones
  const grinHeight = fh * 0.42;

  // Mouth void background
  ctx.fillStyle = '#020000';
  ctx.beginPath();
  ctx.moveTo(-grinWidth * 0.5, 0);
  // Upper lip arc
  ctx.quadraticCurveTo(0, -grinHeight * 0.45, grinWidth * 0.5, 0);
  // Lower lip deep dropping arc
  ctx.quadraticCurveTo(0, grinHeight * 0.95, -grinWidth * 0.5, 0);
  ctx.closePath();
  ctx.fill();

  // Dark bruised rim around stretched mouth
  ctx.strokeStyle = 'rgba(60, 15, 15, 0.65)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Shadowy rows of needle-like teeth
  const numTeeth = 18;
  ctx.fillStyle = 'rgba(215, 205, 190, 0.85)';
  ctx.beginPath();

  // Upper row of sharp teeth
  for (let i = 0; i < numTeeth; i++) {
    const t = (i / (numTeeth - 1)) * 2 - 1; // -1 to 1
    const tx = t * (grinWidth * 0.44);
    const ty = (t * t - 1) * (grinHeight * 0.25);
    const toothLen = (1 - Math.abs(t) * 0.4) * (grinHeight * 0.35);

    ctx.moveTo(tx - 2, ty);
    ctx.lineTo(tx, ty + toothLen);
    ctx.lineTo(tx + 2, ty);
  }

  // Lower row of sharp teeth
  for (let i = 0; i < numTeeth - 2; i++) {
    const t = (i / (numTeeth - 3)) * 2 - 1;
    const tx = t * (grinWidth * 0.4);
    const ty = (1 - t * t) * (grinHeight * 0.5);
    const toothLen = (1 - Math.abs(t) * 0.4) * (grinHeight * 0.3);

    ctx.moveTo(tx - 2, ty);
    ctx.lineTo(tx, ty - toothLen);
    ctx.lineTo(tx + 2, ty);
  }
  ctx.closePath();
  ctx.fill();

  // Shadow overlay inside mouth depth
  const mouthShadow = ctx.createRadialGradient(0, grinHeight * 0.1, 5, 0, grinHeight * 0.1, grinWidth * 0.5);
  mouthShadow.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
  mouthShadow.addColorStop(0.7, 'rgba(5, 0, 0, 0.6)');
  mouthShadow.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
  ctx.fillStyle = mouthShadow;
  ctx.beginPath();
  ctx.moveTo(-grinWidth * 0.5, 0);
  ctx.quadraticCurveTo(0, -grinHeight * 0.45, grinWidth * 0.5, 0);
  ctx.quadraticCurveTo(0, grinHeight * 0.95, -grinWidth * 0.5, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ----------------------------------------------------
// 4. THE DOPPELGÄNGER (Duplex Umbra)
// ----------------------------------------------------
function renderTheDoppelganger(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  timeMs: number,
  reducedMotion: boolean
) {
  // Retrieve historical frame from ~8-14 frames ago (approx 150-250ms delayed)
  const targetLagIdx = Math.min(lagHistory.length - 1, reducedMotion ? 2 : 10);
  const delayedFrame = lagHistory[targetLagIdx] || metrics;

  const dx = (delayedFrame.center.x - metrics.center.x) * width;
  const dy = (delayedFrame.center.y - metrics.center.y) * height;
  const speed = Math.hypot(dx, dy);

  const cx = delayedFrame.center.x * width;
  const cy = delayedFrame.center.y * height;
  const fw = Math.max(delayedFrame.faceWidth * width, 60);
  const fh = Math.max(delayedFrame.faceHeight * height, 80);

  // 1. Ghost Reflection Silhouette trailing
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(delayedFrame.rotationZ);

  // Chromatic split during motion
  const splitOffset = reducedMotion ? 0 : Math.min(speed * 0.25, 8);

  // Red channel displacement ghost
  ctx.fillStyle = 'rgba(180, 50, 60, 0.18)';
  ctx.beginPath();
  ctx.ellipse(-splitOffset, 0, fw * 0.7, fh * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cyan channel displacement ghost
  ctx.fillStyle = 'rgba(50, 160, 180, 0.22)';
  ctx.beginPath();
  ctx.ellipse(splitOffset, 0, fw * 0.7, fh * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark delayed face mask
  const ghostGrad = ctx.createRadialGradient(0, 0, fw * 0.1, 0, 0, fw * 0.8);
  ghostGrad.addColorStop(0, 'rgba(5, 8, 12, 0.65)');
  ghostGrad.addColorStop(0.7, 'rgba(10, 15, 20, 0.45)');
  ghostGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ghostGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, fw * 0.75, fh * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Delayed Hollow Eyes
  const eyeOffsetX = fw * 0.28;
  const eyeOffsetY = -fh * 0.12;

  ctx.fillStyle = 'rgba(2, 4, 6, 0.85)';
  ctx.beginPath();
  ctx.arc(-eyeOffsetX, eyeOffsetY, fw * 0.12, 0, Math.PI * 2);
  ctx.arc(eyeOffsetX, eyeOffsetY, fw * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Delayed cold ocular glance
  ctx.fillStyle = 'rgba(120, 200, 220, 0.6)';
  ctx.beginPath();
  // The ghost eyes look sideways or linger
  const lookShift = Math.sin(timeMs * 0.003) * 2;
  ctx.arc(-eyeOffsetX + lookShift, eyeOffsetY, 1.8, 0, Math.PI * 2);
  ctx.arc(eyeOffsetX + lookShift, eyeOffsetY, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ----------------------------------------------------
// 5. THE PASSENGER (Spectrum Post Tergum)
// ----------------------------------------------------
function renderThePassenger(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  timeMs: number,
  reducedMotion: boolean
) {
  // Loosely reacts to user's head position, appearing over the left or right shoulder
  const shoulderSide = metrics.center.x > 0.5 ? -1 : 1; // Opposite side of where face leans
  const entityBaseX = (metrics.center.x + shoulderSide * 0.35) * width;
  const entityBaseY = (metrics.center.y - 0.08) * height;

  const swayX = reducedMotion ? 0 : Math.sin(timeMs * 0.0015) * 6;
  const swayY = reducedMotion ? 0 : Math.cos(timeMs * 0.0012) * 4;
  const px = entityBaseX + swayX;
  const py = entityBaseY + swayY;

  // Intermittent fade breath
  const alphaBreath = reducedMotion ? 0.7 : 0.5 + 0.35 * Math.sin(timeMs * 0.002);

  ctx.save();
  ctx.translate(px, py);

  // Shadow entity towering silhouette
  const bodyGrad = ctx.createRadialGradient(0, 0, 10, 0, 40, width * 0.45);
  bodyGrad.addColorStop(0, `rgba(0, 0, 0, ${0.9 * alphaBreath})`);
  bodyGrad.addColorStop(0.5, `rgba(6, 4, 3, ${0.75 * alphaBreath})`);
  bodyGrad.addColorStop(0.85, `rgba(12, 8, 6, ${0.35 * alphaBreath})`);
  bodyGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  // Looming cloaked head and shoulder silhouette
  ctx.moveTo(0, -60);
  ctx.quadraticCurveTo(45, -50, 55, 10);
  ctx.quadraticCurveTo(85, 120, 110, 240);
  ctx.lineTo(-110, 240);
  ctx.quadraticCurveTo(-85, 120, -55, 10);
  ctx.quadraticCurveTo(-45, -50, 0, -60);
  ctx.closePath();
  ctx.fill();

  // Subtle piercing pale watcher eyes looking directly at user's reflection
  const eyeAlpha = reducedMotion ? 0.75 : 0.45 + 0.4 * Math.sin(timeMs * 0.0025 + 1);
  ctx.fillStyle = `rgba(225, 230, 210, ${eyeAlpha * alphaBreath})`;

  // Left & right specter eyes
  ctx.beginPath();
  ctx.ellipse(-14, -18, 3.2, 1.8, -0.1, 0, Math.PI * 2);
  ctx.ellipse(14, -18, 3.2, 1.8, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Soft faint eye glow
  const glow = ctx.createRadialGradient(0, -18, 2, 0, -18, 24);
  glow.addColorStop(0, `rgba(180, 200, 170, ${0.35 * alphaBreath})`);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -18, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Subtle cold desaturation on user's own face
  const cx = metrics.center.x * width;
  const cy = metrics.center.y * height;
  const fw = Math.max(metrics.faceWidth * width, 60);
  const fh = Math.max(metrics.faceHeight * height, 80);

  const chillGrad = ctx.createRadialGradient(cx, cy, fw * 0.2, cx, cy, fw * 0.8);
  chillGrad.addColorStop(0, 'rgba(8, 12, 10, 0.25)');
  chillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = chillGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, fw * 0.8, fh * 0.9, metrics.rotationZ, 0, Math.PI * 2);
  ctx.fill();
}

// Fallback ambient passenger when face not detected
function renderAmbientPassenger(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  reducedMotion: boolean
) {
  const alpha = reducedMotion ? 0.35 : 0.25 + 0.15 * Math.sin(timeMs * 0.001);
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(width * 0.8, height * 0.35, width * 0.3, height * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ----------------------------------------------------
// PARANORMAL AUTONOMOUS EVENTS
// ----------------------------------------------------
function renderParanormalEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  paranormal: ParanormalState,
  timeMs: number,
  reducedMotion: boolean
) {
  const progress = Math.min((timeMs - paranormal.startTime) / paranormal.durationMs, 1.0);
  const envelope = Math.sin(progress * Math.PI); // 0 -> 1 -> 0

  switch (paranormal.activeEvent) {
    case 'peripheral_face': {
      // Pale face silhouette peeking from mirror edge for ~500ms
      const side = paranormal.variant > 0.5 ? width * 0.08 : width * 0.92;
      const peekY = height * (0.3 + paranormal.variant * 0.4);
      const peekAlpha = envelope * 0.65;

      ctx.fillStyle = `rgba(5, 8, 10, ${peekAlpha})`;
      ctx.beginPath();
      ctx.ellipse(side, peekY, 35, 50, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pale eyes watching
      ctx.fillStyle = `rgba(200, 215, 205, ${peekAlpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(side - 8, peekY - 8, 2, 0, Math.PI * 2);
      ctx.arc(side + 8, peekY - 8, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'black_frame': {
      // Brief eclipse/blink into complete mirror darkness for ~150ms
      const darkAlpha = envelope * 0.96;
      ctx.fillStyle = `rgba(0, 0, 0, ${darkAlpha})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'wrong_eyes': {
      // Uncanny divergence: eyes gaze straight at viewer while head turned
      if (metrics.detected) {
        const lx = metrics.leftEye.x * width;
        const ly = metrics.leftEye.y * height;
        const rx = metrics.rightEye.x * width;
        const ry = metrics.rightEye.y * height;
        const alpha = envelope * 0.85;

        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(lx, ly, 12, 0, Math.PI * 2);
        ctx.arc(rx, ry, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(220, 235, 230, ${alpha})`;
        ctx.beginPath();
        ctx.arc(lx, ly, 2.2, 0, Math.PI * 2);
        ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'glass_pulse': {
      // Occult hairline fractures and sigils pulse with cold phosphorus light
      const pulseAlpha = envelope * 0.55;
      ctx.strokeStyle = `rgba(160, 220, 195, ${pulseAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      // Diagonal hairline fractures
      ctx.moveTo(width * 0.1, 0);
      ctx.lineTo(width * 0.35, height * 0.4);
      ctx.lineTo(width * 0.3, height * 0.65);
      ctx.lineTo(width * 0.55, height);

      ctx.moveTo(width * 0.9, height * 0.2);
      ctx.lineTo(width * 0.7, height * 0.55);
      ctx.lineTo(width * 0.78, height * 0.85);
      ctx.stroke();
      break;
    }

    case 'reflection_lag': {
      // Handled in canvas video blit layer
      break;
    }
  }
}
