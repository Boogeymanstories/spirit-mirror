import { CameraFacing } from '../types';

export interface CameraStartResult {
  stream: MediaStream | null;
  error: string | null;
  facing: CameraFacing;
  status:
    | 'active'
    | 'stale'
    | 'permission_denied'
    | 'camera_unavailable'
    | 'unsupported'
    | 'error';
}

let activeStream: MediaStream | null = null;
let cameraRequestGeneration = 0;

function stopStreamTracks(stream: MediaStream): void {
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // Ignore individual track stop errors.
      }
    });
  } catch {
    // Ignore cleanup errors.
  }
}

function staleCameraResult(facing: CameraFacing): CameraStartResult {
  return {
    stream: null,
    error: null,
    facing,
    status: 'stale',
  };
}

export function beginCameraRequestGeneration(): number {
  cameraRequestGeneration += 1;
  return cameraRequestGeneration;
}

export function invalidateCameraRequests(): void {
  cameraRequestGeneration += 1;
}

export function isCameraRequestGenerationCurrent(generation: number): boolean {
  return generation === cameraRequestGeneration;
}

function normalizedFacing(value: string | undefined, requested: CameraFacing): CameraFacing {
  if (value === 'environment' || value === 'user') return value;
  return requested;
}

export async function requestCamera(
  requestGeneration: number,
  facing: CameraFacing = 'user',
  exactFacing = false
): Promise<CameraStartResult> {
  if (!isCameraRequestGenerationCurrent(requestGeneration)) {
    return staleCameraResult(facing);
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      stream: null,
      error: 'Camera access is not supported by your current browser environment or security policy.',
      facing,
      status: 'unsupported',
    };
  }

  stopUserCamera();

  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: exactFacing ? { exact: facing } : { ideal: facing },
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 30, max: 30 },
    },
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (!isCameraRequestGenerationCurrent(requestGeneration)) {
      stopStreamTracks(stream);
      return staleCameraResult(facing);
    }

    activeStream = stream;
    const trackFacing = stream.getVideoTracks()[0]?.getSettings().facingMode;
    return {
      stream,
      error: null,
      facing: normalizedFacing(trackFacing, facing),
      status: 'active',
    };
  } catch (err: unknown) {
    if (!isCameraRequestGenerationCurrent(requestGeneration)) {
      return staleCameraResult(facing);
    }

    const error = err as { name?: string; message?: string };
    const errorName = error?.name || '';

    if (
      errorName === 'NotAllowedError' ||
      errorName === 'PermissionDeniedError' ||
      errorName === 'SecurityError'
    ) {
      return {
        stream: null,
        error: 'Camera permission was declined or blocked by browser/iframe policy.',
        facing,
        status: 'permission_denied',
      };
    }

    if (
      errorName === 'NotFoundError' ||
      errorName === 'DevicesNotFoundError' ||
      errorName === 'OverconstrainedError' ||
      errorName === 'ConstraintNotSatisfiedError'
    ) {
      return {
        stream: null,
        error: `No ${facing === 'environment' ? 'rear' : 'front'} camera was detected.`,
        facing,
        status: 'camera_unavailable',
      };
    }

    if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      return {
        stream: null,
        error: 'The camera is currently occupied by another program or tab.',
        facing,
        status: 'camera_unavailable',
      };
    }

    return {
      stream: null,
      error: error?.message || 'The supernatural glass could not connect to your vision device.',
      facing,
      status: 'error',
    };
  }
}

// Backward-compatible alias used by older code paths.
export async function requestUserCamera(): Promise<CameraStartResult> {
  const requestGeneration = beginCameraRequestGeneration();
  return requestCamera(requestGeneration, 'user');
}

export async function countVideoInputs(): Promise<number> {
  if (!navigator.mediaDevices?.enumerateDevices) return 0;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === 'videoinput').length;
  } catch {
    return 0;
  }
}

export function stopUserCamera(): void {
  if (activeStream) {
    stopStreamTracks(activeStream);
    activeStream = null;
  }
}
