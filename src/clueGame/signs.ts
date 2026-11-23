// The signs: a note's open tags (no colon), shown beside the field guide's photo, each in its question category's group
// (plans 055, 058). This table is the vocabulary and is authoritative: each active sign's `meaning` is its definition
// (plan 2026-11-23-sign-audit); docs/research/2026-11-07-moves-and-signs/sign-map.csv is the research record it was built
// from. It keeps every open tag ever shipped, retired ones included, so new code still loads rows an older content build
// wrote. Pure: queries only.
import { CHARGE_CATEGORIES, type ChargeCategory, type Sign } from '@/clueGame/questionMatch';
import { tagOutcome } from '@/clueGame/deduction';
import { COMPLETE_PREFIXES, EXCLUSIVE_PREFIXES, prefixOf } from '@/clueGame/traits';

/** A sign players can be shown and authors can tag. */
export interface ActiveSignEntry {
  category: ChargeCategory;
  /** The definition: what counts and what doesn't, one line. Authoritative for tagging and for the audit. */
  meaning: string;
  /** What its meaning entails. Trait tags (`prefix:value`): the holder's record must not rule them out.
   *  Open tags (active signs): strictly broader signs the holder therefore also holds (witness fits, rule checks).
   *  An open-tag edge is listed only once it passes the wording gate (plan 2026-11-23-sign-audit §2.1). */
  implies?: readonly string[];
  /** What its meaning rules out. Trait tags: the holder must not hold them. Open tags: the holder must not hold
   *  that sign or any sign implying it. One direction is enough for a mutual exclusion. */
  denies?: readonly string[];
  retired?: never;
}
/** A tag kept only so rows an older content build wrote still load. No rules, no meaning; never tagged again. */
export interface RetiredSignEntry { category: ChargeCategory; retired: true }
export type SignEntry = ActiveSignEntry | RetiredSignEntry;
export type SignTable = Readonly<Record<string, SignEntry>>;

const at = (category: ChargeCategory, meaning: string, rules: Pick<ActiveSignEntry, 'implies' | 'denies'> = {}): ActiveSignEntry => ({ category, meaning, ...rules });
const retired = (category: ChargeCategory): RetiredSignEntry => ({ category, retired: true });
const FRESH_WATER = ['system:freshwater', 'habitat:wetlands'];
/** Eats plants (fruit, leaves, grass): not only meat, not mostly bugs. */
const NOT_PLANTS = ['diet:meat', 'diet:insects'];
/** Hunts or eats animals: not only plants. */
const NOT_ANIMALS = ['diet:plants'];
/** "Giant": large or huge. */
const NOT_BIG = ['size:tiny', 'size:small', 'size:medium'];
const isTrait = (tag: string): boolean => tag.includes(':');
const openTags = (tags: readonly string[] | undefined): string[] => (tags ?? []).filter(tag => !isTrait(tag));
const CONFLICTS = new Set(['exclusive-conflict', 'complete-conflict']);

