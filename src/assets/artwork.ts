// Production graphic assets for MIRROR MASK
import hauntedFrameUrl from './processed/haunted_gothic_frame.webp';
import crackedOverlayUrl from './processed/cracked_mirror_overlay.webp';
import baroqueOverlayUrl from './processed/baroque_overlay.webp';
import brassPlaqueUrl from './processed/brass_ui_plaque.webp';
import dormantGlassBgUrl from './images/dormant_glass_bg_1787523834661.jpg';

import hollow from './masks/hollow.webp';
import veiledOne from './masks/veiled_one.webp';
import grinningGuest from './masks/grinning_guest.webp';
import boneSaint from './masks/bone_saint.webp';
import thornCrown from './masks/thorn_crown.webp';
import mossCrownedSwampDemon from './masks/moss_crowned_swamp_demon.webp';
import plagueBaron from './masks/plague_baron.webp';
import waxProphet from './masks/wax_prophet.webp';
import ravenPriest from './masks/raven_priest.webp';
import ashenKing from './masks/ashen_king.webp';
import drownedMariner from './masks/drowned_mariner.webp';
import porcelainWidow from './masks/porcelain_widow.webp';
import starbornEntity from './masks/starborn_entity.webp';
import scarecrowKing from './masks/scarecrow_king.webp';
import cryptHound from './masks/crypt_hound.webp';
import vampireMagistrate from './masks/vampire_magistrate.webp';
import lanternWitch from './masks/lantern_witch.webp';
import hiveMatriarch from './masks/hive_matriarch.webp';
import shadowJackal from './masks/shadow_jackal.webp';
import raggedSpecter from './masks/ragged_specter.webp';

export const MASK_ARTWORK = {
  hollow,
  veiled_one: veiledOne,
  grinning_guest: grinningGuest,
  bone_saint: boneSaint,
  thorn_crown: thornCrown,
  moss_crowned_swamp_demon: mossCrownedSwampDemon,
  plague_baron: plagueBaron,
  wax_prophet: waxProphet,
  raven_priest: ravenPriest,
  ashen_king: ashenKing,
  drowned_mariner: drownedMariner,
  porcelain_widow: porcelainWidow,
  starborn_entity: starbornEntity,
  scarecrow_king: scarecrowKing,
  crypt_hound: cryptHound,
  vampire_magistrate: vampireMagistrate,
  lantern_witch: lanternWitch,
  hive_matriarch: hiveMatriarch,
  shadow_jackal: shadowJackal,
  ragged_specter: raggedSpecter,
} as const;

export const ARTWORK = {
  hauntedFrame: hauntedFrameUrl,
  crackedOverlay: crackedOverlayUrl,
  baroqueOverlay: baroqueOverlayUrl,
  brassPlaque: brassPlaqueUrl,
  dormantGlassBg: dormantGlassBgUrl,
};

const imageCache: Record<string, HTMLImageElement> = {};

export function getLoadedImage(url: string): HTMLImageElement | null {
  if (!url) return null;
  if (!imageCache[url]) {
    const img = new Image();
    img.src = url;
    imageCache[url] = img;
  }
  const img = imageCache[url];
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function preloadCoreArtwork() {
  [
    ARTWORK.hauntedFrame,
    ARTWORK.crackedOverlay,
    ARTWORK.baroqueOverlay,
    ARTWORK.brassPlaque,
    ARTWORK.dormantGlassBg,
    MASK_ARTWORK.hollow,
    MASK_ARTWORK.veiled_one,
    MASK_ARTWORK.grinning_guest,
  ].forEach((url) => getLoadedImage(url));
}

export function preloadMask(url: string) {
  getLoadedImage(url);
}

if (typeof window !== 'undefined') preloadCoreArtwork();
