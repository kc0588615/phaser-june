import type { Species } from '@/types/database';

export const AFFINITY_TYPES = [
  'avian',
  'feline',
  'amphibian',
  'primate',
  'insect',
  'ungulate',
  'reptile',
  'fish',
  'arachnid',
  'burrower',
] as const;

export type AffinityType = typeof AFFINITY_TYPES[number];
export type AffinityGemType = 'sword' | 'staff' | 'shield' | 'key' | 'crate';

export interface AffinityDefinition {
  id: AffinityType;
  label: string;
  familyLabel: string;
  buffedGem: AffinityGemType;
  shortEffect: string;
  color: string;
}

export const AFFINITY_DEFINITIONS: Record<AffinityType, AffinityDefinition> = {
  avian: {
    id: 'avian',
    label: 'Avian Insight',
    familyLabel: 'Birds & Raptors',
    buffedGem: 'staff',
    shortEffect: 'Scan matches count double toward objective progress.',
    color: '#60a5fa',
  },
  feline: {
    id: 'feline',
    label: 'Feline Stalk',
    familyLabel: 'Big Cats & Stealth',
    buffedGem: 'shield',
    shortEffect: 'Camouflage slows spook decay harder for longer.',
    color: '#f59e0b',
  },
  amphibian: {
    id: 'amphibian',
    label: 'Amphibian Crossing',
    familyLabel: 'Amphibians & Frogs',
    buffedGem: 'key',
    shortEffect: 'Traverse matches count double on water-heavy nodes.',
    color: '#34d399',
  },
  primate: {
    id: 'primate',
    label: 'Primate Cache',
    familyLabel: 'Primates & Clever Mammals',
    buffedGem: 'crate',
    shortEffect: 'Pack matches upgrade crate drops to stronger tools.',
    color: '#f97316',
  },
  insect: {
    id: 'insect',
    label: 'Insect Swarm',
    familyLabel: 'Insects & Fast Fauna',
    buffedGem: 'sword',
    shortEffect: 'Observe cascades pay out extra combo score.',
    color: '#facc15',
  },
  ungulate: {
    id: 'ungulate',
    label: 'Herd Stride',
    familyLabel: 'Hoofed & Herds',
    buffedGem: 'key',
    shortEffect: 'Traverse grants a small background camouflage pulse.',
    color: '#fb7185',
  },
  reptile: {
    id: 'reptile',
    label: 'Thermal Read',
    familyLabel: 'Reptiles & Snakes',
    buffedGem: 'staff',
    shortEffect: 'Scan matches seed extra counter gems into the refill queue.',
    color: '#22c55e',
  },
  fish: {
    id: 'fish',
    label: 'Current Rider',
    familyLabel: 'Fish & Aquatic',
    buffedGem: 'key',
    shortEffect: 'Traverse negates extra spook pressure on water nodes.',
    color: '#38bdf8',
  },
  arachnid: {
    id: 'arachnid',
    label: 'Silk Trap',
    familyLabel: 'Arachnids & Spiders',
    buffedGem: 'crate',
    shortEffect: 'Pack guarantees a tactical sighting tool.',
    color: '#a78bfa',
  },
  burrower: {
    id: 'burrower',
    label: 'Burrower Hide',
    familyLabel: 'Burrowers & Rodents',
    buffedGem: 'shield',
    shortEffect: 'Camouflage effectiveness is doubled.',
    color: '#c084fc',
  },
};