export const SIGNS: SignTable = {
  above_tree_line: at('habitat', "Lives at least partly in the open high-mountain zone above the tree line, where it is too high and cold for trees to grow (living only in forest below it doesn't count).", { implies: ['trees:no', 'high_mountains'] }),
  algae_fur: at('body', "Algae grow in its fur or hair and tint it green (algae on a shell or skin don't count).", { implies: ['covering:fur'] }),
  ambush_hunter: at('habits', 'Catches prey mainly by hiding or waiting still and striking when prey comes close, rather than chasing it down.', { denies: NOT_ANIMALS }),
  backward_pouch: at('life', "The female's pouch opens toward her back legs (rear-facing), not toward her head."),
  bamboo_eater: at('habits', 'Bamboo (leaves, stems or shoots) is its main food.', { denies: NOT_PLANTS }),
  bamboo_forest: at('habitat', "Lives in forest with a thick undergrowth of bamboo (eating bamboo elsewhere doesn't count).", { implies: ['habitat:forest'] }),
  basker: at('habits', "Regularly lies in the sun to warm its body, on logs, rocks, banks or at the water's surface.", { denies: ['activity:night'] }),
  big_ears: at('body', "Its ears are large for its head, clearly bigger than most relatives' (sources call them big, large or huge)."),
  big_leaper: at('habits', 'Moves or attacks with long leaps, covering several times its own body length in one jump.'),
  big_rivers: at('habitat', 'Lives in large rivers (main channels, deep pools or backwaters), not only in small streams or ponds.', { implies: FRESH_WATER }),
  black_and_white: at('body', "Its coat or skin is mainly black and white, in large bold patches (a striped coat doesn't count, see stripes)."),
  black_coat: at('body', 'Its fur is black or nearly black all over, in all or some individuals (a black color form counts).', { implies: ['covering:fur'] }),
  bone_claws: at('habits', "Can push sharp bones out through the skin of its toes as claws when grabbed (ordinary claws don't count)."),
  borrowed_burrows: at('habitat', "Sleeps, hides or raises young in burrows or dens that other animals dug (holes it digs itself don't count)."),
  brackish_water: at('habitat', 'Lives at least partly in brackish water, part salty and part fresh, as in estuaries, coastal lagoons or mangroves.'),
  bright_green: at('body', 'Its body is mostly bright, leaf green.'),
  bromeliad_eater: at('habits', 'Bromeliads (spiky plants of the pineapple family) are one of its main foods.', { denies: NOT_PLANTS }),
  brown_throat: at('body', 'Its throat is brown, standing out from the different color around it.', { implies: ['throat_patch'] }),
  builds_nests: retired('habits'),
  buries_itself: at('habits', "Hides or rests buried, covered by sand, mud, soil or fallen leaves, often with only its head out (resting inside a burrow doesn't count)."),
  burrower: at('habits', "Digs into the ground on land: digs burrows, tunnels or dens, or digs its body down into soil or sand (only resting in burrows others dug, or burying itself in leaves or underwater sand/mud, doesn't count)."),
  camouflage: at('body', 'Its color or pattern helps it blend in with its surroundings so it is hard to see.'),
  carries_young_on_back: at('life', "A mother carries her baby riding or clinging on her back (eggs embedded in skin and fathers carrying tadpoles don't count, see mother_carries_young and father_carries_young)."),
  cecropia_leaves: at('habits', 'Leaves of Cecropia trees are a main part of its food.', { implies: ['leaf_eater'], denies: NOT_PLANTS }),
  chirps: at('habits', 'Makes short, high, bird-like chirping calls.'),
  climber: at('habits', "Climbs well or often, in trees, on rocks or both (only scrambling onto logs or banks doesn't count)."),
  climbing_tail: retired('body'),
  climbs_boulders: at('habits', 'Climbs up big rocks, boulders or cliffs.', { implies: ['climber'] }),
  coalitions: retired('habits'),
  coastal_dunes: retired('habitat'),
  cold_streams: at('habitat', 'Lives in or by cool or cold, clear streams, often mountain streams.', { implies: FRESH_WATER }),
  crevice_hider: at('habits', 'Hides in narrow cracks and gaps between or under rocks.', { implies: ['habitat:rocky'] }),
  cub_mane: at('life', 'Its cubs or young have a mane or cape of long fur on the neck and back, which adults lose.', { implies: ['covering:fur', 'birth:live'] }),
  digging_claws: at('habits', 'Has strong, long claws that it digs with (soil, ant or termite nests, or rotten wood).'),
  dung_piles: at('habits', 'Leaves its dung in piles it comes back to (middens), as messages to others of its kind.', { implies: ['scent_marks'] }),
  ear_spots: at('body', 'Has a bold spot of contrasting color on the back of each ear.'),
  eats_lichen: at('habits', 'Lichens are a regular part of its food.', { denies: NOT_PLANTS }),
  egg_guarding: at('life', 'A parent stays with its eggs or nest and guards them until they hatch.', { implies: ['birth:eggs'] }),
  eggs_on_land: at('life', 'Lays its eggs out of the water, on land or underground, away from water.', { implies: ['birth:eggs', 'system:terrestrial'] }),
  eggs_over_water: at('life', 'Lays its eggs on leaves or branches hanging over water, so the hatching tadpoles drop in.', { implies: ['birth:eggs'] }),
  electric_sense: at('habits', "Can sense the weak electric signals of other animals' bodies, to find prey."),
  ever_growing_teeth: at('body', 'Some of its teeth keep growing all its life, worn down by use.'),
  eye_glands: at('body', 'Has large scent glands just below or in front of its eyes.'),
  face_markings: at('body', 'Has bold markings of a contrasting color on its face: patches, rings, a mask, crescents or lines.'),
  face_mask: at('body', 'A dark band or patch across its eyes looks like a mask.'),
  false_thumb: at('body', 'Has a "false thumb": an enlarged wrist bone or extra digit that it uses like a thumb to grip.'),
  fast_runner: at('habits', 'Runs fast: it can sprint or chase at about 50 km/h or more.'),
  fast_streams: at('habitat', 'Lives in or by fast-flowing streams or rivers with rushing water.', { implies: FRESH_WATER }),
  father_carries_young: at('life', 'The father carries the eggs or young (such as tadpoles) on or in his body.'),
  feathery_gills: at('body', 'Has feathery gills sticking out from its body (outside gills) as an adult.', { implies: ['habitat:wetlands'] }),
  feeds_on_ground: at('habits', 'Finds most of its food on the ground, even if it can climb.'),
  fish_eater: at('habits', 'Fish are a main part of its food.', { denies: NOT_ANIMALS }),
  five_front_claws: at('body', 'Has five claws on each front foot.'),
  flat_body: at('body', 'Its body (and often its head) is very flat, much wider than it is tall.'),
  flat_shell: at('body', 'Its shell is very flat and low, not domed.', { implies: ['covering:shell'] }),
  flippers: at('body', "Its legs (at least its front legs) are flat, paddle-shaped flippers (webbed feet alone don't count).", { implies: ['habitat:wetlands'] }),
  floreana_island: at('habitat', 'Lives (or lived) wild only on Floreana Island in the Galápagos.', { implies: ['one_island'] }),
  foam_nest: at('life', 'Makes a nest of foam for its eggs.', { implies: ['birth:eggs'] }),
  fog_drinker: at('habitat', 'Gets much of the water it needs from fog or mist.'),
  forest_floor: at('habits', 'Lives and feeds on the ground of a forest, rarely if ever climbing up into the trees.', { implies: ['trees:no', 'habitat:forest'], denies: ['often_in_trees', 'seldom_on_ground'] }),
  forest_streams: at('habitat', 'Lives in or by streams that run through forest.', { implies: [...FRESH_WATER, 'habitat:forest'] }),
  four_toes: at('body', 'Has only four toes on each foot, front and back.'),
  fruit_eater: at('habits', 'Fruit is a main or favorite part of its food.', { denies: NOT_PLANTS }),
  fully_aquatic: at('habits', 'Spends its whole life in water and rarely or never comes out onto land.', { implies: ['habitat:wetlands'], denies: ['trees:yes', 'eggs_on_land'] }),
  furry_feet: at('body', 'The soles of its feet are covered in fur.', { implies: ['covering:fur'] }),
  giant_frog: retired('body'),
  giant_tortoise: at('body', 'A giant tortoise: a land tortoise whose shell grows to about 70 cm long or more.', { implies: ['covering:shell', 'birth:eggs', 'system:terrestrial', 'lifespan:long'], denies: NOT_BIG }),
  giant_turtle: at('body', 'A giant turtle: a water turtle whose shell grows to about 80 cm long or more.', { implies: ['covering:shell', 'birth:eggs', 'lifespan:long'], denies: NOT_BIG }),
  glider: at('habits', 'Glides through the air from tree to tree on skin flaps or webbed feet, without flapping wings.', { implies: ['trees:yes'] }),
  grasping_lip: at('body', 'Its upper lip is pointed and grabs leaves and twigs like a finger.'),
  grazer: at('habits', 'Mostly eats grass or other low plants it crops from the ground, rather than leaves of shrubs and trees.', { denies: NOT_PLANTS }),
  hair_like_frills: retired('body'),
  hangs_upside_down: at('habits', 'Often hangs upside down from branches.', { implies: ['trees:yes', 'often_in_trees'] }),
  hard_toe_tips: at('body', 'Its toe tips are hard (horny) for gripping.'),
  high_mountains: at('habitat', "Lives high up in mountains: upper slopes, high plateaus or alpine zones (foothills and low hills don't count)."),
  hinged_shell: at('body', 'Its shell has a hinge, so it can close up.', { implies: ['covering:shell'] }),
  hisses: at('habits', 'Makes a loud hissing sound.'),
  hooves: at('body', "Walks on hooves: toes that end in hard hoof, including tapirs' and rhinos' hoofed toes."),
  horns: at('body', "Has horns on its head, in at least one sex: bony horns, rhino horns, or skin-covered horns like the okapi's (antlers and tusks don't count)."),
  huge_head: at('body', 'Its head is very large for its body.'),
  internal_fertilization: retired('life'),
  kopjes: at('habitat', 'Lives on kopjes: rocky hills or rock piles rising from the African plains.', { implies: ['habitat:rocky'] }),
  large_eyes: at('body', 'Its eyes are large for its head (sources call them big or large).'),
  leaf_eater: at('habits', 'Leaves are a main part of its food.', { denies: NOT_PLANTS }),
  leaf_litter: at('habitat', 'Lives among the fallen leaves (leaf litter) on a forest floor.', { implies: ['habitat:forest', 'forest_floor'] }),
  leg_spurs: at('body', 'Has big, pointed, spur-like scales or spurs on its legs.'),
  lidless_eyes: at('body', 'Its eyes have no eyelids.'),
  long_arms: at('body', 'Its arms are very long, longer than its legs.'),
  long_finger: at('body', 'One finger on each hand is much longer and thinner than the others.'),
  long_legs: at('body', 'Its legs are very long for its body.'),
  long_tail: at('body', 'Its tail is long: about as long as its head and body, or at least two-thirds of that.'),
  long_tongue: at('body', 'Its tongue is very long and reaches far out of its mouth, often sticky, for catching insects or grabbing leaves.'),
  loud_calls: at('habits', 'Makes loud calls that carry far: songs, hoots, barks, roars or wails.'),
  low_rumbles: at('habits', 'Calls with deep, low rumbles, some too low for people to hear.'),
  mane: at('body', 'Adults have a mane: a crest or ruff of longer hair on the neck or back.', { implies: ['covering:fur'] }),
  many_teeth: at('body', 'Has an unusually large number of teeth, far more than most animals of its kind.'),
  mother_carries_young: at('life', "The mother carries her eggs or young on her body as she moves about: on her back, belly or tail, or in pockets in her skin (young in a pouch don't count, see pouch)."),
  mountain_meadows: at('habitat', 'Lives in grassy meadows high on mountainsides.', { implies: ['habitat:grassland', 'high_mountains'] }),
  mud_bather: at('habits', 'Wallows in mud, or coats itself with mud, to cool off or protect its skin.'),
  neck_hump: at('body', 'Has a raised hump or crest on the back of its head and neck.'),
  nectar_drinker: at('habits', 'Drinks nectar from flowers.', { denies: ['diet:meat'] }),
  never_climbs: at('habits', 'Never climbs trees: it stays on or under the ground, or in water.', { implies: ['trees:no'], denies: ['often_in_trees', 'seldom_on_ground', 'hangs_upside_down', 'roosts_in_trees', 'sleeps_high_in_trees'] }),
  no_tadpoles: retired('life'),
  no_tongue: at('habits', 'Has no tongue.', { denies: ['long_tongue'] }),
  nomadic: at('habits', 'Has no fixed home area: it wanders or migrates over long distances, following food, water or rain.'),
  often_in_trees: at('habits', 'Spends much of its time up in trees, feeding, resting or sleeping there, even if it also travels on the ground.'),
  one_island: at('range', "Its whole wild range today (or when it was last alive, if extinct) is on one island, of any size (Madagascar, New Guinea or Tasmania count; a continent like Australia doesn't; two or more islands don't)."),
  orange_feet: at('body', 'Its feet (toes or toe pads) are orange.'),
  pack_hunter: at('habits', 'Hunts together with others of its group to catch prey.', { implies: ['social:groups'], denies: NOT_ANIMALS }),
  paddle_tail: at('body', 'Its tail is flattened like a paddle or oar, for swimming.', { implies: ['habitat:wetlands'] }),
  patchy_coat: at('body', 'Its coat is a blotchy patchwork of several colors, different on each animal.', { implies: ['covering:fur'] }),
  pig_nose: at('body', 'Its nose ends in a flat, round, pig-like snout disc with the nostrils at the front.'),
  pinta_island: at('habitat', 'Lives (or lived) wild only on Pinta Island in the Galápagos.', { implies: ['one_island'] }),
  pointed_snout: at('body', 'Its snout is long, or ends in a narrow, pointed tip.'),
  poor_eyesight: at('habits', 'Sees poorly or is blind, and relies mainly on other senses (smell, hearing or touch).'),
  pouch: at('life', 'The female has a pouch on her belly where her baby (or egg) grows.'),
  prairie_dog_towns: at('habitat', 'Lives in prairie dog colonies ("towns") and uses their burrows (not the same as living near people, see town_dweller).', { implies: ['habitat:grassland'] }),
  puffs_up: at('habits', 'Puffs its body up with air when threatened.'),
  purple_gray: at('body', 'Its body is dark purplish gray.'),
  pushes_over_trees: at('habits', 'Pushes or knocks over whole trees to feed.'),
  raids_termite_mounds: at('habits', "Breaks open ant or termite nests or mounds with its claws or snout to eat the insects inside (poking tools into openings doesn't count).", { denies: NOT_ANIMALS }),
  rain_breeder: at('life', 'Breeds when heavy rains come, often in pools or puddles the rain fills.'),
  rarely_drinks: at('habits', 'Can go days or longer without drinking, getting most of its water from its food.'),
  red_eyes: at('body', 'Its eyes are red.'),
  red_orange: at('body', 'Its body is bright red-orange.'),
  reddish_fur: at('body', 'Its fur is mostly red, reddish brown or golden red.', { implies: ['covering:fur'] }),
  regrows_body_parts: at('habits', 'Can regrow lost body parts such as legs, tail or gills.'),
  rests_by_waterfalls: at('habits', 'Rests on wet rocks by waterfalls or rapids.', { implies: FRESH_WATER }),
  rests_on_bottom: at('habits', 'Rests on the bottom of a river, lake or pond, under water.', { implies: ['habitat:wetlands'] }),
  ringed_tail: at('body', 'Its tail has rings of alternating colors.'),
  rock_basker: retired('habits'),
  rock_climber: retired('habits'),
  rodent_hunter: at('habits', 'Rodents are a main part of its prey.', { denies: NOT_ANIMALS }),
  rolls_into_ball: at('habits', 'Curls up into a tight ball to protect itself.'),
  roosts_in_trees: at('habits', 'Rests (roosts) hanging or perching in tree branches, often in groups.', { implies: ['trees:yes', 'habitat:forest', 'often_in_trees'] }),
  round_body: at('body', 'Its body is round and puffy.'),
  s_shaped_horns: at('body', 'Its horns curve back and then up or forward, making an S shape seen from the side.'),
  saddleback_shell: at('body', 'Its shell is a "saddleback": raised high at the front, above the neck.', { implies: ['covering:shell'] }),
  salt_licks: at('habits', 'Seeks out salt licks, or mineral-rich soil, clay or water, to get minerals.'),
  sand_dunes: at('habitat', 'Lives on or in sand dunes, coastal or inland.'),
  sand_swimmer: retired('habits'),
  sandy_bottoms: at('habitat', 'Lives in rivers or lakes with soft, sandy or muddy bottoms.', { implies: FRESH_WATER }),
  scavenger: at('habits', 'Often eats animals that are already dead (carrion).', { denies: NOT_ANIMALS }),
  scent_marks: at('habits', "Marks its home area, paths or objects with scent: urine, dung or rubbed-on gland scent (just having scent glands doesn't count)."),
  screecher: at('habits', 'Makes loud, harsh screeches.'),
  seasonal_streams: retired('habitat'),
  seed_spreader: at('habits', 'Spreads plant seeds to new places, mostly by eating fruit and passing the seeds in its droppings.', { denies: NOT_PLANTS }),
  seldom_on_ground: at('habits', 'Lives in trees and seldom comes down to the ground.', { implies: ['trees:yes', 'often_in_trees'] }),
  senses_vibrations: at('habits', 'Feels vibrations or ripples through the ground or water, to sense prey, danger or others.'),
  shallow_wetlands: at('habitat', 'Lives in shallow, still water such as marshes, ponds and bogs.', { implies: FRESH_WATER }),
  shares_food: at('habits', "Shares food with, or brings food to, other members of its group beyond its own young (a parent feeding only its own young doesn't count).", { denies: ['social:alone'] }),
  shell_spines: at('body', 'Has small spines or pointed bumps on its shell, mainly along the front edge.', { implies: ['covering:shell'] }),
  shoulder_stripe: at('body', 'A single bold stripe runs across its shoulders.'),
  side_frills: at('body', 'Grows thin, hair-like flaps of skin on its sides (and thighs).'),
  skin_folds: at('body', 'Its skin has deep folds, like plates of armor.', { implies: ['covering:skin'] }),
  sleeping_nests: at('habits', 'Builds a nest or bed (of leaves, branches or grass) to sleep or rest in, in a tree or on the ground.'),
  sleeps_high_in_trees: at('habits', 'Sleeps or rests high up in trees.', { implies: ['trees:yes', 'often_in_trees'] }),
  slow_mover: at('habits', 'Moves very slowly, even when disturbed.', { denies: ['fast_runner'] }),
  snorkel_nose: at('habits', 'Can breathe through the tip of its raised nose, snout or trunk while the rest of its body stays under water.'),
  snowy_winters: at('habitat', 'Lives where snow covers the ground for weeks or months in winter.'),
  snub_nose: at('body', 'Its nose is short, flat and turned up.'),
  soars: at('habits', 'Soars: glides on rising warm air without flapping.'),
  spectacles: at('body', 'Pale rings or markings around its eyes look like glasses.'),
  spiky_shell: at('body', 'Its shell has spikes or sharp points around its edge.', { implies: ['covering:shell'] }),
  spiny_forest: at('habitat', 'Lives in dry spiny forest: thorny, cactus-like forest and brush.', { implies: ['habitat:forest'] }),
  spiral_horns: at('body', 'Its horns twist in a spiral, like a corkscrew, along their length.'),
  spots: at('body', 'Its coat or skin is covered with spots or rosettes.'),
  spotted_belly: at('body', 'Its belly is spotted.'),
  squeaker: at('habits', 'Makes high squeaking calls.'),
  stands_on_hind_legs: at('habits', 'Rises up or moves on its back legs alone, at least sometimes: standing, rearing up, hopping or running upright.'),
  star_fingers: at('body', 'Each fingertip ends in a tiny star shape.'),
  star_pattern: at('body', 'Its shell or skin has lines spreading out like stars.'),
  startle_display: at('habits', 'Suddenly flashes bright colors (eyes or body) to startle a predator.'),
  stays_larval: at('life', 'Grows up and breeds while keeping its larval body (gills, life in water), never changing into a land form.'),
  stays_underground: retired('habits'),
  sticky_skin: at('habits', 'Its skin oozes a sticky glue when it is grabbed.', { implies: ['covering:skin'] }),
  stores_food: at('habits', 'Gathers food and stores it for later, such as haypiles for winter.'),
  striped_young: at('life', 'Its young have stripes (and sometimes spots) that fade as they grow up.'),
  stripes: at('body', "Has stripes: one or more long bands of contrasting color on its body or legs (tail rings don't count, see ringed_tail)."),
  strong_bite: at('body', 'Bites or chews with unusual force for its size.'),
  stubby_tail: at('body', 'Its tail is very short, just a stub.', { denies: ['long_tail'] }),
  sucker_mouth_tadpoles: at('life', 'Its tadpoles cling to rocks in fast water with a sucker-like mouth.', { implies: ['birth:eggs'] }),
  super_hearing: at('body', 'Has exceptionally sharp hearing that it relies on.'),
  surfaces_to_breed: at('life', 'Lives underground and comes to the surface only briefly, to breed.'),
  swimmer: at('habits', "Swims well or often, by choice, in water (moving through sand or soil doesn't count)."),
  tail_organ: at('body', 'Males have a tail-like body part used for mating.'),
  tap_forager: at('habits', 'Taps on wood or bark and listens for hollow spots to find hidden food.'),
  tear_lines: at('body', 'Dark lines run from the inner corner of each eye down to its mouth, like tear tracks.'),
  temperature_sex: at('life', "Whether its eggs hatch male or female depends on the nest's temperature."),
  territorial: at('habits', "Defends an area (a territory, home patch or den site) against others of its kind (fights over mates alone don't count)."),
  throat_patch: at('body', 'Has a patch or patches of contrasting color on its throat.'),
  tooth_plate: at('body', 'Has a bony, tooth-like plate in its jaw.'),
  toothless: at('body', 'Has no teeth at all as an adult.', { denies: ['many_teeth', 'tube_teeth', 'ever_growing_teeth', 'tusks'] }),
  town_dweller: at('habitat', 'Lives in or near human settlements: towns, villages, gardens, parks or plantations (not the same as prairie dog towns).'),
  tree_dweller: retired('habits'),
  trunk: at('body', "Has a trunk: a long, bendy nose joined with its upper lip (an elephant's long trunk or a tapir's short one)."),
  tube_teeth: at('body', 'Its teeth are made of many tiny tubes and have no enamel.'),
  tusks: at('body', 'Has tusks: long teeth that stick out of its mouth, in at least one sex.'),
  underwater_breathing: at('body', 'Can take in oxygen from the water (through gills, skin or throat) while it stays under water.', { implies: ['habitat:wetlands'] }),
  uses_tools: at('habits', 'Uses objects such as sticks or stones as tools to get food or do tasks.'),
  venomous: at('body', 'Can inject venom with a bite, sting or spur.'),
  vertical_pupils: at('body', 'Its pupils are vertical slits.'),
  voiceless: at('habits', "Makes no calls: no croaks, songs, squeaks or other voice sounds (a hiss of breath doesn't count as a call).", { denies: ['chirps', 'loud_calls', 'low_rumbles', 'screecher', 'squeaker', 'whistle_calls'] }),
  walks_on_knuckles: at('habits', 'Walks on its knuckles or the sides of its curled front feet, keeping its claws or fingers off the ground.'),
  walks_upright: at('habits', 'Usually walks on its back legs, using its front legs only now and then.'),
  warning_colors: at('body', 'Has bright colors that warn predators it is poisonous or bad to eat.'),
  webbed_feet: at('body', 'Has webbed feet: skin joins its toes.'),
  whistle_calls: at('habits', 'Calls with high whistles.'),
  white_belly: at('body', 'Its belly is plain white.'),
  white_ear_rims: at('body', 'Its ears have white edges.'),
  white_tail_tip: at('body', 'Its tail ends in white, or has a white band near its end.'),
  wings: at('body', 'Has wings it flies with.'),
  winter_rest: at('habits', 'Rests or sleeps through the winter, inactive for weeks or months (hibernation or brumation).'),
  yellow_head: at('body', 'Its head is mostly yellow.'),
  yellow_legs: at('body', 'Its legs are yellow (yellow skin or scales).'),
  yellow_scales: retired('body'),
};

