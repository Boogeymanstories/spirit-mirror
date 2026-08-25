export type ManifestationId =
  | 'hollow'
  | 'veiled_one'
  | 'grinning_guest'
  | 'bone_saint'
  | 'thorn_crown'
  | 'moss_crowned_swamp_demon'
  | 'plague_baron'
  | 'wax_prophet'
  | 'raven_priest'
  | 'ashen_king'
  | 'drowned_mariner'
  | 'porcelain_widow'
  | 'starborn_entity'
  | 'scarecrow_king'
  | 'crypt_hound'
  | 'vampire_magistrate'
  | 'lantern_witch'
  | 'hive_matriarch'
  | 'shadow_jackal'
  | 'ragged_specter';

export interface Manifestation {
  id: ManifestationId;
  name: string;
  latinName: string;
}

export type CameraFacing = 'user' | 'environment';

export type CameraStatus =
  | 'idle'
  | 'requesting_permission'
  | 'initializing_model'
  | 'active'
  | 'permission_denied'
  | 'camera_unavailable'
  | 'unsupported'
  | 'error';

export interface Point2D { x: number; y: number; }

export interface FaceExpressions {
  jawOpen: number;
  mouthSmile: number;
  mouthWidth: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
}

export interface FaceMetrics {
  detected: boolean;
  leftEye: Point2D;
  rightEye: Point2D;
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
  expressions: FaceExpressions;
}
