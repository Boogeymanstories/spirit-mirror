export interface CameraStartResult {
  stream: MediaStream | null;
  error: string | null;
  status:
    | 'active'
    | 'permission_denied'
    | 'camera_unavailable'
    | 'unsupported'
    | 'error';
}

let activeStream: MediaStream | null = null;

export async function requestUserCamera(): Promise<CameraStartResult> {
  // Check if getUserMedia is supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      stream: null,
      error: 'Camera access is not supported by your current browser environment or security policy.',
      status: 'unsupported',
    };
  }

  // Stop any previously hanging stream
  stopUserCamera();

  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 30, max: 30 },
    },
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    activeStream = stream;
    return {
      stream,
      error: null,
      status: 'active',
    };
  } catch (err: unknown) {
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
        status: 'permission_denied',
      };
    }

    if (
      errorName === 'NotFoundError' ||
      errorName === 'DevicesNotFoundError'
    ) {
      return {
        stream: null,
        error: 'No front-facing video camera device was detected on your system.',
        status: 'camera_unavailable',
      };
    }

    if (
      errorName === 'NotReadableError' ||
      errorName === 'TrackStartError'
    ) {
      return {
        stream: null,
        error: 'The camera is currently occupied by another program or tab.',
        status: 'camera_unavailable',
      };
    }

    return {
      stream: null,
      error: error?.message || 'The supernatural glass could not connect to your vision device.',
      status: 'error',
    };
  }
}

export function stopUserCamera(): void {
  if (activeStream) {
    try {
      activeStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore individual track stop errors
        }
      });
    } catch {
      // Ignore cleanup error
    }
    activeStream = null;
  }
}