const tableProblems = signTableProblems(SIGNS);
if (tableProblems.length) throw new Error(`SIGNS (src/clueGame/signs.ts) is broken:\n${tableProblems.join('\n')}`);
/** Each sign -> the open signs it transitively implies. */
const IMPLIED = buildImplied(SIGNS);

function lookup(table: SignTable, tag: string): SignEntry | undefined {
  return Object.hasOwn(table, tag) ? table[tag] : undefined;
}

function entryOf(tag: string, table: SignTable = SIGNS): SignEntry {
  const entry = lookup(table, tag);
  if (!entry) throw new Error(`Unknown sign "${tag}": add it to SIGNS (src/clueGame/signs.ts) with its category`);
  return entry;
}

/** The open-tag targets a sign's `implies` names directly (none for a retired or missing sign). */
function directImplies(entry: SignEntry | undefined): string[] {
  return entry && !entry.retired ? (entry.implies ?? []).filter(target => !isTrait(target)) : [];
}

/**
 * What's wrong with a sign table: an active sign with no meaning; a trait target whose prefix is in neither
 * EXCLUSIVE_PREFIXES nor COMPLETE_PREFIXES (a typo would match nothing); an open target missing or retired; a sign
 * implying or denying itself; a cycle of open-tag `implies`. Empty when the table is sound.
 */
