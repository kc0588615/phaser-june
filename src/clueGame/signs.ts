// The signs: a note's open tags (no colon), shown beside the field guide's photo, each in its question category's group
// (plans 055, 058). This table is the vocabulary and is authoritative; docs/research/2026-11-07-moves-and-signs/sign-map.csv
// is the research record it was built from. It keeps every open tag ever shipped, retired ones included, so new
// code still loads rows an older content build wrote. Pure: queries only.
import { CHARGE_CATEGORIES, PREFIX_CATEGORY, prefixOf, questionText, type ChargeCategory, type Sign } from '@/clueGame/questionMatch';
import { tagOutcome } from '@/clueGame/deduction';

export interface SignEntry {
  category: ChargeCategory;
  /** Trait tags its plain reading states: the holder's record must not rule them out. */
  implies?: readonly string[];
  /** Trait tags its plain reading rules out: the holder must not hold them. */
  denies?: readonly string[];
  /** The asked trait tag its words simply are (tree_dweller -> trees:yes). */
  restates?: string;
}

const at = (category: ChargeCategory, rules: Omit<SignEntry, 'category'> = {}): SignEntry => ({ category, ...rules });
const FRESH_WATER = ['system:freshwater', 'habitat:wetlands'];
/** Eats plants (fruit, leaves, grass): not only meat, not mostly bugs. */
const NOT_PLANTS = ['diet:meat', 'diet:insects'];
/** Hunts or eats animals: not only plants. */
const NOT_ANIMALS = ['diet:plants'];
/** "Giant": large or huge. */
const NOT_BIG = ['size:tiny', 'size:small', 'size:medium'];

