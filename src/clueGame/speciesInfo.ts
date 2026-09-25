// How an animal is shown: its card portrait, friendly taxonomy groups and IUCN
// Red List status.
import type { PoolSpecies } from '@/clueGame/pool';

const CLASS_NAMES: Record<string, string> = {
  AMPHIBIA: 'Amphibian', REPTILIA: 'Reptile', MAMMALIA: 'Mammal', AVES: 'Bird', ACTINOPTERYGII: 'Ray-finned fish', INSECTA: 'Insect',
};
export const ORDER_NAMES: Record<string, string> = {
  ANURA: 'Frogs and toads', TESTUDINES: 'Turtles and tortoises', CARNIVORA: 'Carnivores', ARTIODACTYLA: 'Even-toed hoofed mammals',
  CAUDATA: 'Salamanders and newts', SQUAMATA: 'Lizards and snakes', PRIMATES: 'Primates', PHOLIDOTA: 'Pangolins', CHIROPTERA: 'Bats',
  PERISSODACTYLA: 'Odd-toed hoofed mammals', PROBOSCIDEA: 'Elephants', MONOTREMATA: 'Egg-laying mammals', PILOSA: 'Sloths and anteaters',
  CINGULATA: 'Armadillos', DIPROTODONTIA: 'Kangaroos, koalas and wombats', DASYUROMORPHIA: 'Meat-eating marsupials',
  PERAMELEMORPHIA: 'Bandicoots and bilbies', AFROSORICIDA: 'Tenrecs and golden moles', MACROSCELIDEA: 'Sengis',
  LAGOMORPHA: 'Rabbits, hares and pikas', RODENTIA: 'Rodents', EULIPOTYPHLA: 'Shrews, moles and relatives',
};

/** Friendly names for families, as they finish "Its family is Felidae, ...". */
export const FAMILY_NAMES: Record<string, string> = {
  ARTHROLEPTIDAE: 'the squeaker and cricket frogs', ASCAPHIDAE: 'the tailed frogs', BREVICIPITIDAE: 'the rain frogs',
  CONRAUIDAE: 'the slippery frogs', DENDROBATIDAE: 'the poison dart frogs', MICROHYLIDAE: 'the narrow-mouthed frogs',
  NASIKABATRACHIDAE: 'the purple frogs of India', PHYLLOMEDUSIDAE: 'the leaf frogs', PIPIDAE: 'the tongueless frogs',
  RHACOPHORIDAE: 'the shrub frogs of Asia and Africa', RHINODERMATIDAE: "Darwin's frogs",
  CARETTOCHELYIDAE: 'which has only one living species', EMYDIDAE: 'the pond and box turtles', GEOEMYDIDAE: 'the Asian river and leaf turtles',
  PLATYSTERNIDAE: 'which has only one living species', TESTUDINIDAE: 'the land tortoises', TRIONYCHIDAE: 'the softshell turtles',
  CHRYSOCHLORIDAE: 'the golden moles', BOVIDAE: 'cattle, antelopes, goats and their relatives', GIRAFFIDAE: 'the giraffes and okapis',
  AILURIDAE: 'which has only one living species', CANIDAE: 'the dogs, wolves and foxes', FELIDAE: 'the cats',
  MUSTELIDAE: 'the weasels, ferrets, otters and badgers', PTEROPODIDAE: 'the fruit bats and flying foxes',
  CHLAMYPHORIDAE: 'the armadillos', DASYURIDAE: 'the meat-eating marsupials', MACROPODIDAE: 'the kangaroos and wallabies',
  VOMBATIDAE: 'the wombats', SOLENODONTIDAE: 'the solenodons', OCHOTONIDAE: 'the pikas', MACROSCELIDIDAE: 'the sengis (elephant shrews)',
  TACHYGLOSSIDAE: 'the echidnas', THYLACOMYIDAE: 'the bilbies', EQUIDAE: 'the horses, zebras and donkeys', RHINOCEROTIDAE: 'the rhinos',
  MANIDAE: 'the pangolins', BRADYPODIDAE: 'the three-toed sloths', CERCOPITHECIDAE: 'the monkeys of Africa and Asia',
  DAUBENTONIIDAE: 'which has only one living species', HOMINIDAE: 'the great apes', ELEPHANTIDAE: 'the elephants',
  SCIURIDAE: 'the squirrels, chipmunks and marmots',
};