export function signTableProblems(table: SignTable): string[] {
  const problems: string[] = [];
  for (const [tag, entry] of Object.entries(table)) {
    if (entry.retired) continue;
    if (!entry.meaning.trim()) problems.push(`sign "${tag}" has no meaning: write what counts and what doesn't`);
    for (const [rule, targets] of [['implies', entry.implies ?? []], ['denies', entry.denies ?? []]] as const) {
      for (const target of targets) {
        if (target === tag) problems.push(`sign "${tag}" ${rule} itself`);
        else if (isTrait(target)) {
          const prefix = prefixOf(target);
          if (!prefix || !(EXCLUSIVE_PREFIXES.has(prefix) || COMPLETE_PREFIXES.has(prefix))) {
            problems.push(`sign "${tag}" ${rule} "${target}", whose prefix is not a trait prefix`);
          }
        } else if (!lookup(table, target)) problems.push(`sign "${tag}" ${rule} "${target}", which is not in the table`);
        else if (lookup(table, target)!.retired) problems.push(`sign "${tag}" ${rule} "${target}", which is retired`);
      }
    }
  }
  return [...problems, ...impliesCycles(table)];
}

/** Each cycle of open-tag `implies` (self-edges aside), once, as its path: a -> b -> a. */
function impliesCycles(table: SignTable): string[] {
  const cycles: string[] = [];
  const done = new Set<string>();
  const visit = (tag: string, path: readonly string[]): void => {
    const start = path.indexOf(tag);
    if (start >= 0) {
      cycles.push(`signs imply each other in a cycle: ${[...path.slice(start), tag].join(' -> ')}`);
      return;
    }
    if (done.has(tag)) return;
    for (const next of directImplies(lookup(table, tag))) if (next !== tag) visit(next, [...path, tag]);
    done.add(tag);
  };
  for (const tag of Object.keys(table)) visit(tag, []);
  return cycles;
}

