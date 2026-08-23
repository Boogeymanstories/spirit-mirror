import { Manifestation, ManifestationId } from '../types';

export const MANIFESTATIONS: Record<ManifestationId, Manifestation> = {
  hollow: {
    id: 'hollow',
    name: 'The Hollow',
    latinName: 'Umbra Vacua',
    tagline: 'A reflection drained of warmth, consumed by cold void.',
    glyph: 'M12 2 L22 12 L12 22 L2 12 Z M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6 Z M12 10 A2 2 0 1 0 12 14 A2 2 0 1 0 12 10 Z',
    glyphTitle: 'Sigil of the Void',
    lore: 'An ancient manifestation that strips the warmth and vital spark from mortal features, leaving sunken sockets and cracked earthen ash.',
    accentColor: '#93a19b',
  },
  veiled_one: {
    id: 'veiled_one',
    name: 'The Veiled One',
    latinName: 'Mors Velata',
    tagline: 'Draped in funeral gossamer, weeping through eternity.',
    glyph: 'M4 4 C10 1 14 1 20 4 C18 14 14 21 12 22 C10 21 6 14 4 4 Z M8 8 C11 11 13 11 16 8 M9 13 C11 15 13 15 15 13 M10 17 L14 17',
    glyphTitle: 'Sigil of the Shroud',
    lore: 'The mournful apparition of a Victorian funeral rite, lingering beneath black lace with ancient bone structure pressing faintly against the veil.',
    accentColor: '#8a829e',
  },
  grinning_guest: {
    id: 'grinning_guest',
    name: 'The Grinning Guest',
    latinName: 'Hospes Ridens',
    tagline: 'A smile that widens beyond the boundaries of flesh.',
    glyph: 'M2 12 C4 6 20 6 22 12 C20 20 4 20 2 12 Z M6 13 C9 17 15 17 18 13 M8 12 L8 14 M12 11 L12 15 M16 12 L16 14 M6 8 A1.5 1.5 0 1 1 6 7.9 M18 8 A1.5 1.5 0 1 1 18 7.9',
    glyphTitle: 'Sigil of the Grin',
    lore: 'An insidious entity that mimics the host’s expression, gradually stretching jaw and lips into an impossible, needle-toothed grin.',
    accentColor: '#a86565',
  },
  doppelganger: {
    id: 'doppelganger',
    name: 'The Doppelgänger',
    latinName: 'Duplex Umbra',
    tagline: 'Your mirror double is no longer synchronized with you.',
    glyph: 'M7 4 A5 5 0 1 1 7 14 A5 5 0 1 1 7 4 Z M17 10 A5 5 0 1 1 17 20 A5 5 0 1 1 17 10 Z M7 9 L17 15 M7 14 L17 10',
    glyphTitle: 'Sigil of the Split',
    lore: 'A temporal divergence in the silvering of the glass. The reflection hesitates, watches, and turns a fraction of a second too late.',
    accentColor: '#7ba6b0',
  },
  passenger: {
    id: 'passenger',
    name: 'The Passenger',
    latinName: 'Spectrum Post Tergum',
    tagline: 'Something standing in the dark behind your shoulder.',
    glyph: 'M12 2 A4 4 0 1 0 12 10 A4 4 0 1 0 12 2 Z M12 12 C7 12 4 16 4 22 L20 22 C20 16 17 12 12 12 Z M18 4 A3 3 0 1 0 18 10 A3 3 0 1 0 18 4 Z M18 12 C16 12 15 14 15 17 L22 17 C22 14 20 12 18 12 Z',
    glyphTitle: 'Sigil of the Presence',
    lore: 'A silent, towering spectator that never occupies the face itself, but coalesces from the room’s darkest corner just behind your back.',
    accentColor: '#8a7761',
  },
};

export const MANIFESTATION_ORDER: ManifestationId[] = [
  'hollow',
  'veiled_one',
  'grinning_guest',
  'doppelganger',
  'passenger',
];
