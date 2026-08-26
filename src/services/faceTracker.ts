import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { FaceExpressions, FaceMetrics, Point2D } from '../types';
import { adaptiveFitSmoothingAlpha, resetAdaptiveLowerFaceFit } from '../adaptiveFaceFit';

let faceLandmarkerInstance: FaceLandmarker | null = null;
let faceLandmarkerInitialization: Promise<FaceLandmarker | null> | null = null;
let faceLandmarkerEpoch = 0;
let smoothedMetrics: FaceMetrics | null = null;

const EMA_ALPHA_POS = 0.28;
const EMA_ALPHA_SCALE = 0.24;
const EMA_ALPHA_EXPRESSION = 0.36;
const POSITION_DEADZONE = 0.0018;
const SCALE_DEADZONE = 0.002;
const EXPRESSION_DEADZONE = 0.012;
const ADAPTIVE_FIT_DEADZONE = 0.0025;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function screenX(x: number, mirrored: boolean): number {
  return mirrored ? 1.0 - x : x;
}

function copyLandmarkPoint(
  landmarks: readonly Point2D[],
  index: number,
  mirrored: boolean,
  fallbackIndex = index
): Point2D {
  const point = landmarks[index] || landmarks[fallbackIndex];
  return { x: screenX(point.x, mirrored), y: point.y };
}

function smoothPoint(curr: Point2D, prev: Point2D | undefined, alpha: number): Point2D {
  if (!prev) return curr;
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  if (Math.hypot(dx, dy) <= POSITION_DEADZONE) return prev;
  return {
    x: prev.x + alpha * dx,
    y: prev.y + alpha * dy,
  };
}

function smoothScalar(curr: number, prev: number | undefined, alpha: number, deadzone = 0): number {
  if (prev === undefined) return curr;
  const diff = curr - prev;
  if (Math.abs(diff) <= deadzone) return prev;
  return prev + alpha * diff;
}

function smoothAdaptiveScalar(curr: number, prev: number | undefined, jawOpen: number): number {
  if (prev === undefined) return curr;
  return smoothScalar(
    curr,
    prev,
    adaptiveFitSmoothingAlpha(jawOpen),
    ADAPTIVE_FIT_DEADZONE
  );
}

function smoothExpressions(curr: FaceExpressions, prev?: FaceExpressions): FaceExpressions {
  if (!prev) return curr;
  return {
    jawOpen: smoothScalar(curr.jawOpen, prev.jawOpen, EMA_ALPHA_EXPRESSION, EXPRESSION_DEADZONE),
    mouthSmile: smoothScalar(curr.mouthSmile, prev.mouthSmile, EMA_ALPHA_EXPRESSION, EXPRESSION_DEADZONE),
    mouthWidth: smoothScalar(curr.mouthWidth, prev.mouthWidth, EMA_ALPHA_EXPRESSION, EXPRESSION_DEADZONE),
    eyeBlinkLeft: smoothScalar(curr.eyeBlinkLeft, prev.eyeBlinkLeft, EMA_ALPHA_EXPRESSION, EXPRESSION_DEADZONE),
    eyeBlinkRight: smoothScalar(curr.eyeBlinkRight, prev.eyeBlinkRight, EMA_ALPHA_EXPRESSION, EXPRESSION_DEADZONE),
  };
}

function emptyExpressions(): FaceExpressions {
  return {
    jawOpen: 0,
    mouthSmile: 0,
    mouthWidth: 0,
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
  };
}

function closeFaceLandmarker(instance: FaceLandmarker): void {
  try {
    instance.close();
  } catch {
    // Ignore cleanup error.
  }
}

async function initializeFaceLandmarker(epoch: number): Promise<FaceLandmarker | null> {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
    );

    if (epoch !== faceLandmarkerEpoch) return null;

    const options = {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU' as const,
      },
      outputFaceBlendshapes: true,
      runningMode: 'VIDEO' as const,
      numFaces: 1,
    };

    let instance: FaceLandmarker;

    try {
      instance = await FaceLandmarker.createFromOptions(vision, options);
    } catch (gpuError) {
      if (epoch !== faceLandmarkerEpoch) return null;

      try {
        instance = await FaceLandmarker.createFromOptions(vision, {
          ...options,
          baseOptions: {
            ...options.baseOptions,
            delegate: 'CPU',
          },
        });
      } catch (cpuError) {
        if (epoch !== faceLandmarkerEpoch) return null;
        console.warn('FaceLandmarker initialization status:', cpuError ?? gpuError);
        return null;
      }
    }

    if (epoch !== faceLandmarkerEpoch) {
      closeFaceLandmarker(instance);
      return null;
    }

    faceLandmarkerInstance = instance;
    return instance;
  } catch (err) {
    if (epoch !== faceLandmarkerEpoch) return null;
    console.warn('FaceLandmarker initialization status:', err);
    return null;
  }
}

