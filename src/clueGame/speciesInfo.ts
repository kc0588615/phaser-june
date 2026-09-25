// Friendly names for the reveal card: taxonomy groups and IUCN Red List status.
import type { PoolSpecies } from '@/clueGame/pool';

const CLASS_NAMES: Record<string, string> = {
  AMPHIBIA: 'Amphibian', REPTILIA: 'Reptile', MAMMALIA: 'Mammal', AVES: 'Bird', ACTINOPTERYGII: 'Ray-finned fish', INSECTA: 'Insect',
};
const ORDER_NAMES: Record<string, string> = {
  ANURA: 'Frogs and toads', TESTUDINES: 'Turtles and tortoises', CARNIVORA: 'Carnivores', ARTIODACTYLA: 'Even-toed hoofed mammals',
  CAUDATA: 'Salamanders and newts', SQUAMATA: 'Lizards and snakes', PRIMATES: 'Primates', PHOLIDOTA: 'Pangolins', CHIROPTERA: 'Bats',
  PERISSODACTYLA: 'Odd-toed hoofed mammals', PROBOSCIDEA: 'Elephants', MONOTREMATA: 'Egg-laying mammals', PILOSA: 'Sloths and anteaters',
  CINGULATA: 'Armadillos', DIPROTODONTIA: 'Kangaroos, koalas and wombats', DASYUROMORPHIA: 'Meat-eating marsupials',
  PERAMELEMORPHIA: 'Bandicoots and bilbies', AFROSORICIDA: 'Tenrecs and golden moles', MACROSCELIDEA: 'Sengis',
  LAGOMORPHA: 'Rabbits, hares and pikas', RODENTIA: 'Rodents', EULIPOTYPHLA: 'Shrews, moles and relatives',
};

export interface RedListStatus {
  code: string;
  label: string;
  /** Tailwind classes for the badge. */
  badge: string;
  /** How worried scientists are, 0 (least) to 5 (gone from the wild, or gone). */
  level: number;
}

const RED_LIST: Record<string, Omit<RedListStatus, 'code'>> = {
  LC: { label: 'Least Concern', badge: 'bg-emerald-400/20 text-emerald-200 border-emerald-300/40', level: 0 },
  NT: { label: 'Near Threatened', badge: 'bg-lime-400/20 text-lime-200 border-lime-300/40', level: 1 },
  VU: { label: 'Vulnerable', badge: 'bg-amber-400/20 text-amber-200 border-amber-300/40', level: 2 },
  EN: { label: 'Endangered', badge: 'bg-orange-500/20 text-orange-200 border-orange-300/40', level: 3 },
  CR: { label: 'Critically Endangered', badge: 'bg-rose-500/25 text-rose-200 border-rose-300/50', level: 4 },
  EW: { label: 'Extinct in the Wild', badge: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-300/40', level: 5 },
  EX: { label: 'Extinct', badge: 'bg-zinc-500/25 text-zinc-200 border-zinc-300/40', level: 5 },
  DD: { label: 'Data Deficient', badge: 'bg-slate-400/20 text-slate-200 border-slate-300/40', level: 0 },
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
