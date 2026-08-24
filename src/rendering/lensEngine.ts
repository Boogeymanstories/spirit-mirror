import { FaceMetrics, ManifestationId, Point2D } from '../types';

type ParticleStyle = 'sparks' | 'spores' | 'flame-wisps';
type EyeReaction = 'shadow' | 'ember' | 'swamp' | 'warm';
type MouthReaction = 'shadow' | 'grin' | 'ember' | 'warm';

interface ReactiveLensProfile {
  jawDeform?: number;
  jawWiden?: number;
  blinkStrength?: number;
  eyeReaction?: EyeReaction;
  mouthStrength?: number;
  mouthReaction?: MouthReaction;
  ambientPulse?: number;
  particleStyle?: ParticleStyle;
  particleCount?: number;
}

export interface ReactiveLensGeometry {
  x0: number;
  x3: number;
  y0: number;
  y1: number;
  y2: number;
  leftEye: Point2D;
  rightEye: Point2D;
  mouthCenter: Point2D;
  mouthLeft: Point2D;
  mouthRight: Point2D;
  faceWidth: number;
  faceHeight: number;
}

const LENS_PROFILES: Partial<Record<ManifestationId, ReactiveLensProfile>> = {
  hollow: {
    jawDeform: 0.018,
    blinkStrength: 0.9,
    eyeReaction: 'shadow',
    mouthStrength: 0.6,
    mouthReaction: 'shadow',
    ambientPulse: 0.36,
  },
  grinning_guest: {
    jawDeform: 0.028,
    jawWiden: 0.018,
    blinkStrength: 0.34,
    eyeReaction: 'shadow',
    mouthStrength: 1.0,
    mouthReaction: 'grin',
    ambientPulse: 0.18,
  },
  wax_prophet: {
    jawDeform: 0.02,
    blinkStrength: 0.28,
    eyeReaction: 'warm',
    mouthStrength: 0.58,
    mouthReaction: 'warm',
    ambientPulse: 0.52,
    particleStyle: 'flame-wisps',
    particleCount: 5,
  },
  moss_crowned_swamp_demon: {
    jawDeform: 0.01,
    blinkStrength: 0.5,
    eyeReaction: 'swamp',
    mouthStrength: 0.42,
    mouthReaction: 'shadow',
    ambientPulse: 0.72,
    particleStyle: 'spores',
    particleCount: 7,
  },
  ashen_king: {
    jawDeform: 0.018,
    jawWiden: 0.008,
    blinkStrength: 0.46,
    eyeReaction: 'ember',
    mouthStrength: 0.72,
    mouthReaction: 'ember',
    ambientPulse: 0.8,
    particleStyle: 'sparks',
    particleCount: 7,
  },
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function hash(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function isReactiveLens(id: ManifestationId): boolean {
  return Boolean(LENS_PROFILES[id]);
}

export function getReactiveJawAdjustment(
  id: ManifestationId,
  metrics: FaceMetrics,
  faceWidth: number,
  faceHeight: number,
  reducedMotion: boolean
): { xBoost: number; yBoost: number } {
  const profile = LENS_PROFILES[id];
  if (!profile || reducedMotion) return { xBoost: 0, yBoost: 0 };

  const jaw = clamp01(metrics.expressions.jawOpen);
  const smile = clamp01(metrics.expressions.mouthSmile);
  const activation = Math.max(jaw, smile * 0.45);

  return {
    xBoost: faceWidth * (profile.jawWiden ?? 0) * activation,
    yBoost: faceHeight * (profile.jawDeform ?? 0) * jaw,
  };
}

function drawAmbientPulse(
  ctx: CanvasRenderingContext2D,
  id: ManifestationId,
  geometry: ReactiveLensGeometry,
  metrics: FaceMetrics,
  profile: ReactiveLensProfile,
  timeMs: number,
  reducedMotion: boolean
) {
  if (!profile.ambientPulse) return;

  const pulse = reducedMotion ? 0.45 : (Math.sin(timeMs * 0.0024) + 1) / 2;
  const jaw = metrics.expressions.jawOpen;
  const reactive = 0.52 + pulse * 0.28 + jaw * 0.2;
  const strength = profile.ambientPulse * reactive;
  const width = geometry.x3 - geometry.x0;
  const height = geometry.y2 - geometry.y0;

  let rgb = '190,205,215';
  if (id === 'moss_crowned_swamp_demon') rgb = '93,208,111';
  else if (id === 'wax_prophet') rgb = '255,179,82';
  else if (id === 'ashen_king') rgb = '255,105,44';
  else if (id === 'grinning_guest') rgb = '170,52,45';
  else if (id === 'hollow') rgb = '95,103,122';

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const grad = ctx.createRadialGradient(
    0,
    geometry.y1 + height * 0.08,
    width * 0.08,
    0,
    geometry.y1 + height * 0.08,
    width * 0.58
  );
  grad.addColorStop(0, `rgba(${rgb},${0.05 * strength})`);
  grad.addColorStop(0.48, `rgba(${rgb},${0.035 * strength})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(geometry.x0, geometry.y0, width, height);
  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  style: ParticleStyle,
  geometry: ReactiveLensGeometry,
  count: number,
  timeMs: number,
  reducedMotion: boolean
) {
  if (reducedMotion || count <= 0) return;

  const width = geometry.x3 - geometry.x0;
  const height = geometry.y2 - geometry.y0;
  const elapsed = timeMs / 1000;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (let i = 0; i < count; i += 1) {
    const r1 = hash(i + 1.17);
    const r2 = hash(i + 5.91);
    const r3 = hash(i + 11.73);
    const speed = style === 'sparks' ? 0.24 + r3 * 0.16 : 0.08 + r3 * 0.08;
    const progress = (elapsed * speed + r2) % 1;
    const sway = Math.sin(elapsed * (1.1 + r3) + r1 * Math.PI * 2) * width * 0.035;
    const x = geometry.x0 + width * (0.22 + r1 * 0.56) + sway;
    const top = style === 'spores' ? geometry.y0 + height * 0.28 : geometry.y0 + height * 0.12;
    const travel = style === 'spores' ? height * 0.55 : height * 0.34;
    const y = top - progress * travel;
    const fade = Math.sin(progress * Math.PI);

    if (style === 'sparks') {
      const size = 0.9 + r2 * 1.8;
      ctx.strokeStyle = `rgba(255,142,57,${0.32 + fade * 0.52})`;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + sway * 0.08, y + height * 0.018);
      ctx.stroke();
    } else if (style === 'spores') {
      const size = 1.2 + r2 * 2.3;
      ctx.fillStyle = `rgba(137,238,124,${0.14 + fade * 0.32})`;
      ctx.shadowColor = 'rgba(97,214,91,0.5)';
      ctx.shadowBlur = size * 2.2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const flicker = 0.6 + Math.sin(elapsed * 8 + i * 2.7) * 0.25;
      const size = 1.4 + r2 * 2.0;
      ctx.fillStyle = `rgba(255,190,86,${(0.18 + fade * 0.42) * flicker})`;
      ctx.shadowColor = 'rgba(255,120,40,0.6)';
      ctx.shadowBlur = size * 3.2;
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.7, size * 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawEyeReaction(
  ctx: CanvasRenderingContext2D,
  geometry: ReactiveLensGeometry,
  metrics: FaceMetrics,
  profile: ReactiveLensProfile
) {
  if (!profile.eyeReaction || !profile.blinkStrength) return;

  const eyeDistance = Math.max(geometry.rightEye.x - geometry.leftEye.x, geometry.faceWidth * 0.25);
  const blinks = [metrics.expressions.eyeBlinkLeft, metrics.expressions.eyeBlinkRight];
  const eyes = [geometry.leftEye, geometry.rightEye];

  ctx.save();

  for (let i = 0; i < 2; i += 1) {
    const blink = clamp01(blinks[i]);
    const activation = profile.blinkStrength * (0.22 + blink * 0.78);
    const eye = eyes[i];

    if (profile.eyeReaction === 'shadow') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(0,0,0,${0.08 + activation * 0.22})`;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = eyeDistance * 0.08;
    } else {
      ctx.globalCompositeOperation = 'screen';
      const color = profile.eyeReaction === 'ember'
        ? '255,112,44'
        : profile.eyeReaction === 'swamp'
          ? '118,238,118'
          : '255,194,112';
      ctx.fillStyle = `rgba(${color},${0.035 + activation * 0.12})`;
      ctx.shadowColor = `rgba(${color},0.7)`;
      ctx.shadowBlur = eyeDistance * 0.12;
    }

    ctx.beginPath();
    ctx.ellipse(
      eye.x,
      eye.y,
      eyeDistance * 0.18,
      eyeDistance * (0.105 - blink * 0.025),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.restore();
}

function drawMouthReaction(
  ctx: CanvasRenderingContext2D,
  geometry: ReactiveLensGeometry,
  metrics: FaceMetrics,
  profile: ReactiveLensProfile
) {
  if (!profile.mouthReaction || !profile.mouthStrength) return;

  const jaw = clamp01(metrics.expressions.jawOpen);
  const smile = clamp01(metrics.expressions.mouthSmile);
  const widthSignal = clamp01(metrics.expressions.mouthWidth);
  const activation = clamp01(jaw * 0.78 + smile * 0.32 + widthSignal * 0.16);
  if (activation < 0.025) return;

  const mouthWidth = Math.max(
    Math.abs(geometry.mouthRight.x - geometry.mouthLeft.x),
    geometry.faceWidth * 0.22
  );
  const rx = mouthWidth * (0.56 + smile * 0.16);
  const ry = geometry.faceHeight * (0.025 + jaw * 0.035);
  const alpha = profile.mouthStrength * activation;

  ctx.save();

  if (profile.mouthReaction === 'shadow' || profile.mouthReaction === 'grin') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(8,0,0,${0.08 + alpha * 0.2})`;
    ctx.shadowColor = profile.mouthReaction === 'grin'
      ? 'rgba(120,10,10,0.55)'
      : 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = geometry.faceWidth * 0.045;
  } else {
    ctx.globalCompositeOperation = 'screen';
    const color = profile.mouthReaction === 'ember' ? '255,97,32' : '255,170,78';
    ctx.fillStyle = `rgba(${color},${0.035 + alpha * 0.11})`;
    ctx.shadowColor = `rgba(${color},0.62)`;
    ctx.shadowBlur = geometry.faceWidth * 0.05;
  }

  ctx.beginPath();
  ctx.ellipse(
    geometry.mouthCenter.x,
    geometry.mouthCenter.y + jaw * geometry.faceHeight * 0.012,
    rx,
    ry,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.restore();
}

export function renderReactiveLensBack(
  ctx: CanvasRenderingContext2D,
  id: ManifestationId,
  geometry: ReactiveLensGeometry,
  metrics: FaceMetrics,
  timeMs: number,
  reducedMotion: boolean
): void {
  const profile = LENS_PROFILES[id];
  if (!profile) return;

  drawAmbientPulse(ctx, id, geometry, metrics, profile, timeMs, reducedMotion);
  if (profile.particleStyle) {
    drawParticles(
      ctx,
      profile.particleStyle,
      geometry,
      profile.particleCount ?? 5,
      timeMs,
      reducedMotion
    );
  }
}

export function renderReactiveLensFront(
  ctx: CanvasRenderingContext2D,
  id: ManifestationId,
  geometry: ReactiveLensGeometry,
  metrics: FaceMetrics,
  reducedMotion: boolean
): void {
  const profile = LENS_PROFILES[id];
  if (!profile || reducedMotion) return;

  drawEyeReaction(ctx, geometry, metrics, profile);
  drawMouthReaction(ctx, geometry, metrics, profile);
}