const FAMILY_AFFINITY_MAP: Record<string, AffinityType> = {
  Felidae: 'feline',
  Hominidae: 'primate',
  Cercopithecidae: 'primate',
  Cebidae: 'primate',
  Atelidae: 'primate',
  Callitrichidae: 'primate',
  Sciuridae: 'burrower',
  Muridae: 'burrower',
  Cricetidae: 'burrower',
  Geomyidae: 'burrower',
  Bathyergidae: 'burrower',
  Dendrobatidae: 'amphibian',
  Pipidae: 'amphibian',
  Microhylidae: 'amphibian',
  Rhacophoridae: 'amphibian',
  Arthroleptidae: 'amphibian',
  Ascaphidae: 'amphibian',
  Brevicipitidae: 'amphibian',
  Conrauidae: 'amphibian',
  Nasikabatrachidae: 'amphibian',
  Phyllomedusidae: 'amphibian',
  Rhinodermatidae: 'amphibian',
  Accipitridae: 'avian',
  Falconidae: 'avian',
  Strigidae: 'avian',
  Cathartidae: 'avian',
  Pandionidae: 'avian',
  Anatidae: 'avian',
  Ardeidae: 'avian',
  Scolopacidae: 'avian',
  Cyprinidae: 'fish',
  Cichlidae: 'fish',
  Salmonidae: 'fish',
  Serranidae: 'fish',
  Pomacentridae: 'fish',
  Sciaenidae: 'fish',
  Trionychidae: 'reptile',
  TRIONYCHIDAE: 'reptile',
  Testudinidae: 'reptile',
  Geoemydidae: 'reptile',
  Emydidae: 'reptile',
  Carettochelyidae: 'reptile',
  Platysternidae: 'reptile',
  Theraphosidae: 'arachnid',
  Araneidae: 'arachnid',
  Salticidae: 'arachnid',
  Lycosidae: 'arachnid',
  Scarabaeidae: 'insect',
  Formicidae: 'insect',
  Apidae: 'insect',
  Nymphalidae: 'insect',
  Carabidae: 'insect',
  Bovidae: 'ungulate',
  Cervidae: 'ungulate',
  Equidae: 'ungulate',
  Giraffidae: 'ungulate',
  Suidae: 'ungulate',
  Antilocapridae: 'ungulate',
};

const ORDER_AFFINITY_MAP: Record<string, AffinityType> = {
  Aves: 'avian',
  Accipitriformes: 'avian',
  Falconiformes: 'avian',
  Strigiformes: 'avian',
  Anseriformes: 'avian',
  Passeriformes: 'avian',
  Primates: 'primate',
  Rodentia: 'burrower',
  Lagomorpha: 'burrower',
  Araneae: 'arachnid',
  Coleoptera: 'insect',
  Hymenoptera: 'insect',
  Lepidoptera: 'insect',
  Odonata: 'insect',
  Anura: 'amphibian',
  Caudata: 'amphibian',
  Gymnophiona: 'amphibian',
  Serpentes: 'reptile',
  Testudines: 'reptile',
  Squamata: 'reptile',
  Perciformes: 'fish',
  Cypriniformes: 'fish',
  Salmoniformes: 'fish',
  Siluriformes: 'fish',
  Artiodactyla: 'ungulate',
  Cetartiodactyla: 'ungulate',
  Perissodactyla: 'ungulate',
  Carnivora: 'feline',
};

const CLASS_AFFINITY_MAP: Record<string, AffinityType> = {
  Amphibia: 'amphibian',
  Insecta: 'insect',
  Arachnida: 'arachnid',
  Reptilia: 'reptile',
  Aves: 'avian',
  Actinopterygii: 'fish',
  Chondrichthyes: 'fish',
};

function normalizeTaxon(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getAffinityDefinition(affinity: AffinityType): AffinityDefinition {
  return AFFINITY_DEFINITIONS[affinity];
}

export function getAffinityBuffedGem(affinity: AffinityType): AffinityGemType {
  return AFFINITY_DEFINITIONS[affinity].buffedGem;
}

export function getAffinityForSpecies(species: Species): AffinityType | null {
  const family = normalizeTaxon(species.family);
  if (family && FAMILY_AFFINITY_MAP[family]) {
    return FAMILY_AFFINITY_MAP[family];
  }

  const order = normalizeTaxon(species.taxon_order);
  if (order && ORDER_AFFINITY_MAP[order]) {
    return ORDER_AFFINITY_MAP[order];
  }

  const className = normalizeTaxon(species.class);
  if (className && CLASS_AFFINITY_MAP[className]) {
    return CLASS_AFFINITY_MAP[className];
  }

  if (species.freshwater || species.marine) {
    return 'fish';
  }

  return null;
}

export function deriveAvailableAffinities(species: Species[]): AffinityType[] {
  const derived = new Set<AffinityType>();
  for (const entry of species) {
    const affinity = getAffinityForSpecies(entry);
    if (affinity) {
      derived.add(affinity);
    }
  }
  return AFFINITY_TYPES.filter((affinity) => derived.has(affinity));
}

export function getDefaultActiveAffinities(availableAffinities: AffinityType[]): AffinityType[] {
  return availableAffinities.length > 0 ? [availableAffinities[0]] : [];
}

export function affinityBuffsGem(affinity: AffinityType, gemType: string | null | undefined): boolean {
  return gemType != null && AFFINITY_DEFINITIONS[affinity].buffedGem === gemType;
}

export function affinitySetBuffsGem(activeAffinities: AffinityType[], gemType: string | null | undefined): boolean {
  return activeAffinities.some((affinity) => affinityBuffsGem(affinity, gemType));
}