export const SIGNS: Readonly<Record<string, SignEntry>> = {
  above_tree_line: at('habitat', { implies: ['trees:no'], denies: ['habitat:forest'] }),
  algae_fur: at('body', { implies: ['covering:fur'] }),
  ambush_hunter: at('habits', { denies: NOT_ANIMALS }),
  backward_pouch: at('life'),
  bamboo_eater: at('habits', { denies: NOT_PLANTS }),
  bamboo_forest: at('habitat', { implies: ['habitat:forest'] }),
  basker: at('habits', { denies: ['activity:night'] }),
  big_ears: at('body'),
  big_leaper: at('habits'),
  big_rivers: at('habitat', { implies: FRESH_WATER }),
  black_and_white: at('body'),
  black_coat: at('body', { implies: ['covering:fur'] }),
  bone_claws: at('habits'),
  borrowed_burrows: at('habitat'),
  brackish_water: at('habitat'),
  bright_green: at('body'),
  bromeliad_eater: at('habits', { denies: NOT_PLANTS }),
  brown_throat: at('body'),
  builds_nests: at('habits', { implies: ['birth:eggs'] }),
  buries_itself: at('habits'),
  burrower: at('habits'),
  camouflage: at('body'),
  carries_young_on_back: at('life'),
  cecropia_leaves: at('habits', { denies: NOT_PLANTS }),
  chirps: at('habits'),
  climber: at('habits', { implies: ['trees:yes'] }),
  climbing_tail: at('body', { implies: ['trees:yes'] }),
  climbs_boulders: at('habits', { implies: ['habitat:rocky'] }),
  coalitions: at('habits', { implies: ['social:groups'] }),
  coastal_dunes: at('habitat', { implies: ['habitat:marine', 'habitat:desert'] }),
  cold_streams: at('habitat', { implies: FRESH_WATER }),
  crevice_hider: at('habits', { implies: ['habitat:rocky'] }),
  cub_mane: at('life', { implies: ['covering:fur', 'birth:live'] }),
  digging_claws: at('habits'),
  dung_piles: at('habits'),
  ear_spots: at('body'),
  eats_lichen: at('habits', { denies: NOT_PLANTS }),
  egg_guarding: at('life', { implies: ['birth:eggs'] }),
  eggs_on_land: at('life', { implies: ['birth:eggs', 'system:terrestrial'] }),
  eggs_over_water: at('life', { implies: ['birth:eggs'] }),
  electric_sense: at('habits'),
  ever_growing_teeth: at('body'),
  eye_glands: at('body'),
  face_markings: at('body'),
  face_mask: at('body'),
  false_thumb: at('body'),
  fast_runner: at('habits'),
  fast_streams: at('habitat', { implies: FRESH_WATER }),
  father_carries_young: at('life'),
  feathery_gills: at('body', { implies: ['habitat:wetlands'] }),
  feeds_on_ground: at('habits'),
  fish_eater: at('habits', { denies: NOT_ANIMALS }),
  five_front_claws: at('body'),
  flat_body: at('body'),
  flat_shell: at('body', { implies: ['covering:shell'] }),
  flippers: at('body', { implies: ['habitat:wetlands'] }),
  floreana_island: at('habitat'),
  foam_nest: at('life', { implies: ['birth:eggs'] }),
  fog_drinker: at('habitat'),
  forest_floor: at('habits', { implies: ['trees:no', 'habitat:forest'] }),
  forest_streams: at('habitat', { implies: [...FRESH_WATER, 'habitat:forest'] }),
  four_toes: at('body'),
  fruit_eater: at('habits', { denies: NOT_PLANTS }),
  fully_aquatic: at('habits', { implies: ['habitat:wetlands'], denies: ['system:terrestrial', 'habitat:forest', 'trees:yes'] }),
  furry_feet: at('body', { implies: ['covering:fur'] }),
  giant_frog: at('body', { implies: ['covering:skin', 'birth:eggs'], denies: NOT_BIG }),
  giant_tortoise: at('body', { implies: ['covering:shell', 'birth:eggs', 'system:terrestrial', 'lifespan:long'], denies: NOT_BIG }),
  giant_turtle: at('body', { implies: ['covering:shell', 'birth:eggs', 'lifespan:long'], denies: NOT_BIG }),
  glider: at('habits', { implies: ['trees:yes'] }),
  grasping_lip: at('body'),
  grazer: at('habits', { denies: NOT_PLANTS }),
  hair_like_frills: at('body', { implies: ['covering:fur'] }),
  hangs_upside_down: at('habits', { implies: ['trees:yes'] }),
  hard_toe_tips: at('body'),
  high_mountains: at('habitat'),
  hinged_shell: at('body', { implies: ['covering:shell'] }),
  hisses: at('habits'),
  hooves: at('body'),
  horns: at('body'),
  huge_head: at('body'),
  internal_fertilization: at('life', { implies: ['birth:live'] }),
  kopjes: at('habitat', { implies: ['habitat:rocky'] }),
  large_eyes: at('body'),
  leaf_eater: at('habits', { denies: NOT_PLANTS }),
  leaf_litter: at('habitat', { implies: ['habitat:forest'] }),
  leg_spurs: at('body'),
  lidless_eyes: at('body'),
  long_arms: at('body'),
  long_finger: at('body'),
  long_legs: at('body'),
  long_tail: at('body'),
  long_tongue: at('body'),
  loud_calls: at('habits'),
  low_rumbles: at('habits'),
  mane: at('body', { implies: ['covering:fur'] }),
  many_teeth: at('body'),
  mother_carries_young: at('life'),
  mountain_meadows: at('habitat', { implies: ['habitat:grassland'] }),
  mud_bather: at('habits'),
  neck_hump: at('body'),
  nectar_drinker: at('habits', { denies: ['diet:meat'] }),
  never_climbs: at('habits', { implies: ['trees:no', 'habitat:forest'] }),
  no_tadpoles: at('life', { implies: ['birth:live'] }),
  no_tongue: at('habits'),
  nomadic: at('habits'),
  often_in_trees: at('habits', { implies: ['trees:yes', 'habitat:forest'] }),
  one_island: at('range'),
  orange_feet: at('body'),
  pack_hunter: at('habits', { implies: ['social:groups'], denies: NOT_ANIMALS }),
  paddle_tail: at('body', { implies: ['habitat:wetlands'] }),
  patchy_coat: at('body', { implies: ['covering:fur'] }),
  pig_nose: at('body'),
  pinta_island: at('habitat'),
  pointed_snout: at('body'),
  poor_eyesight: at('habits'),
  pouch: at('life'),
  prairie_dog_towns: at('habitat', { implies: ['habitat:grassland'] }),
  puffs_up: at('habits'),
  purple_gray: at('body'),
  pushes_over_trees: at('habits'),
  raids_termite_mounds: at('habits', { denies: NOT_ANIMALS }),
  rain_breeder: at('life'),
  rarely_drinks: at('habits'),
  red_eyes: at('body'),
  red_orange: at('body'),
  reddish_fur: at('body', { implies: ['covering:fur'] }),
  regrows_body_parts: at('habits'),
  rests_by_waterfalls: at('habits', { implies: FRESH_WATER }),
  rests_on_bottom: at('habits', { implies: ['habitat:wetlands'] }),
  ringed_tail: at('body'),
  rock_basker: at('habits', { denies: ['activity:night'] }),
  rock_climber: at('habits', { implies: ['trees:yes'] }),
  rodent_hunter: at('habits', { denies: NOT_ANIMALS }),
  rolls_into_ball: at('habits'),
  roosts_in_trees: at('habits', { implies: ['trees:yes', 'habitat:forest'] }),
  round_body: at('body'),
  s_shaped_horns: at('body'),
  saddleback_shell: at('body', { implies: ['covering:shell'] }),
  salt_licks: at('habits'),
  sand_dunes: at('habitat', { implies: ['habitat:desert'] }),
  sand_swimmer: at('habits', { implies: ['system:freshwater'] }),
  sandy_bottoms: at('habitat', { implies: FRESH_WATER }),
  scavenger: at('habits', { denies: NOT_ANIMALS }),
  scent_marks: at('habits'),
  screecher: at('habits'),
  seasonal_streams: at('habitat', { implies: FRESH_WATER }),
  seed_spreader: at('habits', { denies: NOT_PLANTS }),
  seldom_on_ground: at('habits', { implies: ['trees:yes'] }),
  senses_vibrations: at('habits'),
  shallow_wetlands: at('habitat', { implies: FRESH_WATER }),
  shares_food: at('habits', { denies: ['social:alone'] }),
  shell_spines: at('body', { implies: ['covering:shell'] }),
  shoulder_stripe: at('body'),
  side_frills: at('body'),
  skin_folds: at('body', { implies: ['covering:skin'] }),
  sleeping_nests: at('habits'),
  sleeps_high_in_trees: at('habits', { implies: ['trees:yes'] }),
  slow_mover: at('habits'),
  snorkel_nose: at('habits', { implies: FRESH_WATER }),
  snowy_winters: at('habitat'),
  snub_nose: at('body'),
  soars: at('habits'),
  spectacles: at('body'),
  spiky_shell: at('body', { implies: ['covering:shell'] }),
  spiny_forest: at('habitat', { implies: ['habitat:forest'] }),
  spiral_horns: at('body'),
  spots: at('body'),
  spotted_belly: at('body'),
  squeaker: at('habits'),
  stands_on_hind_legs: at('habits'),
  star_fingers: at('body'),
  star_pattern: at('body'),
  startle_display: at('habits'),
  stays_larval: at('life'),
  stays_underground: at('habits'),
  sticky_skin: at('habits', { implies: ['covering:skin'] }),
  stores_food: at('habits'),
  striped_young: at('life'),
  stripes: at('body'),
  strong_bite: at('body'),
  stubby_tail: at('body'),
  sucker_mouth_tadpoles: at('life', { implies: ['birth:eggs'] }),
  super_hearing: at('body'),
  surfaces_to_breed: at('life'),
  swimmer: at('habits', { implies: FRESH_WATER }),
  tail_organ: at('body'),
  tap_forager: at('habits'),
  tear_lines: at('body'),
  temperature_sex: at('life'),
  territorial: at('habits'),
  throat_patch: at('body'),
  tooth_plate: at('body'),
  toothless: at('body'),
  town_dweller: at('habitat'),
  tree_dweller: at('habits', { implies: ['trees:yes', 'habitat:forest'], restates: 'trees:yes' }),
  trunk: at('body'),
  tube_teeth: at('body'),
  tusks: at('body'),
  underwater_breathing: at('body', { implies: ['habitat:wetlands'] }),
  uses_tools: at('habits'),
  venomous: at('body'),
  vertical_pupils: at('body'),
  voiceless: at('habits'),
  walks_on_knuckles: at('habits'),
  walks_upright: at('habits'),
  warning_colors: at('body'),
  webbed_feet: at('body'),
  whistle_calls: at('habits'),
  white_belly: at('body'),
  white_ear_rims: at('body'),
  white_tail_tip: at('body'),
  wings: at('body'),
  winter_rest: at('habits'),
  yellow_head: at('body'),
  yellow_legs: at('body'),
  yellow_scales: at('body', { implies: ['covering:scales'] }),
};