/** Each sign -> the open signs it transitively implies (empty for a retired sign). The table must have no cycles. */
export function buildImplied(table: SignTable): ReadonlyMap<string, ReadonlySet<string>> {
  return new Map(Object.keys(table).map(tag => {
    const implied = new Set<string>();
    const stack = directImplies(entryOf(tag, table));
    while (stack.length) {
      const next = stack.pop()!;
      if (!implied.has(next)) {
        implied.add(next);
        stack.push(...directImplies(entryOf(next, table)));
      }
    }
    return [tag, implied];
  }));
}

const closures = (table: SignTable): ReadonlyMap<string, ReadonlySet<string>> => (table === SIGNS ? IMPLIED : buildImplied(table));

/** The signs a record holds: its own open tags plus every sign they transitively imply. Throws on an unknown tag. */
export function heldSigns(tags: readonly string[] | undefined, table: SignTable = SIGNS): ReadonlySet<string> {
  const implied = closures(table);
  const held = new Set<string>();
  for (const tag of openTags(tags)) {
    entryOf(tag, table);
    held.add(tag);
    for (const broader of implied.get(tag)!) held.add(broader);
  }
  return held;
}

/** An open tag as a short phrase for a suspect's signs (digging_claws -> "digging claws"). */
export const signPhrase = (tag: string): string => tag.replace(/_/g, ' ');