export interface RedListStatus {
  code: string;
  label: string;
  /** Tailwind classes for the badge. */
  badge: string;
}

const RED_LIST: Record<string, Omit<RedListStatus, 'code'>> = {
  LC: { label: 'Least Concern', badge: 'bg-emerald-400/20 text-emerald-200 border-emerald-300/40' },
  NT: { label: 'Near Threatened', badge: 'bg-lime-400/20 text-lime-200 border-lime-300/40' },
  VU: { label: 'Vulnerable', badge: 'bg-amber-400/20 text-amber-200 border-amber-300/40' },
  EN: { label: 'Endangered', badge: 'bg-orange-500/20 text-orange-200 border-orange-300/40' },
  CR: { label: 'Critically Endangered', badge: 'bg-rose-500/25 text-rose-200 border-rose-300/50' },
  EW: { label: 'Extinct in the Wild', badge: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-300/40' },
  EX: { label: 'Extinct', badge: 'bg-zinc-500/25 text-zinc-200 border-zinc-300/40' },
  DD: { label: 'Data Deficient', badge: 'bg-slate-400/20 text-slate-200 border-slate-300/40' },
};

export function redListStatus(code: string | null): RedListStatus | null {
  const key = code?.trim().toUpperCase() ?? '';
  const known = RED_LIST[key];
  return known ? { code: key, ...known } : null;
}

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

/** e.g. "Amphibian · Frogs and toads · Rhinodermatidae family". */
export function taxonomyLine(species: PoolSpecies): string {
  const parts = [
    species.className ? CLASS_NAMES[species.className.toUpperCase()] ?? titleCase(species.className) : null,
    species.taxonOrder ? ORDER_NAMES[species.taxonOrder.toUpperCase()] ?? titleCase(species.taxonOrder) : null,
    species.family ? `${titleCase(species.family)} family` : null,
  ];
  return parts.filter(Boolean).join(' · ');
}

// Card portraits, most specific first: family, then order, then class.
const FAMILY_EMOJI: Record<string, string> = {
  FELIDAE: '🐅', CANIDAE: '🐺', MUSTELIDAE: '🦡', AILURIDAE: '🦊', GIRAFFIDAE: '🦒', BOVIDAE: '🐐',
  EQUIDAE: '🦓', RHINOCEROTIDAE: '🦏', HOMINIDAE: '🦧',
};
const ORDER_EMOJI: Record<string, string> = {
  ANURA: '🐸', TESTUDINES: '🐢', ARTIODACTYLA: '🦌', PRIMATES: '🐒', PROBOSCIDEA: '🐘', PILOSA: '🦥',
  DIPROTODONTIA: '🦘', MONOTREMATA: '🦔', EULIPOTYPHLA: '🦔', CHIROPTERA: '🦇', LAGOMORPHA: '🐇',
  PERAMELEMORPHIA: '🐇', RODENTIA: '🐿️', MACROSCELIDEA: '🐁', AFROSORICIDA: '🐁', PERISSODACTYLA: '🐎',
};
const CLASS_EMOJI: Record<string, string> = { AMPHIBIA: '🐸', REPTILIA: '🦎', MAMMALIA: '🐾', AVES: '🐦' };

/** Card portrait: an emoji for the animal's group, else its initials. */
export function speciesBadge(species: Pick<PoolSpecies, 'commonName' | 'className' | 'taxonOrder' | 'family'>): string {
  return FAMILY_EMOJI[species.family?.toUpperCase() ?? ''] ?? ORDER_EMOJI[species.taxonOrder ?? ''] ?? CLASS_EMOJI[species.className ?? '']
    ?? species.commonName.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
}
