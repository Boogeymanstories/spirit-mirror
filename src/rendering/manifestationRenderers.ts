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
    renderParanormalEffect(ctx, width, height, metrics, paranormal, timeMs, reducedMotion);
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

  // 1. Richer Ashen Mortuary Skin Tint over Facial Core
  const ashenGrad = ctx.createRadialGradient(cx, cy, fw * 0.15, cx, cy, fw * 0.88);
  ashenGrad.addColorStop(0, 'rgba(10, 16, 15, 0.42)');
  ashenGrad.addColorStop(0.65, 'rgba(14, 18, 17, 0.26)');
  ashenGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ashenGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, fw * 0.78, fh * 0.88, metrics.rotationZ, 0, Math.PI * 2);
  ctx.fill();

  // 2. Soft-Blended Cursed Relic Stone & Gilded Fissures
  const maskImg = getLoadedImage(ARTWORK.cursedStoneMask);
  if (maskImg) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(metrics.rotationZ);

    const maskW = fw * 1.85;
    const maskH = (maskW * maskImg.naturalHeight) / maskImg.naturalWidth;

    // Feathered elliptical clipping so it seamlessly melts into the real facial structure
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, fw * 0.72, fh * 0.82, 0, 0, Math.PI * 2);
    ctx.clip();

    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.52;
    ctx.drawImage(maskImg, -maskW / 2, -maskH * 0.46, maskW, maskH);
    ctx.restore();

    ctx.restore();
  }

  // 3. Sunken Hollow Cheek & Temple Shading
  const drawHollowShadow = (x: number, y: number, r: number) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(2, 3, 4, 0.75)');
    grad.addColorStop(0.55, 'rgba(4, 6, 7, 0.38)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const lcx = metrics.leftCheek.x * width;
  const lcy = metrics.leftCheek.y * height;
  const rcx = metrics.rightCheek.x * width;
  const rcy = metrics.rightCheek.y * height;
  drawHollowShadow(lcx, lcy, fw * 0.28);
  drawHollowShadow(rcx, rcy, fw * 0.28);

  // 4. Deep Darkened Abyssal Eye Sockets
  const socketRadius = Math.max(fw * 0.22, 16);
  const drawDeepSocket = (ex: number, ey: number) => {
    const socketGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, socketRadius);
    socketGrad.addColorStop(0, 'rgba(1, 2, 2, 0.98)');
    socketGrad.addColorStop(0.5, 'rgba(3, 5, 6, 0.92)');
    socketGrad.addColorStop(0.85, 'rgba(7, 10, 12, 0.5)');
    socketGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = socketGrad;
    ctx.beginPath();
    ctx.ellipse(ex, ey, socketRadius * 1.12, socketRadius * 0.95, metrics.rotationZ, 0, Math.PI * 2);
    ctx.fill();

    // Piercing Soul Pinpoint inside Socket
    const pulse = reducedMotion ? 0.85 : 0.65 + 0.35 * Math.sin(timeMs * 0.0035 + ex);
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(225, 185, 75, ${pulse * 0.8})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
    ctx.fill();
  };

  drawDeepSocket(lx, ly);
  drawDeepSocket(rx, ry);

  // 5. Gilded Branching Fissure Highlights
  ctx.strokeStyle = 'rgba(215, 175, 65, 0.68)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  const fx = metrics.forehead.x * width;
  const fy = metrics.forehead.y * height;
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx + 5, fy + fh * 0.12);
  ctx.lineTo(fx - 4, fy + fh * 0.21);
  ctx.moveTo(lcx, lcy - 5);
  ctx.lineTo(lcx - 6, lcy + 12);
  ctx.moveTo(rcx, rcy - 5);
  ctx.lineTo(rcx + 6, rcy + 12);
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

  // 1. Spectral Alabaster / Moonlight Mortuary Tint (Real Face clearly visible underneath)
  const paleGlow = ctx.createRadialGradient(cx, cy, fw * 0.1, cx, cy, fw * 0.88);
  paleGlow.addColorStop(0, 'rgba(205, 230, 235, 0.24)');
  paleGlow.addColorStop(0.55, 'rgba(165, 195, 205, 0.14)');
  paleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = paleGlow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, fw * 0.78, fh * 0.88, metrics.rotationZ, 0, Math.PI * 2);
  ctx.fill();

  // 2. Sorrowful Shadowed Eye Wells under Mourning Veil with Glassy Tear Trails
  const drawSorrowfulEye = (ex: number, ey: number, isLeft: boolean) => {
    const eyeGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, fw * 0.2);
    eyeGrad.addColorStop(0, 'rgba(6, 10, 14, 0.82)');
    eyeGrad.addColorStop(0.65, 'rgba(12, 18, 24, 0.38)');
    eyeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = eyeGrad;
    ctx.beginPath();
    ctx.arc(ex, ey, fw * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Cold moonlight glassy tear glint
    const glintAlpha = reducedMotion ? 0.75 : 0.6 + 0.3 * Math.sin(timeMs * 0.002 + (isLeft ? 0 : 1.2));
    ctx.fillStyle = `rgba(220, 245, 255, ${glintAlpha})`;
    ctx.beginPath();
    ctx.arc(ex, ey + 2.5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Spectral tear trail descending down the cheek
    ctx.strokeStyle = `rgba(180, 220, 235, ${glintAlpha * 0.45})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ex, ey + 4);
    ctx.lineTo(ex + (isLeft ? -2 : 2), ey + fh * 0.22);
    ctx.stroke();
  };

  drawSorrowfulEye(lx, ly, true);
  drawSorrowfulEye(rx, ry, false);

  // 3. Faint Dark Mortuary Lip Stain
  const mx = metrics.mouthCenter.x * width;
  const my = metrics.mouthCenter.y * height;
  const lipGrad = ctx.createRadialGradient(mx, my, 0, mx, my, fw * 0.22);
  lipGrad.addColorStop(0, 'rgba(25, 12, 18, 0.55)');
  lipGrad.addColorStop(0.7, 'rgba(15, 8, 12, 0.2)');
  lipGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = lipGrad;
  ctx.beginPath();
  ctx.ellipse(mx, my, fw * 0.24, fh * 0.12, metrics.rotationZ, 0, Math.PI * 2);
  ctx.fill();

  // 4. Flowing Mourning Lace Headdress & Sheer Shroud
  const veilImg = getLoadedImage(ARTWORK.veiledOneOverlay);
  const veilDrift = reducedMotion ? 0 : Math.sin(timeMs * 0.0016) * 4;
  const veilBreath = reducedMotion ? 0.85 : 0.76 + 0.14 * Math.sin(timeMs * 0.002);

  if (veilImg) {
    ctx.save();
    ctx.translate(cx, cy - fh * 0.06 + veilDrift);
    ctx.rotate(metrics.rotationZ);

    const veilW = fw * 2.6;
    const veilH = (veilW * veilImg.naturalHeight) / veilImg.naturalWidth;

    // Translucent screen blend so the lace headdress drapes around and beyond the head
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = veilBreath;
    ctx.drawImage(veilImg, -veilW / 2, -veilH * 0.42, veilW, veilH);
    ctx.restore();
  }

  // 5. Delicate Sheer Lace Texture Cascading Across Brow & Beyond
  ctx.save();
  ctx.translate(cx, cy + veilDrift * 0.5);
  ctx.rotate(metrics.rotationZ);
  ctx.strokeStyle = `rgba(180, 215, 230, ${veilBreath * 0.3})`;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  // Lace filigree curves over crown
  for (let i = -3; i <= 3; i++) {
    const xOff = i * (fw * 0.2);
    ctx.arc(xOff, -fh * 0.42, fw * 0.14, 0, Math.PI);
  }
  ctx.stroke();
  ctx.restore();

  // 6. Spectral Mourning Mist Shroud Around Shoulders
  const shroudGrad = ctx.createLinearGradient(cx, cy + fh * 0.35, cx, height);
  shroudGrad.addColorStop(0, 'rgba(160, 205, 220, 0.14)');
  shroudGrad.addColorStop(0.5, 'rgba(120, 165, 185, 0.08)');
  shroudGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shroudGrad;
  ctx.fillRect(0, cy + fh * 0.35, width, height - (cy + fh * 0.35));

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
  const cx = metrics.center.x * width;
  const cy = metrics.center.y * height;
  const lx = metrics.leftEye.x * width;
  const ly = metrics.leftEye.y * height;
  const rx = metrics.rightEye.x * width;
  const ry = metrics.rightEye.y * height;
  const mx = metrics.mouthCenter.x * width;
  const my = metrics.mouthCenter.y * height;
  const fw = Math.max(metrics.faceWidth * width, 70);
  const fh = Math.max(metrics.faceHeight * height, 90);

  ctx.save();

  // 1. Porcelain Smile Integrated into Lower Jaw / Mouth Third
  const grinImg = getLoadedImage(ARTWORK.demonGrinMask);
  if (grinImg) {
    ctx.save();
    ctx.translate(cx, cy - fh * 0.02);
    ctx.rotate(metrics.rotationZ);

    const grinW = fw * 1.9;
    const grinH = (grinW * grinImg.naturalHeight) / grinImg.naturalWidth;

    // Feathered mask preserving upper face and blending seamlessly into real jawline
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, fw * 0.74, fh * 0.84, 0, 0, Math.PI * 2);
    ctx.clip();

    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.85;
    ctx.drawImage(grinImg, -grinW / 2, -grinH * 0.45, grinW, grinH);
    ctx.restore();

    ctx.restore();
  }

  // 2. Uncanny Jaw & Smile Extension Shading
  const jawGrad = ctx.createRadialGradient(mx, my, fw * 0.12, mx, my, fw * 0.58);
  jawGrad.addColorStop(0, 'rgba(18, 2, 3, 0.48)');
  jawGrad.addColorStop(0.7, 'rgba(10, 2, 3, 0.16)');
  jawGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = jawGrad;
  ctx.beginPath();
  ctx.ellipse(mx, my, fw * 0.52, fh * 0.32, metrics.rotationZ, 0, Math.PI * 2);
  ctx.fill();

  // 3. Piercing Manic Pupils & Widened Ocular Sockets
  const drawManicEye = (ex: number, ey: number) => {
    const socketGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, fw * 0.15);
    socketGrad.addColorStop(0, 'rgba(3, 2, 4, 0.78)');
    socketGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = socketGrad;
    ctx.beginPath();
    ctx.arc(ex, ey, fw * 0.15, 0, Math.PI * 2);
    ctx.fill();

    const gleam = reducedMotion ? 1.0 : 0.8 + 0.2 * Math.sin(timeMs * 0.005 + ex);
    ctx.fillStyle = `rgba(255, 255, 255, ${gleam})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
    ctx.fill();
  };

  drawManicEye(lx, ly);
  drawManicEye(rx, ry);

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
  // Target historical frames for temporal desync
  const lagCycle = reducedMotion ? 0 : Math.sin(timeMs * 0.0012);
  // Periodic hesitation: duplicate lingers even further behind (12-15 frames), then glides to catch up
  const lagDepth = reducedMotion ? 4 : Math.floor(8 + 6 * Math.max(0, lagCycle));
  const delayedIndex = Math.min(lagHistory.length - 1, lagDepth);
  const delayedFrame = lagHistory[delayedIndex] || metrics;

  const dx = (delayedFrame.center.x - metrics.center.x) * width;
  const dy = (delayedFrame.center.y - metrics.center.y) * height;
  const dRot = delayedFrame.rotationZ - metrics.rotationZ;

  const fw = Math.max(metrics.faceWidth * width, 65);
  const fh = Math.max(metrics.faceHeight * height, 85);

  ctx.save();

  // 1. Composite Delayed Video Reflection with Restrained Chromatic Shift
  if (delayedCanvas && delayedCanvas.width > 0) {
    const splitOffset = reducedMotion ? 0 : Math.min(Math.hypot(dx, dy) * 0.35 + 2.5, 7.5);

    // Delayed Reflection Layer (Feathered around user's upper body / head area)
    ctx.save();
    ctx.beginPath();
    const dcx = delayedFrame.center.x * width;
    const dcy = delayedFrame.center.y * height;
    ctx.ellipse(dcx, dcy + fh * 0.2, fw * 1.5, fh * 1.8, delayedFrame.rotationZ, 0, Math.PI * 2);
    ctx.clip();

    // Cyan chromatic lag channel
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(delayedCanvas, splitOffset, 0, width, height);
    ctx.fillStyle = 'rgba(0, 220, 245, 0.25)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Red chromatic lag channel
    ctx.save();
    ctx.globalAlpha = 0.36;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(delayedCanvas, -splitOffset, 0, width, height);
    ctx.fillStyle = 'rgba(240, 45, 65, 0.22)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.restore();
  } else {
    // Fallback Spectral Silhouette Echoes while buffer warms up
    const drawDelayedSilhouette = (frame: HistoricalFrame, alpha: number, color: string, xOff: number) => {
      const cx = frame.center.x * width + xOff;
      const cy = frame.center.y * height;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(frame.rotationZ);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.ellipse(0, 0, fw * 0.75, fh * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawDelayedSilhouette(delayedFrame, 0.38, 'rgba(45, 200, 230, 0.45)', reducedMotion ? 0 : 4);
    drawDelayedSilhouette(delayedFrame, 0.32, 'rgba(230, 45, 60, 0.38)', reducedMotion ? 0 : -4);
  }

  // 2. Unsettling Asynchronous Gaze Disagreement
  // The delayed reflection's eyes linger and hold direct eye contact with the viewer
  const dlx = delayedFrame.leftEye.x * width;
  const dly = delayedFrame.leftEye.y * height;
  const drx = delayedFrame.rightEye.x * width;
  const dry = delayedFrame.rightEye.y * height;

  const gazeGlow = reducedMotion ? 0.4 : 0.45 + 0.25 * Math.sin(timeMs * 0.002);
  const drawGazeEcho = (ex: number, ey: number) => {
    ctx.fillStyle = `rgba(175, 235, 250, ${gazeGlow})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(0, 210, 240, ${gazeGlow * 0.4})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 5.0, 0, Math.PI * 2);
    ctx.fill();
  };

  drawGazeEcho(dlx, dly);
  drawGazeEcho(drx, dry);

  // 3. Subtle Desync Glitch Scanline on Lag Disagreement
  if (!reducedMotion && Math.abs(dRot) > 0.02 && Math.random() < 0.22) {
    const scanY = delayedFrame.center.y * height + (Math.random() - 0.5) * fh;
    ctx.strokeStyle = 'rgba(100, 235, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(delayedFrame.center.x * width - fw * 0.7, scanY);
    ctx.lineTo(delayedFrame.center.x * width + fw * 0.7, scanY);
    ctx.stroke();
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
  // Anchor entity deep behind the subject's shoulder
  const shoulderSide = metrics.center.x > 0.5 ? -1 : 1;
  // Parallax shift: shifts inversely to user head turn, reinforcing 3D depth behind the user
  const parallaxX = -metrics.rotationY * 18;
  const entityBaseX = (metrics.center.x + shoulderSide * 0.33) * width + parallaxX;
  const entityBaseY = (metrics.center.y - 0.06) * height;

  const swayX = reducedMotion ? 0 : Math.sin(timeMs * 0.0012) * 4;
  const swayY = reducedMotion ? 0 : Math.cos(timeMs * 0.0009) * 3;
  const px = entityBaseX + swayX;
  const py = entityBaseY + swayY;

  // Gentle atmospheric presence (not dominating the face)
  const alphaBreath = reducedMotion ? 0.72 : 0.58 + 0.16 * Math.sin(timeMs * 0.0018);

  ctx.save();

  // 1. Deep Shadowy Silhouette Looming Behind Shoulder
  const shadowGrad = ctx.createRadialGradient(px, py + 15, 10, px, py + 15, width * 0.38);
  shadowGrad.addColorStop(0, 'rgba(2, 4, 5, 0.85)');
  shadowGrad.addColorStop(0.6, 'rgba(3, 7, 8, 0.48)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(px, py + 25, width * 0.28, height * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. High-Res Gilded Veil Wraith Asset Scaled in Deep Perspective
  const wraithImg = getLoadedImage(ARTWORK.passengerWraith);
  if (wraithImg) {
    ctx.save();
    ctx.translate(px, py);
    const entityW = width * 0.72; // Receded depth scale
    const entityH = (entityW * wraithImg.naturalHeight) / wraithImg.naturalWidth;

    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.68 * alphaBreath;
    ctx.drawImage(wraithImg, -entityW / 2, -entityH * 0.38, entityW, entityH);
    ctx.restore();
  }

  // 3. Piercing but Restrained Pale Cold Specter Eyes Locking from Shadows
  const eyeAlpha = reducedMotion ? 0.85 : 0.68 + 0.22 * Math.sin(timeMs * 0.0022 + 0.5);
  const eyeSpread = 11;
  const eyeElevation = -18;

  // Left specter eye
  ctx.fillStyle = `rgba(225, 245, 230, ${eyeAlpha * alphaBreath})`;
  ctx.beginPath();
  ctx.ellipse(px - eyeSpread, py + eyeElevation, 2.8, 1.8, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(160, 220, 195, ${eyeAlpha * 0.5})`;
  ctx.beginPath();
  ctx.arc(px - eyeSpread, py + eyeElevation, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Right specter eye
  ctx.fillStyle = `rgba(225, 245, 230, ${eyeAlpha * alphaBreath})`;
  ctx.beginPath();
  ctx.ellipse(px + eyeSpread, py + eyeElevation, 2.8, 1.8, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(160, 220, 195, ${eyeAlpha * 0.5})`;
  ctx.beginPath();
  ctx.arc(px + eyeSpread, py + eyeElevation, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
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
    ctx.globalAlpha = 0.15;
    ctx.drawImage(crackedImg, 0, 0, width, height);
    ctx.restore();
  }

  // 2. Deep Edge Vignette - Frames the mirror naturally without washing out the center
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

  // 3. Subtle Antique Mirror Bevel Rim
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
  reducedMotion: boolean
) {
  const progress = Math.min((timeMs - paranormal.startTime) / paranormal.durationMs, 1.0);
  const envelope = Math.sin(progress * Math.PI);

  switch (paranormal.activeEvent) {
    case 'peripheral_face': {
      const side = paranormal.variant > 0.5 ? width * 0.08 : width * 0.92;
      const peekY = height * (0.32 + paranormal.variant * 0.36);
      const peekAlpha = envelope * 0.8;

      ctx.fillStyle = `rgba(3, 6, 7, ${peekAlpha})`;
      ctx.beginPath();
      ctx.ellipse(side, peekY, 34, 48, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(220, 235, 225, ${peekAlpha * 0.95})`;
      ctx.beginPath();
      ctx.arc(side - 7, peekY - 7, 2.0, 0, Math.PI * 2);
      ctx.arc(side + 7, peekY - 7, 2.0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'black_frame': {
      const darkAlpha = envelope * 0.96;
      ctx.fillStyle = `rgba(0, 0, 0, ${darkAlpha})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'wrong_eyes': {
      if (metrics.detected) {
        const lx = metrics.leftEye.x * width;
        const ly = metrics.leftEye.y * height;
        const rx = metrics.rightEye.x * width;
        const ry = metrics.rightEye.y * height;
        const alpha = envelope * 0.9;

        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(lx, ly, 12, 0, Math.PI * 2);
        ctx.arc(rx, ry, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(235, 250, 240, ${alpha})`;
        ctx.beginPath();
        ctx.arc(lx, ly, 2.4, 0, Math.PI * 2);
        ctx.arc(rx, ry, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'glass_pulse': {
      const pulseAlpha = envelope * 0.6;
      ctx.strokeStyle = `rgba(170, 235, 210, ${pulseAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(width * 0.12, 0);
      ctx.lineTo(width * 0.35, height * 0.4);
      ctx.lineTo(width * 0.3, height * 0.65);
      ctx.lineTo(width * 0.52, height);
      ctx.stroke();
      break;
    }

    case 'reflection_lag': {
      break;
    }
  }
}
