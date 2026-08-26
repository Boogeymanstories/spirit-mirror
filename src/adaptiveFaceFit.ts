import { AdaptiveFaceMetrics } from './types';

// Pass 12C4 deliberately permits only subtle corrections on top of the approved Pass 7 fit.
// The asymmetric limits favor coverage while preventing a broad or elongated caricature.
export const ADAPTIVE_LOWER_WIDTH_MIN = 0.96;
export const ADAPTIVE_LOWER_WIDTH_MAX = 1.12;
export const ADAPTIVE_LOWER_HEIGHT_MIN = 0.97;
export const ADAPTIVE_LOWER_HEIGHT_MAX = 1.07;

const WIDTH_FACTOR_DEADZONE = 0.012;
const HEIGHT_FACTOR_DEADZONE = 0.01;
const CANONICAL_JAW_TO_CHEEK = 0.82;
const CANONICAL_FACE_ASPECT = 1.34;
const COVERAGE_MARGIN_RATIO = 0.025;
const ADAPTIVE_FIT_EMA_ALPHA = 0.24;
const ADAPTIVE_JAW_DAMP_START = 0.22;
export const ADAPTIVE_JAW_FREEZE = 0.46;
const ADAPTIVE_JAW_DAMPED_ALPHA = 0.025;

export interface AdaptiveLowerFaceInput {
  isHalfMask: boolean;
  baselineX0: number;
  baselineX3: number;
  baselineY1: number;
  baselineY2: number;
  metrics: AdaptiveFaceMetrics;
  canvasWidth: number;
  canvasHeight: number;
}

export interface AdaptiveLowerFaceFit {
  widthScale: number;
  heightScale: number;
}

const NEUTRAL_ADAPTIVE_LOWER_FACE_FIT: AdaptiveLowerFaceFit = {
  widthScale: 1,
  heightScale: 1,
};

interface AdaptiveLowerFaceFitState {
  fit: AdaptiveLowerFaceFit;
  hasClosedBaseline: boolean;
  sampleId: number;
  sampleFit: AdaptiveLowerFaceFit;
}

const adaptiveLowerFaceFitByManifestation = new Map<string, AdaptiveLowerFaceFitState>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function adaptiveFitSmoothingAlpha(jawOpen: number): number {
  if (jawOpen >= ADAPTIVE_JAW_FREEZE) return 0;
  if (jawOpen <= ADAPTIVE_JAW_DAMP_START) return ADAPTIVE_FIT_EMA_ALPHA;

  const damping =
    (jawOpen - ADAPTIVE_JAW_DAMP_START) /
    (ADAPTIVE_JAW_FREEZE - ADAPTIVE_JAW_DAMP_START);
  return ADAPTIVE_FIT_EMA_ALPHA +
    (ADAPTIVE_JAW_DAMPED_ALPHA - ADAPTIVE_FIT_EMA_ALPHA) * damping;
}

export function stabilizeAdaptiveLowerFaceFit(
  manifestationId: string,
  desiredFit: AdaptiveLowerFaceFit,
  metrics: AdaptiveFaceMetrics,
  isHalfMask: boolean
): AdaptiveLowerFaceFit {
  if (isHalfMask) return NEUTRAL_ADAPTIVE_LOWER_FACE_FIT;

  const previous = adaptiveLowerFaceFitByManifestation.get(manifestationId);
  if (previous?.sampleId === metrics.sampleId) return previous.sampleFit;

  if (metrics.jawOpen >= ADAPTIVE_JAW_FREEZE) {
    const heldFit = previous?.hasClosedBaseline
      ? previous.fit
      : NEUTRAL_ADAPTIVE_LOWER_FACE_FIT;
    adaptiveLowerFaceFitByManifestation.set(manifestationId, {
      fit: heldFit,
      hasClosedBaseline: previous?.hasClosedBaseline ?? false,
      sampleId: metrics.sampleId,
      sampleFit: heldFit,
    });
    return heldFit;
  }

  const stabilizedFit = previous
    ? {
        widthScale:
          previous.fit.widthScale +
          (desiredFit.widthScale - previous.fit.widthScale) *
            adaptiveFitSmoothingAlpha(metrics.jawOpen),
        heightScale:
          previous.fit.heightScale +
          (desiredFit.heightScale - previous.fit.heightScale) *
            adaptiveFitSmoothingAlpha(metrics.jawOpen),
      }
    : desiredFit;

  adaptiveLowerFaceFitByManifestation.set(manifestationId, {
    fit: stabilizedFit,
    hasClosedBaseline: true,
    sampleId: metrics.sampleId,
    sampleFit: stabilizedFit,
  });
  return stabilizedFit;
}