export function getFaceLandmarker(): Promise<FaceLandmarker | null> {
  if (faceLandmarkerInstance) {
    return Promise.resolve(faceLandmarkerInstance);
  }

  if (faceLandmarkerInitialization) {
    return faceLandmarkerInitialization;
  }

  const initializationEpoch = faceLandmarkerEpoch;
  let sharedInitialization: Promise<FaceLandmarker | null>;

  sharedInitialization = initializeFaceLandmarker(initializationEpoch).finally(() => {
    if (faceLandmarkerInitialization === sharedInitialization) {
      faceLandmarkerInitialization = null;
    }
  });

  faceLandmarkerInitialization = sharedInitialization;
  return sharedInitialization;
}

let lastProcessedTimestamp = 0;

export function processVideoFrame(
  landmarker: FaceLandmarker | null,
  videoElement: HTMLVideoElement,
  timestampMs: number,
  mirrored = true
): FaceMetrics {
  if (!landmarker || videoElement.readyState < 2) {
    return smoothedMetrics || createEmptyMetrics();
  }

  const safeTimestamp = timestampMs > lastProcessedTimestamp ? timestampMs : lastProcessedTimestamp + 1;
  lastProcessedTimestamp = safeTimestamp;

  try {
    const results = landmarker.detectForVideo(videoElement, safeTimestamp);

    if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
      if (smoothedMetrics) {
        smoothedMetrics = {
          ...smoothedMetrics,
          detected: false,
        };
        return smoothedMetrics;
      }
      return createEmptyMetrics();
    }

    const rawLandmarks = results.faceLandmarks[0];

    const ptScreenLeftEyeOuter = mirrored
      ? (rawLandmarks[263] || rawLandmarks[359])
      : (rawLandmarks[33] || rawLandmarks[130]);
    const ptScreenLeftEyeInner = mirrored ? rawLandmarks[362] : rawLandmarks[133];
    const ptScreenRightEyeOuter = mirrored
      ? (rawLandmarks[33] || rawLandmarks[130])
      : (rawLandmarks[263] || rawLandmarks[359]);
    const ptScreenRightEyeInner = mirrored ? rawLandmarks[133] : rawLandmarks[362];

    const leftEyeRaw: Point2D = {
      x:
        (screenX(ptScreenLeftEyeOuter.x, mirrored) +
          screenX(ptScreenLeftEyeInner.x, mirrored)) /
        2,
      y: (ptScreenLeftEyeOuter.y + ptScreenLeftEyeInner.y) / 2,
    };

    const rightEyeRaw: Point2D = {
      x:
        (screenX(ptScreenRightEyeOuter.x, mirrored) +
          screenX(ptScreenRightEyeInner.x, mirrored)) /
        2,
      y: (ptScreenRightEyeOuter.y + ptScreenRightEyeInner.y) / 2,
    };

    const foreheadRaw = copyLandmarkPoint(rawLandmarks, 10, mirrored, 151);
    const chinRaw = copyLandmarkPoint(rawLandmarks, 152, mirrored, 199);
    const mouthLeftRaw = copyLandmarkPoint(rawLandmarks, mirrored ? 291 : 61, mirrored);
    const mouthRightRaw = copyLandmarkPoint(rawLandmarks, mirrored ? 61 : 291, mirrored);
    const mouthTopRaw = copyLandmarkPoint(rawLandmarks, 13, mirrored, 0);
    const mouthBottomRaw = copyLandmarkPoint(rawLandmarks, 14, mirrored, 17);
    const leftCheekRaw = copyLandmarkPoint(rawLandmarks, mirrored ? 454 : 234, mirrored);
    const rightCheekRaw = copyLandmarkPoint(rawLandmarks, mirrored ? 234 : 454, mirrored);
    // Pass 12C4 keeps extraction minimal: only jaw angles and lower-jaw anchors are added.
    const leftJawAngleRaw = copyLandmarkPoint(rawLandmarks, mirrored ? 397 : 172, mirrored);
    const rightJawAngleRaw = copyLandmarkPoint(rawLandmarks, mirrored ? 172 : 397, mirrored);
    const leftLowerJawRaw = copyLandmarkPoint(rawLandmarks, mirrored ? 378 : 149, mirrored);
    const rightLowerJawRaw = copyLandmarkPoint(rawLandmarks, mirrored ? 149 : 378, mirrored);

    const eyeDx = rightEyeRaw.x - leftEyeRaw.x;
    const eyeDy = rightEyeRaw.y - leftEyeRaw.y;
    const eyeDist = Math.hypot(eyeDx, eyeDy);
    const faceHeightRaw = Math.hypot(chinRaw.x - foreheadRaw.x, chinRaw.y - foreheadRaw.y);
    const faceWidthRaw = Math.hypot(rightCheekRaw.x - leftCheekRaw.x, rightCheekRaw.y - leftCheekRaw.y);

    // Measure in the eye-aligned source-video frame so roll and video aspect ratio do not
    // masquerade as face-shape changes. Widths remain normalized to video width and height
    // remains normalized to video height for exact object-fit mapping onto either canvas.
    const videoWidth = Math.max(videoElement.videoWidth, 1);
    const videoHeight = Math.max(videoElement.videoHeight, 1);
    const eyeRoll = Math.atan2(eyeDy * videoHeight, eyeDx * videoWidth);
    const rollCos = Math.cos(eyeRoll);
    const rollSin = Math.sin(eyeRoll);
    const alignedWidth = (left: Point2D, right: Point2D): number => {
      const dx = (right.x - left.x) * videoWidth;
      const dy = (right.y - left.y) * videoHeight;
      return Math.abs(dx * rollCos + dy * rollSin) / videoWidth;
    };
    const alignedHeight = (top: Point2D, bottom: Point2D): number => {
      const dx = (bottom.x - top.x) * videoWidth;
      const dy = (bottom.y - top.y) * videoHeight;
      return Math.abs(-dx * rollSin + dy * rollCos) / videoHeight;
    };
    const jawAngleWidthRaw = alignedWidth(leftJawAngleRaw, rightJawAngleRaw);
    const lowerJawWidthRaw = alignedWidth(leftLowerJawRaw, rightLowerJawRaw);
    const cheekWidthRaw = alignedWidth(leftCheekRaw, rightCheekRaw);
    const foreheadChinHeightRaw = alignedHeight(foreheadRaw, chinRaw);

    // Pass 9: MediaPipe blendshapes drive the reactive Lens Engine. Keep a landmark
    // fallback so the masks still react gracefully if a browser/device omits categories.
    const resultAny = results as unknown as {
      faceBlendshapes?: Array<{ categories?: Array<{ categoryName?: string; score?: number }> }>;
    };
    const categories = resultAny.faceBlendshapes?.[0]?.categories ?? [];
    const blendshape = (name: string): number => {
      const item = categories.find((category) => category.categoryName === name);
      return clamp01(item?.score ?? 0);
    };

    const mouthGap = Math.hypot(
      mouthBottomRaw.x - mouthTopRaw.x,
      mouthBottomRaw.y - mouthTopRaw.y
    );
    const landmarkJawOpen = clamp01((mouthGap / Math.max(eyeDist, 0.001) - 0.06) / 0.22);
    const mouthWidthRatio = Math.hypot(
      mouthRightRaw.x - mouthLeftRaw.x,
      mouthRightRaw.y - mouthLeftRaw.y
    ) / Math.max(eyeDist, 0.001);
    const landmarkMouthWidth = clamp01((mouthWidthRatio - 0.62) / 0.55);

    const anatomicalLeftBlink = blendshape('eyeBlinkLeft');
    const anatomicalRightBlink = blendshape('eyeBlinkRight');
    const rawExpressions: FaceExpressions = {
      jawOpen: Math.max(blendshape('jawOpen'), landmarkJawOpen * 0.86),
      mouthSmile: clamp01((blendshape('mouthSmileLeft') + blendshape('mouthSmileRight')) / 2),
      mouthWidth: Math.max(
        landmarkMouthWidth,
        clamp01((blendshape('mouthStretchLeft') + blendshape('mouthStretchRight')) / 2)
      ),
      // FaceMetrics uses screen-left / screen-right semantics, so swap on mirrored selfie video.
      eyeBlinkLeft: mirrored ? anatomicalRightBlink : anatomicalLeftBlink,
      eyeBlinkRight: mirrored ? anatomicalLeftBlink : anatomicalRightBlink,
    };

    const prev = smoothedMetrics;

    const currentMetrics: FaceMetrics = {
      detected: true,
      leftEye: smoothPoint(leftEyeRaw, prev?.leftEye, EMA_ALPHA_POS),
      rightEye: smoothPoint(rightEyeRaw, prev?.rightEye, EMA_ALPHA_POS),
      mouthCenter: smoothPoint(
        {
          x: (mouthTopRaw.x + mouthBottomRaw.x) / 2,
          y: (mouthTopRaw.y + mouthBottomRaw.y) / 2,
        },
        prev?.mouthCenter,
        EMA_ALPHA_POS
      ),
      mouthTop: smoothPoint(mouthTopRaw, prev?.mouthTop, EMA_ALPHA_POS),
      mouthBottom: smoothPoint(mouthBottomRaw, prev?.mouthBottom, EMA_ALPHA_POS),
      mouthLeft: smoothPoint(mouthLeftRaw, prev?.mouthLeft, EMA_ALPHA_POS),
      mouthRight: smoothPoint(mouthRightRaw, prev?.mouthRight, EMA_ALPHA_POS),
      chin: smoothPoint(chinRaw, prev?.chin, EMA_ALPHA_POS),
      forehead: smoothPoint(foreheadRaw, prev?.forehead, EMA_ALPHA_POS),
      leftCheek: smoothPoint(leftCheekRaw, prev?.leftCheek, EMA_ALPHA_POS),
      rightCheek: smoothPoint(rightCheekRaw, prev?.rightCheek, EMA_ALPHA_POS),
      faceWidth: smoothScalar(faceWidthRaw, prev?.faceWidth, EMA_ALPHA_SCALE, SCALE_DEADZONE),
      faceHeight: smoothScalar(faceHeightRaw, prev?.faceHeight, EMA_ALPHA_SCALE, SCALE_DEADZONE),
      adaptiveFit: {
        jawAngleWidth: smoothAdaptiveScalar(
          jawAngleWidthRaw,
          prev?.adaptiveFit.jawAngleWidth,
          rawExpressions.jawOpen
        ),
        lowerJawWidth: smoothAdaptiveScalar(
          lowerJawWidthRaw,
          prev?.adaptiveFit.lowerJawWidth,
          rawExpressions.jawOpen
        ),
        cheekWidth: smoothAdaptiveScalar(
          cheekWidthRaw,
          prev?.adaptiveFit.cheekWidth,
          rawExpressions.jawOpen
        ),
        foreheadChinHeight: smoothAdaptiveScalar(
          foreheadChinHeightRaw,
          prev?.adaptiveFit.foreheadChinHeight,
          rawExpressions.jawOpen
        ),
        jawOpen: rawExpressions.jawOpen,
        sampleId: safeTimestamp,
      },
      expressions: smoothExpressions(rawExpressions, prev?.expressions),
    };

    smoothedMetrics = currentMetrics;
    return currentMetrics;
  } catch (err) {
    console.warn('Error processing face tracking frame:', err);
    return smoothedMetrics || createEmptyMetrics();
  }
}