/**
 * A suspect's signs: the distinct open tags its field guide records (not the question traits), in tag order, less any
 * sign another of them implies (one badge per fact). Throws on a tag missing from SIGNS.
 */
export function signsOf(tags: readonly string[] | undefined, table: SignTable = SIGNS): Sign[] {
  const own = [...new Set(openTags(tags))];
  const implied = closures(table);
  return own.filter(tag => !own.some(other => implied.get(other)?.has(tag)))
    .map(tag => ({ tag, text: signPhrase(tag), category: entryOf(tag, table).category }));
}

/** The question category a sign sits under. Throws on a tag missing from SIGNS. */
export function signCategory(tag: string): ChargeCategory {
  return entryOf(tag).category;
}

/** The distinct categories of a note's signs, in CHARGE_CATEGORIES order. */
export function noteCategories(tags: readonly string[] | undefined): ChargeCategory[] {
  const found = new Set(openTags(tags).map(signCategory));
  return CHARGE_CATEGORIES.filter(category => found.has(category));
}

/** The parts of a sign's rules that its holder's record (traits) or held signs (`closure`) contradict. */
function contradictions(entry: SignEntry, record: ReadonlySet<string>, closure: ReadonlySet<string>): string[] {
  if (entry.retired) return [];
  return [
    ...(entry.implies ?? []).filter(target => isTrait(target) && CONFLICTS.has(tagOutcome(target, record))),
    ...(entry.denies ?? []).filter(target => (isTrait(target) ? record : closure).has(target)).map(target => `not ${target}`),
  ];
}

