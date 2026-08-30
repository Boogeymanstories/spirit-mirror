import { FaceMetrics, ManifestationId, Point2D } from '../types';
import { ARTWORK, MASK_ARTWORK, getLoadedImage } from '../assets/artwork';
import {
  getReactiveJawAdjustment,
  renderReactiveLensBack,
  renderReactiveLensFront,
} from './lensEngine';
import {
  calculateAdaptiveLowerFaceFit,
  lowerFaceCorrectionProgress,
  stabilizeAdaptiveLowerFaceFit,
} from '../adaptiveFaceFit';

type FitType = 'full-face' | 'half-mask';
type MaskEffectKind = 'ember' | 'candle' | 'swamp' | 'veil' | 'shadow';

interface MaskEffect {
  kind: MaskEffectKind;
  strength?: number;
}

interface MaskCalibration {
  imageUrl: string;
  leftEye: Point2D;
  rightEye: Point2D;
  fitType?: FitType;
  scaleX?: number;
  scaleY?: number;
  offsetX?: number;
  offsetY?: number;
  eyeScale?: number;
  alpha?: number;
  voidEyes?: boolean;
  effect?: MaskEffect;

  // Pass 7 lower-face tuning. These apply only to full-face masks.
  chinExtension?: number;
  jawWidthScale?: number;
  cheekWidthScale?: number;
  lowerCheekScale?: number;
  lowerFaceScaleY?: number;
  lowerFaceFeather?: number;
  chinShadowStrength?: number;
  mouthAware?: boolean;
  mouthResponse?: number;
}

const FULL_FACE_PROFILE = {
  scaleX: 1.07,
  scaleY: 1.04,
  offsetY: -0.025,
  chinExtension: 0.08,
  jawWidthScale: 1.055,
  cheekWidthScale: 1.0,
  lowerCheekScale: 1.035,
  lowerFaceScaleY: 1.055,
  lowerFaceFeather: 0.16,
  chinShadowStrength: 0.16,
};

const HALF_MASK_PROFILE = {
  scaleX: 1,
  scaleY: 1,
  offsetY: 0,
  chinExtension: 0,
  jawWidthScale: 1,
  cheekWidthScale: 1,
  lowerCheekScale: 1,
  lowerFaceScaleY: 1,
  lowerFaceFeather: 0,
  chinShadowStrength: 0,
};