export function resetFaceTrackingSmoothing(): void {
  smoothedMetrics = null;
  lastProcessedTimestamp = 0;
  resetAdaptiveLowerFaceFit();
}

export function releaseFaceLandmarker(): void {
  faceLandmarkerEpoch += 1;
  faceLandmarkerInitialization = null;

  if (faceLandmarkerInstance) {
    closeFaceLandmarker(faceLandmarkerInstance);
    faceLandmarkerInstance = null;
  }

  smoothedMetrics = null;
  lastProcessedTimestamp = 0;
  resetAdaptiveLowerFaceFit();
}

function createEmptyMetrics(): FaceMetrics {
  return {
    detected: false,
    leftEye: { x: 0.42, y: 0.4 },
    rightEye: { x: 0.58, y: 0.4 },
    mouthCenter: { x: 0.5, y: 0.58 },
    mouthTop: { x: 0.5, y: 0.56 },
    mouthBottom: { x: 0.5, y: 0.6 },
    mouthLeft: { x: 0.44, y: 0.58 },
    mouthRight: { x: 0.56, y: 0.58 },
    chin: { x: 0.5, y: 0.68 },
    forehead: { x: 0.5, y: 0.28 },
    leftCheek: { x: 0.35, y: 0.48 },
    rightCheek: { x: 0.65, y: 0.48 },
    faceWidth: 0.3,
    faceHeight: 0.4,
    adaptiveFit: {
      jawAngleWidth: 0.25,
      lowerJawWidth: 0.2,
      cheekWidth: 0.3,
      foreheadChinHeight: 0.4,
      jawOpen: 0,
      sampleId: 0,
    },
    expressions: emptyExpressions(),
  };
}
