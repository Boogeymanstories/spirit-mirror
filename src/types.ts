export type ManifestationId =
  | 'hollow'
  | 'veiled_one'
  | 'grinning_guest'
  | 'doppelganger'
  | 'passenger';

export interface Manifestation {
  id: ManifestationId;
  name: string;
  latinName: string;
  tagline: string;
  glyph: string; // SVG path or symbol
  glyphTitle: string;
  lore: string;
  accentColor: string;
}

export type CameraStatus =
  | 'idle'
  | 'requesting_permission'
  | 'initializing_model'
  | 'active'
  | 'permission_denied'
  | 'camera_unavailable'
  | 'unsupported'
  | 'error';

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface FaceMetrics {
  detected: boolean;
  // Normalized 0..1 in canvas space (with horizontal mirroring accounted for)
  center: Point2D;
  scale: number; // proportional to face width/interocular distance
  rotationZ: number; // roll in radians
  rotationY: number; // yaw in radians
  rotationX: number; // pitch in radians
  leftEye: Point2D;
  rightEye: Point2D;
  noseTip: Point2D;
  mouthCenter: Point2D;
  mouthTop: Point2D;
  mouthBottom: Point2D;
  mouthLeft: Point2D;
  mouthRight: Point2D;
  chin: Point2D;
  forehead: Point2D;
  leftCheek: Point2D;
  rightCheek: Point2D;
  faceWidth: number;
  faceHeight: number;
  // Raw landmarks array (478 points) for fine-grained drawing
  landmarks: Point3D[];
  timestamp: number;
}

export type ParanormalEventType =
  | 'peripheral_face'
  | 'reflection_lag'
  | 'black_frame'
  | 'wrong_eyes'
  | 'glass_pulse';

export interface ParanormalState {
  activeEvent: ParanormalEventType | null;
  intensity: number;
  variant: number; // 0..1 random seed for event specifics
  startTime: number;
  durationMs: number;
}