const MASKS: Record<ManifestationId, MaskCalibration> = {
  hollow: {
    imageUrl: MASK_ARTWORK.hollow,
    leftEye: { x: 0.3267, y: 0.4658 },
    rightEye: { x: 0.673, y: 0.4661 },
    fitType: 'full-face',
    voidEyes: true,
    chinExtension: 0.11,
    jawWidthScale: 1.075,
    lowerFaceScaleY: 1.07,
    chinShadowStrength: 0.22,
    mouthAware: true,
    mouthResponse: 0.8,
    effect: { kind: 'shadow', strength: 1.0 },
  },
  veiled_one: {
    imageUrl: MASK_ARTWORK.veiled_one,
    leftEye: { x: 0.3731, y: 0.519 },
    rightEye: { x: 0.6283, y: 0.5194 },
    fitType: 'full-face',
    scaleX: 0.99,
    scaleY: 1,
    chinExtension: 0.055,
    jawWidthScale: 1.025,
    lowerFaceScaleY: 1.025,
    lowerFaceFeather: 0.12,
    chinShadowStrength: 0.11,
    effect: { kind: 'veil', strength: 0.5 },
  },
  grinning_guest: {
    imageUrl: MASK_ARTWORK.grinning_guest,
    leftEye: { x: 0.3158, y: 0.3854 },
    rightEye: { x: 0.6838, y: 0.3855 },
    fitType: 'full-face',
    scaleX: 1.03,
    scaleY: 1.01,
    chinExtension: 0.11,
    jawWidthScale: 1.085,
    lowerCheekScale: 1.055,
    lowerFaceScaleY: 1.075,
    chinShadowStrength: 0.19,
    mouthAware: true,
    mouthResponse: 1.0,
    effect: { kind: 'shadow', strength: 0.42 },
  },
  bone_saint: {
    imageUrl: MASK_ARTWORK.bone_saint,
    leftEye: { x: 0.361, y: 0.537 },
    rightEye: { x: 0.6398, y: 0.5362 },
    fitType: 'full-face',
    scaleX: 1.01,
    chinExtension: 0.115,
    jawWidthScale: 1.09,
    lowerCheekScale: 1.055,
    lowerFaceScaleY: 1.075,
    chinShadowStrength: 0.21,
    mouthAware: true,
    mouthResponse: 0.65,
  },
  thorn_crown: {
    imageUrl: MASK_ARTWORK.thorn_crown,
    leftEye: { x: 0.339, y: 0.4844 },
    rightEye: { x: 0.665, y: 0.4841 },
    fitType: 'full-face',
    scaleY: 1.02,
    chinExtension: 0.075,
    jawWidthScale: 1.05,
    lowerFaceScaleY: 1.05,
    chinShadowStrength: 0.14,
  },
  moss_crowned_swamp_demon: {
    imageUrl: MASK_ARTWORK.moss_crowned_swamp_demon,
    leftEye: { x: 0.3474, y: 0.518 },
    rightEye: { x: 0.6531, y: 0.5182 },
    fitType: 'full-face',
    scaleX: 1.015,
    chinExtension: 0.105,
    jawWidthScale: 1.075,
    lowerCheekScale: 1.05,
    lowerFaceScaleY: 1.07,
    chinShadowStrength: 0.2,
    effect: { kind: 'swamp', strength: 0.9 },
  },
  plague_baron: {
    imageUrl: MASK_ARTWORK.plague_baron,
    leftEye: { x: 0.3557, y: 0.3931 },
    rightEye: { x: 0.6436, y: 0.3931 },
    fitType: 'half-mask',
    eyeScale: 0.99,
  },
  wax_prophet: {
    imageUrl: MASK_ARTWORK.wax_prophet,
    leftEye: { x: 0.348, y: 0.5277 },
    rightEye: { x: 0.6524, y: 0.5276 },
    fitType: 'full-face',
    scaleY: 0.99,
    chinExtension: 0.12,
    jawWidthScale: 1.07,
    lowerFaceScaleY: 1.08,
    chinShadowStrength: 0.18,
    mouthAware: true,
    mouthResponse: 0.55,
    effect: { kind: 'candle', strength: 1.05 },
  },
  raven_priest: {
    imageUrl: MASK_ARTWORK.raven_priest,
    leftEye: { x: 0.3511, y: 0.5268 },
    rightEye: { x: 0.6498, y: 0.5268 },
    fitType: 'half-mask',
    effect: { kind: 'shadow', strength: 0.45 },
  },
  ashen_king: {
    imageUrl: MASK_ARTWORK.ashen_king,
    leftEye: { x: 0.3459, y: 0.5263 },
    rightEye: { x: 0.6539, y: 0.5263 },
    fitType: 'full-face',
    scaleX: 1.02,
    chinExtension: 0.115,
    jawWidthScale: 1.085,
    lowerCheekScale: 1.05,
    lowerFaceScaleY: 1.075,
    chinShadowStrength: 0.22,
    effect: { kind: 'ember', strength: 1.08 },
  },
  drowned_mariner: {
    imageUrl: MASK_ARTWORK.drowned_mariner,
    leftEye: { x: 0.3549, y: 0.5296 },
    rightEye: { x: 0.6457, y: 0.5299 },
    fitType: 'full-face',
    scaleY: 0.985,
    offsetY: -0.005,
    chinExtension: 0.12,
    jawWidthScale: 1.075,
    lowerFaceScaleY: 1.08,
    chinShadowStrength: 0.2,
  },
  porcelain_widow: {
    imageUrl: MASK_ARTWORK.porcelain_widow,
    leftEye: { x: 0.3169, y: 0.4968 },
    rightEye: { x: 0.6779, y: 0.4969 },
    fitType: 'full-face',
    chinExtension: 0.09,
    jawWidthScale: 1.06,
    lowerFaceScaleY: 1.06,
    chinShadowStrength: 0.16,
  },
  starborn_entity: {
    imageUrl: MASK_ARTWORK.starborn_entity,
    leftEye: { x: 0.3402, y: 0.506 },
    rightEye: { x: 0.6595, y: 0.506 },
    fitType: 'full-face',
    chinExtension: 0.095,
    jawWidthScale: 1.065,
    lowerFaceScaleY: 1.06,
    chinShadowStrength: 0.18,
  },
  scarecrow_king: {
    imageUrl: MASK_ARTWORK.scarecrow_king,
    leftEye: { x: 0.3393, y: 0.5327 },
    rightEye: { x: 0.6709, y: 0.5326 },
    fitType: 'full-face',
    scaleY: 1.01,
    chinExtension: 0.105,
    jawWidthScale: 1.075,
    lowerFaceScaleY: 1.07,
    chinShadowStrength: 0.19,
  },
  crypt_hound: {
    imageUrl: MASK_ARTWORK.crypt_hound,
    leftEye: { x: 0.3447, y: 0.5545 },
    rightEye: { x: 0.6556, y: 0.5544 },
    fitType: 'full-face',
    scaleX: 1.02,
    scaleY: 1.01,
    chinExtension: 0.12,
    jawWidthScale: 1.09,
    lowerCheekScale: 1.055,
    lowerFaceScaleY: 1.08,
    chinShadowStrength: 0.21,
  },
  vampire_magistrate: {
    imageUrl: MASK_ARTWORK.vampire_magistrate,
    leftEye: { x: 0.3467, y: 0.4633 },
    rightEye: { x: 0.6559, y: 0.4636 },
    fitType: 'full-face',
    chinExtension: 0.095,
    jawWidthScale: 1.065,
    lowerFaceScaleY: 1.065,
    chinShadowStrength: 0.17,
  },
  lantern_witch: {
    imageUrl: MASK_ARTWORK.lantern_witch,
    leftEye: { x: 0.3588, y: 0.5034 },
    rightEye: { x: 0.6438, y: 0.5024 },
    fitType: 'full-face',
    scaleY: 1.01,
    chinExtension: 0.1,
    jawWidthScale: 1.07,
    lowerFaceScaleY: 1.07,
    chinShadowStrength: 0.18,
  },
  hive_matriarch: {
    imageUrl: MASK_ARTWORK.hive_matriarch,
    leftEye: { x: 0.3343, y: 0.549 },
    rightEye: { x: 0.665, y: 0.549 },
    fitType: 'full-face',
    chinExtension: 0.1,
    jawWidthScale: 1.07,
    lowerFaceScaleY: 1.07,
    chinShadowStrength: 0.18,
    effect: { kind: 'ember', strength: 0.42 },
  },
  shadow_jackal: {
    imageUrl: MASK_ARTWORK.shadow_jackal,
    leftEye: { x: 0.3426, y: 0.5745 },
    rightEye: { x: 0.6574, y: 0.5745 },
    fitType: 'half-mask',
  },
  ragged_specter: {
    imageUrl: MASK_ARTWORK.ragged_specter,
    leftEye: { x: 0.348, y: 0.4948 },
    rightEye: { x: 0.6579, y: 0.4944 },
    fitType: 'full-face',
    chinExtension: 0.11,
    jawWidthScale: 1.075,
    lowerFaceScaleY: 1.075,
    chinShadowStrength: 0.19,
    effect: { kind: 'veil', strength: 0.38 },
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function drawVoidEyes(
  ctx: CanvasRenderingContext2D,
  leftEye: Point2D,
  rightEye: Point2D,
  eyeDistance: number,
  roll: number
) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
  ctx.shadowColor = 'rgba(0,0,0,0.98)';
  ctx.shadowBlur = eyeDistance * 0.12;
  for (const eye of [leftEye, rightEye]) {
    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y, eyeDistance * 0.235, eyeDistance * 0.145, roll, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLowerAttachmentShadow(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x3: number,
  y1: number,
  y2: number,
  feather: number,
  strength: number
) {
  if (strength <= 0 || feather <= 0) return;

  const maskWidth = Math.max(x3 - x0, 1);
  const lowerHeight = Math.max(y2 - y1, 1);
  const radius = maskWidth * (0.48 + feather * 0.2);
  const centerY = y1 + lowerHeight * 0.72;

  ctx.save();
  ctx.translate((x0 + x3) / 2, centerY);
  ctx.scale(1, 0.62);

  const gradient = ctx.createRadialGradient(0, 0, radius * 0.18, 0, 0, radius);
  gradient.addColorStop(0, `rgba(5,4,4,${strength * 0.78})`);
  gradient.addColorStop(0.54, `rgba(7,5,5,${strength * 0.56})`);
  gradient.addColorStop(0.82, `rgba(9,6,6,${strength * 0.22})`);
  gradient.addColorStop(1, 'rgba(9,6,6,0)');

  ctx.fillStyle = gradient;
  const shadowPath = new Path2D();
  shadowPath.ellipse(0, 0, radius, radius, 0, 0, Math.PI * 2);
  ctx.fill(shadowPath);
  ctx.restore();
}

function renderMaskEffect(
  ctx: CanvasRenderingContext2D,
  effect: MaskEffect | undefined,
  bounds: { x0: number; x3: number; y0: number; y2: number; eyeMidY: number },
  timeMs: number,
  reducedMotion: boolean
) {
  if (!effect) return;

  const width = bounds.x3 - bounds.x0;
  const height = bounds.y2 - bounds.y0;
  const t = reducedMotion ? 0.5 : (Math.sin(timeMs * 0.0035) + 1) / 2;
  const drift = reducedMotion ? 0 : Math.sin(timeMs * 0.0017) * width * 0.02;
  const strength = effect.strength ?? 1;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  switch (effect.kind) {
    case 'ember': {
      const grad = ctx.createRadialGradient(
        0,
        bounds.eyeMidY - height * 0.08,
        width * 0.08,
        0,
        bounds.eyeMidY - height * 0.08,
        width * 0.55
      );
      grad.addColorStop(0, `rgba(255,185,70,${0.12 + t * 0.1 * strength})`);
      grad.addColorStop(0.35, `rgba(255,105,35,${0.08 + t * 0.08 * strength})`);
      grad.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(bounds.x0, bounds.y0, width, height);
      break;
    }
    case 'candle': {
      const band = ctx.createLinearGradient(0, bounds.y0, 0, bounds.eyeMidY);
      band.addColorStop(0, `rgba(255,214,145,${0.13 + t * 0.1 * strength})`);
      band.addColorStop(0.5, `rgba(255,171,70,${0.08 + t * 0.07 * strength})`);
      band.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = band;
      ctx.fillRect(bounds.x0, bounds.y0, width, height * 0.55);
      break;
    }
    case 'swamp': {
      const grad = ctx.createRadialGradient(
        drift,
        bounds.eyeMidY - height * 0.05,
        width * 0.05,
        drift,
        bounds.eyeMidY - height * 0.05,
        width * 0.5
      );
      grad.addColorStop(0, `rgba(128,255,145,${0.1 + t * 0.1 * strength})`);
      grad.addColorStop(0.45, `rgba(81,184,92,${0.08 + t * 0.06 * strength})`);
      grad.addColorStop(1, 'rgba(40,90,46,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(bounds.x0, bounds.y0, width, height);
      break;
    }
    case 'veil': {
      const band = ctx.createLinearGradient(bounds.x0, bounds.y0, bounds.x3, bounds.y2);
      band.addColorStop(0, `rgba(255,255,255,${0.02 + t * 0.02 * strength})`);
      band.addColorStop(0.5, `rgba(220,220,235,${0.03 + t * 0.03 * strength})`);
      band.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = band;
      ctx.fillRect(bounds.x0, bounds.y0, width, height);
      break;
    }
    case 'shadow': {
      const grad = ctx.createRadialGradient(
        0,
        bounds.eyeMidY,
        width * 0.1,
        0,
        bounds.eyeMidY,
        width * 0.58
      );
      grad.addColorStop(0, `rgba(20,20,30,${0.06 + t * 0.05 * strength})`);
      grad.addColorStop(1, 'rgba(20,20,30,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(bounds.x0, bounds.y0, width, height);
      break;
    }
  }

  ctx.restore();
}

function drawFaceMappedMask(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  manifestationId: ManifestationId,
  calibration: MaskCalibration,
  timeMs: number,
  reducedMotion: boolean
) {
  const img = getLoadedImage(calibration.imageUrl);
  if (!img || !metrics.detected) return;

  const isHalfMask = calibration.fitType === 'half-mask';
  const profile = isHalfMask ? HALF_MASK_PROFILE : FULL_FACE_PROFILE;

  const trackedLeftEye = { x: metrics.leftEye.x * width, y: metrics.leftEye.y * height };
  const trackedRightEye = { x: metrics.rightEye.x * width, y: metrics.rightEye.y * height };
  const targetEyeMid = {
    x: (trackedLeftEye.x + trackedRightEye.x) / 2,
    y: (trackedLeftEye.y + trackedRightEye.y) / 2,
  };
  const eyeScale = calibration.eyeScale ?? 1;
  const targetEyeDistance = Math.max(distance(trackedLeftEye, trackedRightEye) * eyeScale, 18);
  const roll = Math.atan2(
    trackedRightEye.y - trackedLeftEye.y,
    trackedRightEye.x - trackedLeftEye.x
  );

  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const artLeftEye = { x: calibration.leftEye.x * imgW, y: calibration.leftEye.y * imgH };
  const artRightEye = { x: calibration.rightEye.x * imgW, y: calibration.rightEye.y * imgH };
  const artEyeMid = {
    x: (artLeftEye.x + artRightEye.x) / 2,
    y: (artLeftEye.y + artRightEye.y) / 2,
  };
  const artEyeDistance = Math.max(distance(artLeftEye, artRightEye), 1);

  const baseScale = targetEyeDistance / artEyeDistance;
  const cos = Math.cos(-roll);
  const sin = Math.sin(-roll);
  const toLocal = (point: Point2D) => {
    const dx = point.x * width - targetEyeMid.x;
    const dy = point.y * height - targetEyeMid.y;
    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos,
    };
  };

  const leftCheekLocal = toLocal(metrics.leftCheek);
  const rightCheekLocal = toLocal(metrics.rightCheek);
  const foreheadLocal = toLocal(metrics.forehead);
  const chinLocal = toLocal(metrics.chin);
  const mouthTopLocal = toLocal(metrics.mouthTop);
  const mouthBottomLocal = toLocal(metrics.mouthBottom);
  const mouthCenterLocal = toLocal(metrics.mouthCenter);
  const mouthLeftLocal = toLocal(metrics.mouthLeft);
  const mouthRightLocal = toLocal(metrics.mouthRight);
  const leftEyeLocal = toLocal(metrics.leftEye);
  const rightEyeLocal = toLocal(metrics.rightEye);

  const faceLeft = Math.min(leftCheekLocal.x, rightCheekLocal.x);
  const faceRight = Math.max(leftCheekLocal.x, rightCheekLocal.x);
  const faceTop = Math.min(foreheadLocal.y, chinLocal.y);
  const faceBottom = Math.max(foreheadLocal.y, chinLocal.y);
  const faceWidth = Math.max(faceRight - faceLeft, targetEyeDistance * 1.8);
  const faceHeight = Math.max(faceBottom - faceTop, targetEyeDistance * 2.2);

  const sourceLeftSpan = artLeftEye.x;
  const sourceRightSpan = imgW - artRightEye.x;
  const sourceTopSpan = artEyeMid.y;
  const sourceBottomSpan = imgH - artEyeMid.y;

  const x1 = -targetEyeDistance / 2;
  const x2 = targetEyeDistance / 2;
  const minOuterBoostX = 1.31;
  const minTopBoost = 1.14;
  const minBottomBoost = 1.27;

  const lowerCheekScale = isHalfMask
    ? 1
    : calibration.lowerCheekScale ?? profile.lowerCheekScale;
  const cheekPadding = 0.1 * lowerCheekScale;

  const rawX0 = Math.min(
    x1 - sourceLeftSpan * baseScale * minOuterBoostX,
    faceLeft - faceWidth * cheekPadding
  );
  const rawX3 = Math.max(
    x2 + sourceRightSpan * baseScale * minOuterBoostX,
    faceRight + faceWidth * cheekPadding
  );

  const baseY0 = -sourceTopSpan * baseScale * minTopBoost;
  const baseY2 = sourceBottomSpan * baseScale * minBottomBoost;
  const rawY0 = Math.min(baseY0, faceTop - faceHeight * 0.13);
  const rawY1 = 0;
  const rawY2 = Math.max(baseY2, faceBottom + faceHeight * 0.08);

  const fitScaleX = profile.scaleX * (calibration.scaleX ?? 1);
  const fitScaleY = profile.scaleY * (calibration.scaleY ?? 1);
  const offsetXPx = faceWidth * (calibration.offsetX ?? 0);
  const offsetYPx = faceHeight * (profile.offsetY + (calibration.offsetY ?? 0));
  const sideBoost = (faceWidth * (fitScaleX - 1)) / 2;
  const heightBoost = faceHeight * (fitScaleY - 1);
  const extraTop = heightBoost * 0.62;
  const extraBottom = heightBoost * 0.38;

  const jawWidthScale = isHalfMask
    ? 1
    : calibration.jawWidthScale ?? profile.jawWidthScale;
  const jawSideBoost = (faceWidth * (jawWidthScale - 1)) / 2;
  const cheekWidthScale = isHalfMask
    ? 1
    : calibration.cheekWidthScale ?? profile.cheekWidthScale;
  const cheekSideBoost = (faceWidth * (cheekWidthScale - 1)) / 2;

  const lowerFaceScaleY = isHalfMask
    ? 1
    : calibration.lowerFaceScaleY ?? profile.lowerFaceScaleY;
  const lowerFaceHeightBoost = faceHeight * (lowerFaceScaleY - 1);

  const chinExtension = isHalfMask
    ? 0
    : calibration.chinExtension ?? profile.chinExtension;

  let mouthActivation = 0;
  if (!isHalfMask && calibration.mouthAware) {
    const mouthGap = Math.hypot(
      mouthBottomLocal.x - mouthTopLocal.x,
      mouthBottomLocal.y - mouthTopLocal.y
    );
    const mouthRatio = mouthGap / Math.max(targetEyeDistance, 1);
    mouthActivation = clamp((mouthRatio - 0.055) / 0.18, 0, 1);
  }

  const mouthResponse = calibration.mouthResponse ?? 1;
  const mouthBottomBoost = faceHeight * 0.028 * mouthActivation * mouthResponse;
  const mouthJawBoost = faceWidth * 0.01 * mouthActivation * mouthResponse;
  const reactiveJaw = getReactiveJawAdjustment(
    manifestationId,
    metrics,
    faceWidth,
    faceHeight,
    reducedMotion
  );

  // Keep an explicit Pass 7 baseline for adaptive comparison. Mouth/Lens additions remain
  // unchanged and are applied after the bounded correction, exactly as before this pass.
  const pass7X0 = rawX0 - sideBoost - jawSideBoost - cheekSideBoost + offsetXPx;
  const pass7X3 = rawX3 + sideBoost + jawSideBoost + cheekSideBoost + offsetXPx;
  const y0 = rawY0 - extraTop + offsetYPx;
  const y1 = rawY1 + offsetYPx;
  const pass7Y2 =
    rawY2 +
    extraBottom +
    lowerFaceHeightBoost +
    faceHeight * chinExtension +
    offsetYPx;

  const desiredAdaptiveFit = calculateAdaptiveLowerFaceFit({
    isHalfMask,
    baselineX0: pass7X0,
    baselineX3: pass7X3,
    baselineY1: y1,
    baselineY2: pass7Y2,
    metrics: metrics.adaptiveFit,
    canvasWidth: width,
    canvasHeight: height,
  });
  const adaptiveFit = stabilizeAdaptiveLowerFaceFit(
    manifestationId,
    desiredAdaptiveFit,
    metrics.adaptiveFit,
    isHalfMask
  );
  const pass7CenterX = (pass7X0 + pass7X3) / 2;
  const adaptiveLeftDelta = (pass7X0 - pass7CenterX) * (adaptiveFit.widthScale - 1);
  const adaptiveRightDelta = (pass7X3 - pass7CenterX) * (adaptiveFit.widthScale - 1);
  const adaptiveHeightDelta = (pass7Y2 - y1) * (adaptiveFit.heightScale - 1);

  const x0 = pass7X0 - mouthJawBoost - reactiveJaw.xBoost;
  const adjX1 = x1 + offsetXPx;
  const adjX2 = x2 + offsetXPx;
  const x3 = pass7X3 + mouthJawBoost + reactiveJaw.xBoost;
  const y2 = pass7Y2 + mouthBottomBoost + reactiveJaw.yBoost;
  const lowerX0 = x0 + adaptiveLeftDelta;
  const lowerX3 = x3 + adaptiveRightDelta;
  const lowerY2 = y2 + adaptiveHeightDelta;

  if (calibration.voidEyes) {
    drawVoidEyes(ctx, trackedLeftEye, trackedRightEye, targetEyeDistance, roll);
  }

  ctx.save();
  ctx.translate(targetEyeMid.x, targetEyeMid.y);
  ctx.rotate(roll);

  if (!isHalfMask) {
    drawLowerAttachmentShadow(
      ctx,
      lowerX0,
      lowerX3,
      y1,
      lowerY2,
      calibration.lowerFaceFeather ?? profile.lowerFaceFeather,
      calibration.chinShadowStrength ?? profile.chinShadowStrength
    );
  }

  const reactiveGeometry = {
    x0,
    x3,
    y0,
    y1,
    y2,
    leftEye: leftEyeLocal,
    rightEye: rightEyeLocal,
    mouthCenter: mouthCenterLocal,
    mouthLeft: mouthLeftLocal,
    mouthRight: mouthRightLocal,
    faceWidth,
    faceHeight,
  };

  renderReactiveLensBack(
    ctx,
    manifestationId,
    reactiveGeometry,
    metrics,
    timeMs,
    reducedMotion
  );

  ctx.globalAlpha = calibration.alpha ?? 1;
  ctx.globalCompositeOperation = 'source-over';

  const sx = [0, artLeftEye.x, artRightEye.x, imgW];
  const STRIP_OVERLAP = 0.5;
  const drawMappedStrip = (
    sourceY: number,
    sourceHeight: number,
    destY: number,
    destHeight: number,
    outerLeft: number,
    outerRight: number
  ) => {
    const dx = [outerLeft, adjX1, adjX2, outerRight];
    for (let col = 0; col < 3; col += 1) {
      const sourceW = sx[col + 1] - sx[col];
      let destW = dx[col + 1] - dx[col];
      let destX = dx[col];
      if (sourceW <= 0 || sourceHeight <= 0 || destW <= 0 || destHeight <= 0) continue;
      if (col < 2) destW += STRIP_OVERLAP;
      if (col > 0) destX -= STRIP_OVERLAP;
      ctx.drawImage(
        img,
        sx[col],
        sourceY,
        sourceW,
        sourceHeight,
        destX,
        destY,
        destW,
        destHeight
      );
    }
  };

  // The complete upper row retains the exact Pass 7 destination coordinates.
  drawMappedStrip(0, artEyeMid.y, y0, y1 - y0, x0, x3);

  if (adaptiveFit.widthScale === 1 && adaptiveFit.heightScale === 1) {
    drawMappedStrip(artEyeMid.y, imgH - artEyeMid.y, y1, y2 - y1, x0, x3);
  } else {
    // Twelve lower-only strips make correction progressive without moving eye anchors, the
    // central nose/mouth column, forehead, top edge, or any upper-face coordinate.
    const lowerBands = 12;
    const sourceLowerHeight = imgH - artEyeMid.y;
    const destLowerHeight = lowerY2 - y1;
    const bandOverlap = 0.5;
    for (let band = 0; band < lowerBands; band += 1) {
      const start = band / lowerBands;
      const end = (band + 1) / lowerBands;
      const progress = lowerFaceCorrectionProgress((start + end) / 2);
      const srcOverlap = band > 0 ? bandOverlap : 0;
      const dstOverlap = band > 0 ? bandOverlap : 0;
      drawMappedStrip(
        artEyeMid.y + sourceLowerHeight * start,
        sourceLowerHeight * (end - start) + srcOverlap,
        y1 + destLowerHeight * start,
        destLowerHeight * (end - start) + dstOverlap,
        x0 + adaptiveLeftDelta * progress,
        x3 + adaptiveRightDelta * progress
      );
    }
  }

  renderMaskEffect(
    ctx,
    calibration.effect,
    { x0, x3, y0, y2, eyeMidY: y1 },
    timeMs,
    reducedMotion
  );

  renderReactiveLensFront(
    ctx,
    manifestationId,
    reactiveGeometry,
    metrics,
    reducedMotion
  );

  ctx.restore();
}

export function renderManifestationOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FaceMetrics,
  manifestationId: ManifestationId,
  timeMs: number,
  reducedMotion: boolean
) {
  if (!metrics.detected) return;
  drawFaceMappedMask(
    ctx,
    width,
    height,
    metrics,
    manifestationId,
    MASKS[manifestationId],
    timeMs,
    reducedMotion
  );
}

export function renderAgedGlassOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  reducedMotion: boolean
) {
  const crackedImg = getLoadedImage(ARTWORK.crackedOverlay);

  ctx.save();

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.46,
    width * 0.14,
    width * 0.5,
    height * 0.5,
    width * 0.76
  );
  vignette.addColorStop(0, 'rgba(255,255,255,0.00)');
  vignette.addColorStop(0.62, 'rgba(0,0,0,0.03)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  const drift = reducedMotion ? 0 : Math.sin(timeMs * 0.0007) * width * 0.035;
  const sheen = ctx.createLinearGradient(
    width * 0.18 + drift,
    0,
    width * 0.34 + drift,
    height
  );
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0.045)');
  sheen.addColorStop(0.6, 'rgba(255,255,255,0.018)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, width, height);

  const sheenTwo = ctx.createLinearGradient(
    width * 0.72 - drift,
    0,
    width * 0.86 - drift,
    height
  );
  sheenTwo.addColorStop(0, 'rgba(255,255,255,0)');
  sheenTwo.addColorStop(0.35, 'rgba(255,255,255,0.02)');
  sheenTwo.addColorStop(0.65, 'rgba(255,255,255,0.045)');
  sheenTwo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheenTwo;
  ctx.fillRect(0, 0, width, height);

  if (crackedImg) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.055;
    ctx.drawImage(crackedImg, 0, 0, width, height);
  }

  const haze = ctx.createLinearGradient(0, 0, 0, height);
  haze.addColorStop(0, 'rgba(255,255,255,0.028)');
  haze.addColorStop(0.18, 'rgba(255,255,255,0.012)');
  haze.addColorStop(0.5, 'rgba(255,255,255,0)');
  haze.addColorStop(1, 'rgba(0,0,0,0.055)');
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 1;
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}
