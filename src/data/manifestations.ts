import { Manifestation, ManifestationId } from '../types';

const make = (
  id: ManifestationId,
  name: string,
  latinName: string,
  tagline: string,
  accentColor = '#9a8064'
): Manifestation => ({
  id,
  name,
  latinName,
  tagline,
  glyph: '',
  glyphTitle: name,
  lore: tagline,
  accentColor,
});

export const MANIFESTATIONS: Record<ManifestationId, Manifestation> = {
  hollow: make('hollow', 'The Hollow', 'Umbra Vacua', 'Cracked moonlit porcelain with hollow eyes.', '#9aa29e'),
  veiled_one: make('veiled_one', 'The Veiled One', 'Mors Velata', 'A raven-crowned mourning veil from beyond the glass.', '#91879c'),
  grinning_guest: make('grinning_guest', 'The Grinning Guest', 'Hospes Ridens', 'A porcelain smile stretched far past comfort.', '#a96e68'),
  bone_saint: make('bone_saint', 'The Bone Saint', 'Sanctus Ossis', 'A gilded reliquary skull beneath a sacred halo.', '#b49a72'),
  thorn_crown: make('thorn_crown', 'The Thorn Crown', 'Corona Spinae', 'Cracked porcelain bound in roses, thorns and red glass.', '#a55b60'),
  moss_crowned_swamp_demon: make('moss_crowned_swamp_demon', 'The Moss-Crowned Swamp Demon', 'Daemon Paludis', 'Moss, fungus and drowned roots grown into a face.', '#708b5a'),
  plague_baron: make('plague_baron', 'The Plague Baron', 'Baro Pestis', 'A black-feathered plague relic with a gilded beak.', '#8a7561'),
  wax_prophet: make('wax_prophet', 'The Wax Prophet', 'Propheta Cerae', 'A candle-crowned oracle melting beneath its own flame.', '#c39b65'),
  raven_priest: make('raven_priest', 'The Raven Priest', 'Sacerdos Corvi', 'A ceremonial raven mask set with dark feathers and rubies.', '#806b78'),
  ashen_king: make('ashen_king', 'The Ashen King', 'Rex Cineris', 'A molten crown split by ember-bright fractures.', '#b56c48'),
  drowned_mariner: make('drowned_mariner', 'The Drowned Mariner', 'Nauta Submersus', 'A barnacled sailor returned from black water.', '#65848a'),
  porcelain_widow: make('porcelain_widow', 'The Porcelain Widow', 'Vidua Porcellana', 'A cracked gothic doll face adorned in black roses.', '#9c7a86'),
  starborn_entity: make('starborn_entity', 'The Starborn Entity', 'Entitas Stellaris', 'A cosmic visitor wrapped in bio-organic tendrils.', '#806aa4'),
  scarecrow_king: make('scarecrow_king', 'The Scarecrow King', 'Rex Paleae', 'Burlap, thorn and harvest rot stitched into a grin.', '#8b7451'),
  crypt_hound: make('crypt_hound', 'The Crypt Hound', 'Canis Cryptae', 'A grave-born beast with ritual scars and predatory eyes.', '#7b6b65'),
  vampire_magistrate: make('vampire_magistrate', 'The Vampire Magistrate', 'Magistratus Vampyri', 'An aristocratic revenant with fangs and blood-red jewels.', '#9b5a5d'),
  lantern_witch: make('lantern_witch', 'The Lantern Witch', 'Saga Lucernae', 'A forest witch whose lantern guides lost souls.', '#71845e'),
  hive_matriarch: make('hive_matriarch', 'The Hive Matriarch', 'Mater Alvearis', 'Honeycomb, amber and a living crown of bees.', '#c48c35'),
  shadow_jackal: make('shadow_jackal', 'The Shadow Jackal', 'Canis Umbrae', 'A black-and-gold jackal herald from the old tombs.', '#88704b'),
  ragged_specter: make('ragged_specter', 'The Ragged Specter', 'Spectrum Lacerum', 'A cracked apparition wrapped in a shredded shroud.', '#8a8580'),
};

export const MANIFESTATION_ORDER: ManifestationId[] = [
  'hollow',
  'veiled_one',
  'grinning_guest',
  'bone_saint',
  'thorn_crown',
  'moss_crowned_swamp_demon',
  'plague_baron',
  'wax_prophet',
  'raven_priest',
  'ashen_king',
  'drowned_mariner',
  'porcelain_widow',
  'starborn_entity',
  'scarecrow_king',
  'crypt_hound',
  'vampire_magistrate',
  'lantern_witch',
  'hive_matriarch',
  'shadow_jackal',
  'ragged_specter',
];
