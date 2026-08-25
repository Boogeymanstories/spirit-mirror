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

type ImageFetchPriority = 'high' | 'low' | 'auto';

interface CachedImage {
  image: HTMLImageElement;
  decoded: boolean;
  decodePromise: Promise<HTMLImageElement | null>;
}

const imageCache: Record<string, CachedImage> = {};

function createCachedImage(url: string, fetchPriority: ImageFetchPriority): CachedImage {
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = fetchPriority;

  const loadPromise = new Promise<void>((resolve, reject) => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => reject(new Error(`Image failed to load: ${url}`)), {
      once: true,
    });
  });

  const cached: CachedImage = {
    image,
    decoded: false,
    decodePromise: Promise.resolve(null),
  };

  image.src = url;
  cached.decodePromise = (async () => {
    if (typeof image.decode === 'function') {
      try {
        await image.decode();
      } catch {
        // Some WebKit versions reject decode() for an otherwise usable cached image.
      }
    }

    if (!image.complete || image.naturalWidth === 0) {
      try {
        await loadPromise;
      } catch {
        return null;
      }
    }

    if (image.naturalWidth === 0) return null;
    cached.decoded = true;
    return image;
  })();

  return cached;
}

function getCachedImage(url: string, fetchPriority: ImageFetchPriority = 'auto'): CachedImage | null {
  if (!url) return null;
  if (!imageCache[url]) {
    imageCache[url] = createCachedImage(url, fetchPriority);
  } else if (fetchPriority === 'high') {
    imageCache[url].image.fetchPriority = 'high';
  }
  return imageCache[url];
}

export function getLoadedImage(url: string): HTMLImageElement | null {
  const cached = getCachedImage(url);
  return cached?.decoded ? cached.image : null;
}

export function preloadMask(
  url: string,
  fetchPriority: ImageFetchPriority = 'auto'
): Promise<HTMLImageElement | null> {
  return getCachedImage(url, fetchPriority)?.decodePromise ?? Promise.resolve(null);
}

export function preloadCoreArtwork(): void {
  // Start the initially selected mask first. Only the cracked overlay also needs a
  // canvas-owned image; the remaining structural art is loaded by its visible DOM image.
  void preloadMask(MASK_ARTWORK.hollow, 'high');
  void preloadMask(ARTWORK.crackedOverlay);
}

if (typeof window !== 'undefined') preloadCoreArtwork();
