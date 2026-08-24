import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { FaceExpressions, FaceMetrics, Point2D, Point3D } from '../types';

let faceLandmarkerInstance: FaceLandmarker | null = null;
let faceLandmarkerInitialization: Promise<FaceLandmarker | null> | null = null;
let faceLandmarkerEpoch = 0;
let smoothedMetrics: FaceMetrics | null = null;

const EMA_ALPHA_POS = 0.28;
const EMA_ALPHA_ROT = 0.18;
const EMA_ALPHA_SCALE = 0.24;
const EMA_ALPHA_EXPRESSION = 0.36;
const POSITION_DEADZONE = 0.0018;
const ANGLE_DEADZONE = 0.01;
const SCALE_DEADZONE = 0.002;
const EXPRESSION_DEADZONE = 0.012;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
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

function smoothAngle(curr: number, prev: number | undefined, alpha: number): number {
  if (prev === undefined) return curr;
  let diff = curr - prev;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  if (Math.abs(diff) <= ANGLE_DEADZONE) return prev;
  return prev + alpha * diff;
}

function smoothExpressions(curr: FaceExpressions, prev?: FaceExpressions): FaceExpressions {
  if (!prev) return curr;
  return {
    jawOpen: smoothScalar(curr.jawOpen, prev.jawOpen, EMA_ALPHA_EXPRESSION, EXPRESSION_DEADZONE),
    mouthSmile: smoothScalar(curr.mouthSmile, prev.mouthSmile, EMA_ALPHA_EXPRESSION, EXPRESSION_DEADZONE),
    mouthWidth: smoothScalar(curr.mouthWidth, prev.mouthWidth, EMA_ALPHA_EXPRESSION, EXPRESSION_DEADZONE),
    eyeBlinkLeft: smoothScalar(curr.eyeBlinkLeft, prev.eyeBlinkLeft, EMA_ALPHA_EXPRESSION, EXPRESSION_DEADZONE),
    eyeBlinkRight: smoothScalar(curr.eyeBlinkRight, prev.eyeBlinkRight, EMA_ALPHA_EXPRESSION, EXPRESSION_DEADZONE),
    browRaise: smoothScalar(curr.browRaise, prev.browRaise, EMA_ALPHA_EXPRESSION, EXPRESSION_DEADZONE),
  };
}

function emptyExpressions(): FaceExpressions {
  return {
    jawOpen: 0,
    mouthSmile: 0,
    mouthWidth: 0,
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    browRaise: 0,
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
    const landmarks: Point3D[] = rawLandmarks.map((pt) => ({
      x: mirrored ? 1.0 - pt.x : pt.x,
      y: pt.y,
      z: pt.z,
    }));

    const ptScreenLeftEyeOuter = mirrored
      ? (landmarks[263] || landmarks[359])
      : (landmarks[33] || landmarks[130]);
    const ptScreenLeftEyeInner = mirrored ? landmarks[362] : landmarks[133];
    const ptScreenRightEyeOuter = mirrored
      ? (landmarks[33] || landmarks[130])
      : (landmarks[263] || landmarks[359]);
    const ptScreenRightEyeInner = mirrored ? landmarks[133] : landmarks[362];

    const leftEyeRaw: Point2D = {
      x: (ptScreenLeftEyeOuter.x + ptScreenLeftEyeInner.x) / 2,
      y: (ptScreenLeftEyeOuter.y + ptScreenLeftEyeInner.y) / 2,
    };

    const rightEyeRaw: Point2D = {
      x: (ptScreenRightEyeOuter.x + ptScreenRightEyeInner.x) / 2,
      y: (ptScreenRightEyeOuter.y + ptScreenRightEyeInner.y) / 2,
    };

    const noseRaw: Point2D = landmarks[4] || landmarks[1];
    const foreheadRaw: Point2D = landmarks[10] || landmarks[151];
    const chinRaw: Point2D = landmarks[152] || landmarks[199];
    const mouthLeftRaw: Point2D = mirrored ? landmarks[291] : landmarks[61];
    const mouthRightRaw: Point2D = mirrored ? landmarks[61] : landmarks[291];
    const mouthTopRaw: Point2D = landmarks[13] || landmarks[0];
    const mouthBottomRaw: Point2D = landmarks[14] || landmarks[17];
    const leftCheekRaw: Point2D = mirrored ? landmarks[454] : landmarks[234];
    const rightCheekRaw: Point2D = mirrored ? landmarks[234] : landmarks[454];

    const centerRaw: Point2D = {
      x: (foreheadRaw.x + chinRaw.x + noseRaw.x) / 3,
      y: (foreheadRaw.y + chinRaw.y + noseRaw.y) / 3,
    };

    const eyeDx = rightEyeRaw.x - leftEyeRaw.x;
    const eyeDy = rightEyeRaw.y - leftEyeRaw.y;
    const rotationZRaw = Math.atan2(eyeDy, eyeDx);

    const eyeMidX = (leftEyeRaw.x + rightEyeRaw.x) / 2;
    const rotationYRaw = (noseRaw.x - eyeMidX) * 4.0;

    const eyeMidY = (leftEyeRaw.y + rightEyeRaw.y) / 2;
    const rotationXRaw = (noseRaw.y - eyeMidY - 0.08) * 4.0;

    const eyeDist = Math.hypot(eyeDx, eyeDy);
    const faceHeightRaw = Math.hypot(chinRaw.x - foreheadRaw.x, chinRaw.y - foreheadRaw.y);
    const faceWidthRaw = Math.hypot(rightCheekRaw.x - leftCheekRaw.x, rightCheekRaw.y - leftCheekRaw.y);

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
      browRaise: clamp01(
        Math.max(
          blendshape('browInnerUp'),
          (blendshape('browOuterUpLeft') + blendshape('browOuterUpRight')) / 2
        )
      ),
    };

    const prev = smoothedMetrics;

    const currentMetrics: FaceMetrics = {
      detected: true,
      center: smoothPoint(centerRaw, prev?.center, EMA_ALPHA_POS),
      scale: smoothScalar(eyeDist * 2.8, prev?.scale, EMA_ALPHA_SCALE, SCALE_DEADZONE),
      rotationZ: smoothAngle(rotationZRaw, prev?.rotationZ, EMA_ALPHA_ROT),
      rotationY: smoothAngle(rotationYRaw, prev?.rotationY, EMA_ALPHA_ROT),
      rotationX: smoothAngle(rotationXRaw, prev?.rotationX, EMA_ALPHA_ROT),
      leftEye: smoothPoint(leftEyeRaw, prev?.leftEye, EMA_ALPHA_POS),
      rightEye: smoothPoint(rightEyeRaw, prev?.rightEye, EMA_ALPHA_POS),
      noseTip: smoothPoint(noseRaw, prev?.noseTip, EMA_ALPHA_POS),
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
      expressions: smoothExpressions(rawExpressions, prev?.expressions),
      landmarks,
      timestamp: timestampMs,
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
}

function createEmptyMetrics(): FaceMetrics {
  return {
    detected: false,
    center: { x: 0.5, y: 0.45 },
    scale: 0.35,
    rotationZ: 0,
    rotationY: 0,
    rotationX: 0,
    leftEye: { x: 0.42, y: 0.4 },
    rightEye: { x: 0.58, y: 0.4 },
    noseTip: { x: 0.5, y: 0.48 },
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
    expressions: emptyExpressions(),
    landmarks: [],
    timestamp: performance.now(),
  };
}