const openTags = (tags: readonly string[] | undefined): string[] => (tags ?? []).filter(tag => !tag.includes(':'));

/** An open tag as a short phrase for a suspect's signs (digging_claws -> "digging claws"). */
export const signPhrase = (tag: string): string => tag.replace(/_/g, ' ');

/** A suspect's signs: the open tags its field guide records (not the question traits), in tag order. Throws on a tag missing from SIGNS. */
export const signsOf = (tags: readonly string[] | undefined): Sign[] => openTags(tags).map(tag => ({ tag, text: signPhrase(tag), category: signCategory(tag) }));

/** The question category a sign sits under. Throws on a tag missing from SIGNS. */
export function signCategory(tag: string): ChargeCategory {
  const entry = SIGNS[tag];
  if (!entry) throw new Error(`Unknown sign "${tag}": add it to SIGNS (src/clueGame/signs.ts) with its category`);
  return entry.category;
}

/** The distinct categories of a note's signs, in CHARGE_CATEGORIES order. */
export function noteCategories(tags: readonly string[] | undefined): ChargeCategory[] {
  const found = new Set(openTags(tags).map(signCategory));
  return CHARGE_CATEGORIES.filter(category => found.has(category));
}

/**
 * What's wrong with a profile's signs, given its record (every tag of its clues): a tag missing from SIGNS, a
 * tag whose plain reading contradicts the record (the game's own exclusive/complete rule), or one whose words
 * simply state an asked answer. Empty when every sign is evidence that agrees with its holder.
 */
export function signProblems(clues: ReadonlyArray<{ tags?: readonly string[] }>, record: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  for (const tag of new Set(clues.flatMap(clue => openTags(clue.tags)))) {
    const entry = SIGNS[tag];
    if (!entry) {
      problems.push(`sign "${tag}" is not in SIGNS: add it to SIGNS with its category`);
      continue;
    }
    const conflicts = [
      ...(entry.implies ?? []).filter(implied => ['exclusive-conflict', 'complete-conflict'].includes(tagOutcome(implied, record))),
      ...(entry.denies ?? []).filter(denied => record.has(denied)).map(denied => `not ${denied}`),
    ];
    if (conflicts.length) problems.push(`sign "${tag}" contradicts its holder's record (it reads as ${conflicts.join(', ')}): tag what the note shows`);
    if (entry.restates && PREFIX_CATEGORY[prefixOf(entry.restates)]) problems.push(`sign "${tag}" states the answer to "${questionText(entry.restates)}": tag what the note shows`);
  }
  return problems;
}
