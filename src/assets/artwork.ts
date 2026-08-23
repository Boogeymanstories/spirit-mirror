// Production Graphic Assets for MIRROR MASK
import hauntedFrameUrl from './processed/haunted_gothic_frame.webp';
import crackedOverlayUrl from './processed/cracked_mirror_overlay.webp';
import baroqueOverlayUrl from './processed/baroque_overlay.webp';
import brassPlaqueUrl from './processed/brass_ui_plaque.webp';

// Manifestation Masks
import cursedStoneMaskUrl from './processed/cursed_stone_mask.webp';
import mourningVeilUrl from './processed/mourning_veil.webp';
import grinningMouthUrl from './processed/grinning_mouth.webp';
import shadowPassengerUrl from './processed/shadow_passenger.webp';

// Dormant Talisman Sigils (0 to 4)
import talisman0 from './processed/talisman_sigil_0.webp';
import talisman1 from './processed/talisman_sigil_1.webp';
import talisman2 from './processed/talisman_sigil_2.webp';
import talisman3 from './processed/talisman_sigil_3.webp';
import talisman4 from './processed/talisman_sigil_4.webp';

// Awakened Celestial Sigils (0 to 4)
import celestial0 from './processed/celestial_sigil_0.webp';
import celestial1 from './processed/celestial_sigil_1.webp';
import celestial2 from './processed/celestial_sigil_2.webp';
import celestial3 from './processed/celestial_sigil_3.webp';
import celestial4 from './processed/celestial_sigil_4.webp';

export const ARTWORK = {
  hauntedFrame: hauntedFrameUrl,
  crackedOverlay: crackedOverlayUrl,
  baroqueOverlay: baroqueOverlayUrl,
  brassPlaque: brassPlaqueUrl,
  cursedStoneMask: cursedStoneMaskUrl,
  mourningVeil: mourningVeilUrl,
  grinningMouth: grinningMouthUrl,
  shadowPassenger: shadowPassengerUrl,
  talismanSigils: [talisman0, talisman1, talisman2, talisman3, talisman4],
  celestialSigils: [celestial0, celestial1, celestial2, celestial3, celestial4],
};

// Canvas Image Preload Cache
const imageCache: Record<string, HTMLImageElement> = {};

export function getLoadedImage(urlOrKey: string): HTMLImageElement | null {
  const url = (ARTWORK as any)[urlOrKey] || urlOrKey;
  if (!url || typeof url !== 'string') return null;

  if (!imageCache[url]) {
    const img = new Image();
    img.src = url;
    img.crossOrigin = 'anonymous';
    imageCache[url] = img;
  }
  const img = imageCache[url];
  return img.complete && img.naturalWidth > 0 ? img : null;
}

// Preload all assets immediately
export function preloadAllArtwork() {
  const allUrls: string[] = [
    ARTWORK.hauntedFrame,
    ARTWORK.crackedOverlay,
    ARTWORK.baroqueOverlay,
    ARTWORK.brassPlaque,
    ARTWORK.cursedStoneMask,
    ARTWORK.mourningVeil,
    ARTWORK.grinningMouth,
    ARTWORK.shadowPassenger,
    ...ARTWORK.talismanSigils,
    ...ARTWORK.celestialSigils,
  ];

  allUrls.forEach((url) => {
    if (!imageCache[url]) {
      const img = new Image();
      img.src = url;
      img.crossOrigin = 'anonymous';
      imageCache[url] = img;
    }
  });
}

if (typeof window !== 'undefined') {
  preloadAllArtwork();
}
