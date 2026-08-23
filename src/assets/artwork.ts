// Production Graphic Assets for MIRROR MASK
import hauntedFrameUrl from './processed/haunted_gothic_frame.png';
import crackedOverlayUrl from './processed/cracked_mirror_overlay.png';
import baroqueOverlayUrl from './processed/baroque_overlay.png';
import brassPlaqueUrl from './processed/brass_ui_plaque.png';

// Manifestation Masks
import cursedStoneMaskUrl from './processed/cursed_stone_mask.png';
import veiledOneOverlayUrl from './processed/veiled_one_overlay.png';
import demonGrinMaskUrl from './processed/demon_grin_mask.png';
import passengerWraithUrl from './processed/passenger_wraith.png';

// Dormant Talisman Sigils (0 to 4)
import talisman0 from './processed/talisman_sigil_0.png';
import talisman1 from './processed/talisman_sigil_1.png';
import talisman2 from './processed/talisman_sigil_2.png';
import talisman3 from './processed/talisman_sigil_3.png';
import talisman4 from './processed/talisman_sigil_4.png';

// Awakened Celestial Sigils (0 to 4)
import celestial0 from './processed/celestial_sigil_0.png';
import celestial1 from './processed/celestial_sigil_1.png';
import celestial2 from './processed/celestial_sigil_2.png';
import celestial3 from './processed/celestial_sigil_3.png';
import celestial4 from './processed/celestial_sigil_4.png';

export const ARTWORK = {
  hauntedFrame: hauntedFrameUrl,
  crackedOverlay: crackedOverlayUrl,
  baroqueOverlay: baroqueOverlayUrl,
  brassPlaque: brassPlaqueUrl,
  cursedStoneMask: cursedStoneMaskUrl,
  veiledOneOverlay: veiledOneOverlayUrl,
  demonGrinMask: demonGrinMaskUrl,
  passengerWraith: passengerWraithUrl,
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
    ARTWORK.veiledOneOverlay,
    ARTWORK.demonGrinMask,
    ARTWORK.passengerWraith,
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
