import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { FaceMetrics, Point2D, Point3D } from '../types';

let faceLandmarkerInstance: FaceLandmarker | null = null;
let isInitializing = false;
let smoothedMetrics: FaceMetrics | null = null;

// Exponential Moving Average smoothing alpha (0 = sticky, 1 = no smoothing)
const EMA_ALPHA_POS = 0.55;
const EMA_ALPHA_ROT = 0.45;
const EMA_ALPHA_SCALE = 0.5;

function smoothPoint(curr: Point2D, prev: Point2D | undefined, alpha: number): Point2D {
  if (!prev) return curr;
  return {
    x: prev.x + alpha * (curr.x - prev.x),
    y: prev.y + alpha * (curr.y - prev.y),
  };
}

function smoothAngle(curr: number, prev: number | undefined, alpha: number): number {
  if (prev === undefined) return curr;
  // Handle radian wrap-around if needed
  let diff = curr - prev;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return prev + alpha * diff;
}

export async function getFaceLandmarker(): Promise<FaceLandmarker | null> {
  if (faceLandmarkerInstance) {
    return faceLandmarkerInstance;
  }

  if (isInitializing) {
    // Wait for in-flight initialization
    let attempts = 0;
    while (isInitializing && attempts < 40) {
      await new Promise((r) => setTimeout(r, 100));
      attempts++;
    }
    return faceLandmarkerInstance;
  }

  isInitializing = true;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    // Attempt GPU delegate first, then CPU delegate
    try {
      faceLandmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: 'GPU',
        },
        outputFaceBlendshapes: false,
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    } catch {
      faceLandmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: 'CPU',
        },
        outputFaceBlendshapes: false,
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    }

    return faceLandmarkerInstance;
  } catch (err) {
    console.warn('FaceLandmarker initialization status:', err);
    return null;
  } finally {
    isInitializing = false;
  }
}

let lastProcessedTimestamp = 0;

export function processVideoFrame(
  landmarker: FaceLandmarker | null,
  videoElement: HTMLVideoElement,
  timestampMs: number
): FaceMetrics {
  if (!landmarker || videoElement.readyState < 2) {
    return smoothedMetrics || createEmptyMetrics();
  }

  // Ensure monotonically increasing timestamp for MediaPipe VIDEO runningMode
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

    // Mirror landmark x coordinates so they correspond 1:1 with mirrored video feed
    const landmarks: Point3D[] = rawLandmarks.map((pt) => ({
      x: 1.0 - pt.x,
      y: pt.y,
      z: pt.z,
    }));

    // In mirrored video coordinates (x = 1.0 - raw.x):
    // - Screen Left (viewer's left, smaller x) corresponds to the person's left side (landmarks 263, 362, 454, 291)
    // - Screen Right (viewer's right, larger x) corresponds to the person's right side (landmarks 33, 133, 234, 61)
    const ptScreenLeftEyeOuter = landmarks[263] || landmarks[359];
    const ptScreenLeftEyeInner = landmarks[362];
    const ptScreenRightEyeOuter = landmarks[33] || landmarks[130];
    const ptScreenRightEyeInner = landmarks[133];

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
    const mouthLeftRaw: Point2D = landmarks[291]; // screen left
    const mouthRightRaw: Point2D = landmarks[61];  // screen right
    const mouthTopRaw: Point2D = landmarks[13] || landmarks[0];
    const mouthBottomRaw: Point2D = landmarks[14] || landmarks[17];
    const leftCheekRaw: Point2D = landmarks[454];  // screen left
    const rightCheekRaw: Point2D = landmarks[234]; // screen right

    const centerRaw: Point2D = {
      x: (foreheadRaw.x + chinRaw.x + noseRaw.x) / 3,
      y: (foreheadRaw.y + chinRaw.y + noseRaw.y) / 3,
    };

    // Calculate rotation angles
    // Roll (Z rotation): Angle from screen left eye to screen right eye (0 rad when upright and level)
    const eyeDx = rightEyeRaw.x - leftEyeRaw.x;
    const eyeDy = rightEyeRaw.y - leftEyeRaw.y;
    const rotationZRaw = Math.atan2(eyeDy, eyeDx);

    // Yaw (Y rotation): Asymmetry between nose and eye centers
    const eyeMidX = (leftEyeRaw.x + rightEyeRaw.x) / 2;
    const rotationYRaw = (noseRaw.x - eyeMidX) * 4.0;

    // Pitch (X rotation): Distance from nose to eye line vs nose to mouth
    const eyeMidY = (leftEyeRaw.y + rightEyeRaw.y) / 2;
    const rotationXRaw = (noseRaw.y - eyeMidY - 0.08) * 4.0;

    // Scale calculation based on eye distance and facial height
    const eyeDist = Math.hypot(eyeDx, eyeDy);
    const faceHeightRaw = Math.hypot(chinRaw.x - foreheadRaw.x, chinRaw.y - foreheadRaw.y);
    const faceWidthRaw = Math.hypot(rightCheekRaw.x - leftCheekRaw.x, rightCheekRaw.y - leftCheekRaw.y);

    const prev = smoothedMetrics;

    const currentMetrics: FaceMetrics = {
      detected: true,
      center: smoothPoint(centerRaw, prev?.center, EMA_ALPHA_POS),
      scale: prev ? prev.scale + EMA_ALPHA_SCALE * (eyeDist * 2.8 - prev.scale) : eyeDist * 2.8,
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
      faceWidth: prev ? prev.faceWidth + EMA_ALPHA_SCALE * (faceWidthRaw - prev.faceWidth) : faceWidthRaw,
      faceHeight: prev ? prev.faceHeight + EMA_ALPHA_SCALE * (faceHeightRaw - prev.faceHeight) : faceHeightRaw,
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

export function releaseFaceLandmarker(): void {
  if (faceLandmarkerInstance) {
    try {
      faceLandmarkerInstance.close();
    } catch {
      // Ignore cleanup error
    }
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
    landmarks: [],
    timestamp: performance.now(),
  };
}
