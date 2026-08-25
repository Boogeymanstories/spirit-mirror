import { Manifestation, ManifestationId } from '../types';

const make = (
  id: ManifestationId,
  name: string,
  latinName: string
): Manifestation => ({
  id,
  name,
  latinName,
});

export const MANIFESTATIONS: Record<ManifestationId, Manifestation> = {
  hollow: make('hollow', 'The Hollow', 'Umbra Vacua'),
  veiled_one: make('veiled_one', 'The Veiled One', 'Mors Velata'),
  grinning_guest: make('grinning_guest', 'The Grinning Guest', 'Hospes Ridens'),
  bone_saint: make('bone_saint', 'The Bone Saint', 'Sanctus Ossis'),
  thorn_crown: make('thorn_crown', 'The Thorn Crown', 'Corona Spinae'),
  moss_crowned_swamp_demon: make('moss_crowned_swamp_demon', 'The Moss-Crowned Swamp Demon', 'Daemon Paludis'),
  plague_baron: make('plague_baron', 'The Plague Baron', 'Baro Pestis'),
  wax_prophet: make('wax_prophet', 'The Wax Prophet', 'Propheta Cerae'),
  raven_priest: make('raven_priest', 'The Raven Priest', 'Sacerdos Corvi'),
  ashen_king: make('ashen_king', 'The Ashen King', 'Rex Cineris'),
  drowned_mariner: make('drowned_mariner', 'The Drowned Mariner', 'Nauta Submersus'),
  porcelain_widow: make('porcelain_widow', 'The Porcelain Widow', 'Vidua Porcellana'),
  starborn_entity: make('starborn_entity', 'The Starborn Entity', 'Entitas Stellaris'),
  scarecrow_king: make('scarecrow_king', 'The Scarecrow King', 'Rex Paleae'),
  crypt_hound: make('crypt_hound', 'The Crypt Hound', 'Canis Cryptae'),
  vampire_magistrate: make('vampire_magistrate', 'The Vampire Magistrate', 'Magistratus Vampyri'),
  lantern_witch: make('lantern_witch', 'The Lantern Witch', 'Saga Lucernae'),
  hive_matriarch: make('hive_matriarch', 'The Hive Matriarch', 'Mater Alvearis'),
  shadow_jackal: make('shadow_jackal', 'The Shadow Jackal', 'Canis Umbrae'),
  ragged_specter: make('ragged_specter', 'The Ragged Specter', 'Spectrum Lacerum'),
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