/**
 * What's wrong with a profile's signs, given its record (every tag of its clues): a tag missing from SIGNS (reported
 * alone); a retired tag; a sign whose rules, or those of a broader sign it implies, contradict the record or the
 * profile's other signs; a narrower and a broader sign on the same note (one sign per fact). Empty when every sign is
 * evidence that agrees with its holder.
 */
export function signProblems(clues: ReadonlyArray<{ tags?: readonly string[] }>, record: ReadonlySet<string>, table: SignTable = SIGNS): string[] {
  const own = [...new Set(clues.flatMap(clue => openTags(clue.tags)))];
  const unknown = own.filter(tag => !lookup(table, tag));
  if (unknown.length) return unknown.map(tag => `sign "${tag}" is not in SIGNS: add it to SIGNS with its category`);
  const implied = closures(table);
  const closure = heldSigns(own, table);
  const problems = own.filter(tag => table[tag].retired)
    .map(tag => `sign "${tag}" is retired (kept only so old rows load): tag what the note shows with an active sign`);
  for (const tag of own) {
    for (const source of [tag, ...implied.get(tag)!]) {
      const conflicts = contradictions(table[source], record, closure);
      if (conflicts.length) {
        problems.push(`sign "${tag}" contradicts its holder's record (it reads as ${conflicts.join(', ')}${source === tag ? '' : `, via ${source}`}): tag what the note shows`);
      }
    }
  }
  for (const clue of clues) {
    const tags = [...new Set(openTags(clue.tags))];
    for (const narrower of tags) {
      for (const broader of tags) {
        if (implied.get(narrower)!.has(broader)) {
          problems.push(`sign "${broader}" is already stated by "${narrower}" on the same note: keep only the narrower (one sign per fact)`);
        }
      }
    }
  }
  return problems;
}