export function resetAdaptiveLowerFaceFit(): void {
  adaptiveLowerFaceFitByManifestation.clear();
}

function withDeadzone(value: number, deadzone: number): number {
  return Math.abs(value - 1) <= deadzone ? 1 : value;
}

export function calculateAdaptiveLowerFaceFit({
  isHalfMask,
  baselineX0,
  baselineX3,
  baselineY1,
  baselineY2,
  metrics,
  canvasWidth,
  canvasHeight,
}: AdaptiveLowerFaceInput): AdaptiveLowerFaceFit {
  if (isHalfMask) return { widthScale: 1, heightScale: 1 };

  const cheekWidth = metrics.cheekWidth * canvasWidth;
  const jawAngleWidth = metrics.jawAngleWidth * canvasWidth;
  const lowerJawWidth = metrics.lowerJawWidth * canvasWidth;
  const foreheadChinHeight = metrics.foreheadChinHeight * canvasHeight;
  const baselineWidth = baselineX3 - baselineX0;
  const baselineLowerHeight = baselineY2 - baselineY1;

  if (
    !Number.isFinite(cheekWidth) ||
    !Number.isFinite(jawAngleWidth) ||
    !Number.isFinite(lowerJawWidth) ||
    !Number.isFinite(foreheadChinHeight) ||
    cheekWidth <= 1 ||
    baselineWidth <= 1 ||
    baselineLowerHeight <= 1
  ) {
    return { widthScale: 1, heightScale: 1 };
  }

  // Jaw-angle width carries most of the silhouette; the narrower lower-jaw pair receives a
  // modest anatomical compensation before the larger stable bound is selected.
  const trackedLowerWidth = Math.max(jawAngleWidth, lowerJawWidth * 1.12);
  const jawToCheek = trackedLowerWidth / cheekWidth;
  const shapeWidthScale = 1 + (jawToCheek - CANONICAL_JAW_TO_CHEEK) * 0.42;

  // Directly compare wearer bounds (+2.5% cheek margin) with the existing Pass 7 lower bounds.
  // This floor overrides aesthetic narrowing whenever either side would expose real skin.
  const requiredHalfWidth = trackedLowerWidth / 2 + cheekWidth * COVERAGE_MARGIN_RATIO;
  const baselineCenter = (baselineX0 + baselineX3) / 2;
  const leftSpan = Math.max(baselineCenter - baselineX0, 1);
  const rightSpan = Math.max(baselineX3 - baselineCenter, 1);
  const coverageWidthScale = Math.max(
    (baselineCenter + requiredHalfWidth) / leftSpan,
    (requiredHalfWidth - baselineCenter) / rightSpan
  );

  const widthScale = clamp(
    withDeadzone(Math.max(shapeWidthScale, coverageWidthScale), WIDTH_FACTOR_DEADZONE),
    ADAPTIVE_LOWER_WIDTH_MIN,
    ADAPTIVE_LOWER_WIDTH_MAX
  );

  const faceAspect = foreheadChinHeight / cheekWidth;
  const shapeHeightScale = 1 + (faceAspect / CANONICAL_FACE_ASPECT - 1) * 0.16;
  const requiredLowerHeight = foreheadChinHeight * 0.62 + cheekWidth * COVERAGE_MARGIN_RATIO;
  const coverageHeightScale = requiredLowerHeight / baselineLowerHeight;
  const heightScale = clamp(
    withDeadzone(Math.max(shapeHeightScale, coverageHeightScale), HEIGHT_FACTOR_DEADZONE),
    ADAPTIVE_LOWER_HEIGHT_MIN,
    ADAPTIVE_LOWER_HEIGHT_MAX
  );

  return { widthScale, heightScale };
}

// Correction starts below the eye line and eases toward the jaw/chin. At progress=0 every
// upper-face coordinate is exactly baseline; at progress=1 the bounded correction is complete.
export function lowerFaceCorrectionProgress(lowerRowProgress: number): number {
  const t = clamp((lowerRowProgress - 0.12) / 0.88, 0, 1);
  return t * t * (3 - 2 * t);
}
