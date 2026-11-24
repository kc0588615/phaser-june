// The signs: a note's open tags (no colon), shown beside the field guide's photo, each in its question category's group
// (plans 055, 058). This table is the vocabulary and is authoritative: each active sign's `meaning` is its definition
// (plan 2026-11-23-sign-audit); docs/research/2026-11-07-moves-and-signs/sign-map.csv is the research record it was built
// from. It keeps every open tag ever shipped, retired ones included, so new code still loads rows an older content build
// wrote. Pure: queries only.
import { type ChargeCategory, type Sign } from '@/clueGame/questionMatch';
import { tagOutcome } from '@/clueGame/deduction';
import { COMPLETE_PREFIXES, EXCLUSIVE_PREFIXES, prefixOf } from '@/clueGame/traits';

/** A sign players can be shown and authors can tag. */
export interface ActiveSignEntry {
  category: ChargeCategory;
  /** The definition: what counts and what doesn't, one line. Authoritative for tagging and for the audit. */
  meaning: string;
  /** The standard witness sentence: true of every holder, names no animal, group or place, doesn't repeat the label;
   *  null = never dealt (comment why). */
  witness: string | null;
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

const at = (category: ChargeCategory, meaning: string, witness: string | null, rules: Pick<ActiveSignEntry, 'implies' | 'denies'> = {}): ActiveSignEntry => ({ category, meaning, witness, ...rules });
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
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A sign's label as a whole phrase, any case, space or hyphen between words (s_shaped_horns: "S-shaped horns"). */
const labelPattern = (tag: string): RegExp => new RegExp(`\\b${tag.split('_').map(escapeRegExp).join('[\\s-]+')}\\b`, 'i');

export const SIGNS: SignTable = {
  above_tree_line: at('habitat', "Lives at least partly in the open high-mountain zone above the tree line, where it is too high and cold for trees to grow (living only in forest below it doesn't count).", 'It lives at least partly in the open, treeless zone high on mountains, where it is too cold for trees to grow.', { implies: ['high_mountains'] }),
  algae_fur: at('body', "Algae grow in its fur or hair and tint it green (algae on a shell or skin don't count).", 'Its shaggy hair is tinted green by tiny plant-like living things growing in it.', { implies: ['covering:fur'] }),
  ambush_hunter: at('habits', 'Catches prey mainly by hiding or waiting still and striking when prey comes close, rather than chasing it down.', 'It catches prey mainly by lying in wait or hiding, then striking when the prey comes close.', { denies: NOT_ANIMALS }),
  backward_pouch: at('life', "The female's pouch opens toward her back legs (rear-facing), not toward her head.", 'Its females have a belly pocket that opens toward the back legs, not toward the head.', { implies: ['pouch'] }),
  bamboo_eater: at('habits', 'Bamboo (leaves, stems or shoots) is its main food.', 'Its main food is bamboo, whether the leaves, stems or shoots.', { denies: NOT_PLANTS }),
  bamboo_forest: at('habitat', "Lives at least partly in forest with a thick undergrowth of bamboo (eating bamboo elsewhere doesn't count).", 'It lives at least partly in woods with a thick undergrowth of bamboo.', { implies: ['habitat:forest'] }),
  basker: at('habits', "Regularly lies in the sun to warm its body, on logs, rocks, banks or at the water's surface.", 'It regularly lies out in the sun to warm its body.', { denies: ['activity:night'] }),
  big_ears: at('body', "Its ears are large for its head, clearly bigger than most relatives' (sources call them big, large or huge).", 'Its ears look oversized for its head, clearly larger than those of most relatives.'),
  big_leaper: at('habits', 'Moves or attacks with long leaps, covering several times its own body length in one jump.', 'It moves or attacks with huge jumps, each covering several times its own body length.'),
  big_rivers: at('habitat', 'Lives in large rivers (main channels, deep pools or backwaters), not only in small streams or ponds.', 'It lives in large rivers, in the main channels, deep pools or backwaters, not only in small streams or ponds.', { implies: FRESH_WATER }),
  black_and_white: at('body', "Its coat or skin is mainly black and white, in large bold patches (a striped coat doesn't count, see stripes).", 'Its coat or skin is mostly large, bold patches of black beside patches of white, not stripes.'),
  black_coat: at('body', 'Its fur is black or nearly black all over, in all or some individuals (a black color form counts).', 'Its fur is black or nearly black all over, at least in some individuals.', { implies: ['covering:fur'] }),
  bone_claws: at('habits', "Can push sharp bones out through the skin of its toes as claws when grabbed (ordinary claws don't count).", 'It can push sharp bones out through the skin of its toes, like hooks, when grabbed.'),
  borrowed_burrows: at('habitat', "Sleeps, hides or raises young in burrows or dens that other animals dug (holes it digs itself don't count).", 'It sleeps, hides or raises young in holes or dens dug by other animals.'),
  brackish_water: at('habitat', 'Lives at least partly in brackish water, part salty and part fresh, as in estuaries, coastal lagoons or mangroves.', 'It lives at least partly where salty and fresh water mix, as in estuaries, coastal lagoons or mangroves.'),
  bright_green: at('body', 'Its body is mostly bright, leaf green.', 'Its body is mostly a vivid green, like a fresh leaf.'),
  bromeliad_eater: at('habits', 'Bromeliads (spiky plants of the pineapple family) are one of its main foods.', 'Its main foods include the spiky, pineapple-family plants called bromeliads.', { denies: NOT_PLANTS }),
  brown_throat: at('body', 'Its throat is brown, standing out from the different color around it.', 'Its neck is coffee-colored just under its chin, standing out from the different color around it.', { implies: ['throat_patch'] }),
  builds_nests: retired('habits'),
  buries_itself: at('habits', "Hides or rests buried, covered by sand, mud, soil or fallen leaves, often with only its head out (resting inside a burrow doesn't count).", 'It hides or rests covered by sand, mud, soil or fallen leaves, often with only its head showing.'),
  burrower: at('habits', "Digs into the ground on land: digs burrows, tunnels or dens, or digs its body down into soil or sand (only resting in burrows others dug, or burying itself in leaves or underwater sand/mud, doesn't count).", 'It digs into the ground on land, making holes, tunnels or dens, or digging its body down into soil or sand.'),
  camouflage: at('body', 'Its color or pattern helps it blend in with its surroundings so it is hard to see.', 'Its colors or pattern help it blend into its surroundings, so it is hard to see.'),
  carries_young_on_back: at('life', "A mother carries her baby riding or clinging on her back (eggs embedded in skin and fathers carrying tadpoles don't count, see mother_carries_young and father_carries_young).", "Its babies ride or cling on their mother's back.", { implies: ['mother_carries_young'] }),
  cecropia_leaves: at('habits', 'Leaves of Cecropia trees are a main part of its food.', 'Its main foods include the leaves of Cecropia trees.', { implies: ['leaf_eater'], denies: NOT_PLANTS }),
  chirps: at('habits', 'Makes short, high, bird-like chirping calls.', 'It makes short, high-pitched peeping calls.'),
  climber: at('habits', "Climbs well or often, in trees, on rocks or both (only scrambling onto logs or banks doesn't count).", 'It clambers well or often, up branches, rocks or both.'),
  climbing_tail: retired('body'),
  climbs_boulders: at('habits', 'Climbs up big rocks, boulders or cliffs.', 'It scrambles up large rocks, boulders or cliffs.', { implies: ['climber'] }),
  coalitions: retired('habits'),
  coastal_dunes: retired('habitat'),
  cold_streams: at('habitat', 'Lives in or by cool or cold, clear streams, often mountain streams.', 'It lives in or beside cool or cold, clear streams, often in mountains.', { implies: FRESH_WATER }),
  crevice_hider: at('habits', 'Hides in narrow cracks and gaps between or under rocks.', 'It hides in narrow cracks and gaps between or under rocks.'),
  cub_mane: at('life', 'Its cubs or young have a mane or cape of long fur on the neck and back, which adults lose.', 'Its young have a cape of long, fluffy hair along the neck and back, which adults lose.', { implies: ['covering:fur', 'birth:live'] }),
  digging_claws: at('habits', 'Has strong, long claws that it digs with (soil, ant or termite nests, or rotten wood).', 'It digs into soil, ant or termite nests, or rotten wood with strong, lengthy claws.'),
  dung_piles: at('habits', 'Leaves its dung in piles it comes back to (middens), as messages to others of its kind.', 'It leaves its droppings in piles it keeps coming back to, as messages to others of its kind.', { implies: ['scent_marks'] }),
  ear_spots: at('body', 'Has a bold spot of contrasting color on the back of each ear.', 'It has a bold patch of contrasting color on the back of each ear.'),
  eats_lichen: at('habits', 'Lichens are a regular part of its food.', 'Its diet regularly includes lichens, the plant-like growths that cling to bark and rocks.', { denies: NOT_PLANTS }),
  egg_guarding: at('life', 'A parent stays with its eggs or nest and guards them until they hatch.', 'Its eggs or nest are protected by a parent that stays with them until they hatch.', { implies: ['birth:eggs'] }),
  eggs_on_land: at('life', 'Lays its eggs out of the water, on land or underground, away from water.', 'It lays its eggs out of the water, on land or underground.', { implies: ['birth:eggs', 'system:terrestrial'] }),
  eggs_over_water: at('life', 'Lays its eggs on leaves or branches hanging over water, so the hatching tadpoles drop in.', 'It lays its eggs on leaves or branches hanging above water, so the young drop in when they hatch.', { implies: ['birth:eggs'] }),
  electric_sense: at('habits', "Can sense the weak electric signals of other animals' bodies, to find prey.", "It can detect the faint electricity given off by other animals' bodies, to find prey."),
  ever_growing_teeth: at('body', 'Some of its teeth keep growing all its life, worn down by use.', 'It has some teeth that never stop growing and are worn down by use.'),
  eye_glands: at('body', 'Has large scent glands just below or in front of its eyes.', 'It has large scent glands on its face, just below or in front of its eyes.'),
  face_markings: at('body', 'Has bold markings of a contrasting color on its face: patches, rings, a mask, crescents or lines.', 'Its face has bold patches, rings, a mask, crescents or lines of a contrasting color.'),
  face_mask: at('body', 'A dark band or patch across its eyes looks like a mask.', "It has a dark band or patch across its eyes, like a bandit's disguise.", { implies: ['face_markings'] }),
  false_thumb: at('body', 'Has a "false thumb": an enlarged wrist bone or extra digit that it uses like a thumb to grip.', 'It grips with help from an enlarged wrist bone or extra digit that works like a sixth finger.'),
  fast_runner: at('habits', 'Runs fast: it can sprint or chase at about 50 km/h or more.', 'It can sprint or chase at about 50 km/h or more.'),
  fast_streams: at('habitat', 'Lives in or by fast-flowing streams or rivers with rushing water.', 'It lives in or beside streams or rivers with rushing water.', { implies: FRESH_WATER }),
  father_carries_young: at('life', 'The father carries the eggs or young (such as tadpoles) on or in his body.', "Its eggs or babies ride on or inside the father's body."),
  feathery_gills: at('body', 'Has feathery gills sticking out from its body (outside gills) as an adult.', 'It keeps frilly, branched gills sticking out from the sides of its head, even as an adult.', { implies: ['habitat:wetlands', 'underwater_breathing'] }),
  feeds_on_ground: at('habits', 'Finds most of its food on the ground, even if it can climb.', 'It finds most of its food down on the ground, even if it can climb.'),
  fish_eater: at('habits', 'Fish are a main part of its food.', 'Its main foods include fish.', { denies: NOT_ANIMALS }),
  five_front_claws: at('body', 'Has five claws on each front foot.', 'It has five claws on each forefoot.'),
  flat_body: at('body', 'Its body (and often its head) is very flat, much wider than it is tall.', 'It is built very low and wide, much wider than it is tall.'),
  flat_shell: at('body', 'Its shell is very flat and low, not domed.', 'Its shell is very low and level, not domed like a bowl.', { implies: ['covering:shell'] }),
  flippers: at('body', "Its legs (at least its front legs) are flat, paddle-shaped flippers (webbed feet alone don't count).", 'Its legs, at least the front pair, are broad, flat paddles, not just webbed feet.', { implies: ['habitat:wetlands'] }),
  floreana_island: at('habitat', 'Lives (or lived) wild only on Floreana Island in the Galápagos.', null, { implies: ['one_island'] }), // null: single-island Galápagos endemic: can't be stated without naming the place.
  foam_nest: at('life', 'Makes a nest of foam for its eggs.', 'It whips up a frothy mass of bubbles to hold its eggs.', { implies: ['birth:eggs'] }),
  fog_drinker: at('habitat', 'Gets much of the water it needs from fog or mist.', 'It gets much of the water it needs from fog or mist.'),
  forest_floor: at('habits', 'Lives and feeds on the ground of a forest, rarely if ever climbing up into the trees.', 'It lives and feeds on the ground in woodland, rarely if ever climbing up into the trees.', { implies: ['trees:no', 'habitat:forest'], denies: ['often_in_trees', 'seldom_on_ground'] }),
  forest_streams: at('habitat', 'Lives in or by streams that run through forest.', 'It lives in or beside streams that flow through woodland.', { implies: [...FRESH_WATER, 'habitat:forest'] }),
  four_toes: at('body', 'Has only four toes on each foot, front and back.', 'Its front and back feet each have only four digits.'),
  fruit_eater: at('habits', 'Fruit is a main or favorite part of its food.', 'Its main or favorite foods include fruit.', { denies: NOT_PLANTS }),
  fully_aquatic: at('habits', 'Spends its whole life in water and rarely or never comes out onto land.', 'It spends its whole life in water and rarely or never comes out onto land.', { implies: ['habitat:wetlands'], denies: ['trees:yes', 'eggs_on_land'] }),
  furry_feet: at('body', 'The soles of its feet are covered in fur.', 'Its soles are covered in hair instead of bare pads.', { implies: ['covering:fur'] }),
  giant_frog: retired('body'),
  giant_tortoise: at('body', 'A giant tortoise: a land tortoise whose shell grows to about 70 cm long or more.', 'It lives on land and is huge, with a shell that grows to about 70 cm long or more.', { implies: ['covering:shell', 'birth:eggs', 'system:terrestrial', 'lifespan:long'], denies: NOT_BIG }),
  giant_turtle: at('body', 'A giant turtle: a water turtle whose shell grows to about 80 cm long or more.', 'It lives in water and is huge, with a shell that grows to about 80 cm long or more.', { implies: ['covering:shell', 'birth:eggs', 'lifespan:long'], denies: NOT_BIG }),
  glider: at('habits', 'Glides through the air from tree to tree on skin flaps or webbed feet, without flapping wings.', 'It drifts through the air from tree to tree on skin flaps or webbed feet, without flapping wings.', { implies: ['trees:yes'] }),
  grasping_lip: at('body', 'Its upper lip is pointed and grabs leaves and twigs like a finger.', 'Its pointed upper lip grabs leaves and twigs like a finger.'),
  grazer: at('habits', 'Mostly eats grass or other low plants it crops from the ground, rather than leaves of shrubs and trees.', 'It mostly eats grass or other low plants it crops from the ground, rather than leaves off shrubs and trees.', { denies: NOT_PLANTS }),
  hair_like_frills: retired('body'),
  hangs_upside_down: at('habits', 'Often hangs upside down from branches.', 'It often dangles upside down from branches.', { implies: ['trees:yes', 'often_in_trees'] }),
  hard_toe_tips: at('body', 'Its toe tips are hard (horny) for gripping.', 'Its toes end in tough little hardened caps that help it grip.'),
  high_mountains: at('habitat', "Lives at least partly high up in mountains: upper slopes, high plateaus or alpine zones (foothills and low hills don't count).", 'It lives at least partly high up on mountains, on upper slopes, high plateaus or alpine zones, not just foothills.'),
  hinged_shell: at('body', 'Its shell has a hinge, so it can close up.', 'Its shell has a movable joint across the underside, so it can close up.', { implies: ['covering:shell'] }),
  hisses: at('habits', 'Makes a loud hissing sound.', 'It makes a loud sound like air rushing out of a tire.'),
  hooves: at('body', "Walks on hooves: toes that end in hard hoof, including tapirs' and rhinos' hoofed toes.", 'It walks on thick, nail-like casings covering the ends of its toes.'),
  horns: at('body', "Has horns on its head, in at least one sex: bony horns, rhino horns, or skin-covered horns like the okapi's (antlers and tusks don't count).", 'It has hard growths jutting up from its head, at least in one sex, that are not antlers.'),
  huge_head: at('body', 'Its head is very large for its body.', 'Its head is very large for its body.'),
  internal_fertilization: retired('life'),
  kopjes: at('habitat', 'Lives on kopjes: rocky hills or rock piles rising from the African plains.', 'It lives on rocky hills or piles of boulders that rise from flat, open plains.', { implies: ['habitat:rocky'] }),
  large_eyes: at('body', 'Its eyes are large for its head (sources call them big or large).', 'Its eyes are very big for its head.'),
  leaf_eater: at('habits', 'Leaves are a main part of its food.', 'Its main foods include leaves.', { denies: NOT_PLANTS }),
  leaf_litter: at('habitat', 'Lives at least partly among the fallen leaves (leaf litter) on a forest floor.', 'It lives at least partly among the dead leaves that carpet the ground in woodland.', { implies: ['habitat:forest'] }),
  leg_spurs: at('body', 'Has big, pointed, spur-like scales or spurs on its legs.', 'It has big, pointed scales or spikes on its legs.'),
  lidless_eyes: at('body', 'Its eyes have no eyelids.', 'It cannot blink, because it has no lids to close over its eyes.'),
  long_arms: at('body', 'Its arms are very long, longer than its legs.', 'Its arms stretch out farther than its legs do.'),
  long_finger: at('body', 'One finger on each hand is much longer and thinner than the others.', 'Its hands each have one twig-like finger, far thinner and longer than the rest.'),
  long_legs: at('body', 'Its legs are very long for its body.', 'Its legs, at least the hind pair, stretch out unusually far for its body.'),
  long_tail: at('body', 'Its tail is long: about as long as its head and body, or at least two-thirds of that.', 'Its tail trails far behind, at least two-thirds as long as its head and body.'),
  long_tongue: at('body', 'Its tongue is very long and reaches far out of its mouth, often sticky, for catching insects or grabbing leaves.', 'Its tongue reaches far out of its mouth and is often sticky, for catching insects or grabbing leaves.'),
  loud_calls: at('habits', 'Makes loud calls that carry far: songs, hoots, barks, roars or wails.', 'It makes loud sounds that can be heard far away, such as songs, hoots, barks, roars or wails.'),
  low_rumbles: at('habits', 'Calls with deep, low rumbles, some too low for people to hear.', 'It gives deep, rumbling calls, some pitched below what people can hear.'),
  mane: at('body', 'Adults have a mane: a crest or ruff of longer hair on the neck or back.', 'It has a crest or ruff of longer hair on its neck or back as an adult.', { implies: ['covering:fur'] }),
  many_teeth: at('body', 'Has an unusually large number of teeth, far more than most animals of its kind.', 'Its jaws pack far more teeth than most of its relatives have.'),
  mother_carries_young: at('life', "The mother carries her eggs or young on her body as she moves about: on her back, belly or tail, or in pockets in her skin (young in a pouch don't count, see pouch).", "Its eggs or young ride on the mother's body as she moves about: on her back, belly or tail, or in pockets in her skin."),
  mountain_meadows: at('habitat', 'Lives at least partly in grassy meadows high on mountainsides.', 'It lives at least partly on grassy slopes and open fields high up in mountains.', { implies: ['habitat:grassland', 'high_mountains'] }),
  mud_bather: at('habits', 'Wallows in mud, or coats itself with mud, to cool off or protect its skin.', 'It wallows in mud or coats itself with it, to cool off or protect its skin.'),
  neck_hump: at('body', 'Has a raised hump or crest on the back of its head and neck.', 'It has a raised ridge or crest along the back of its head and neck.'),
  nectar_drinker: at('habits', 'Drinks nectar from flowers.', 'It feeds on nectar, the sweet liquid inside flowers.', { denies: ['diet:meat'] }),
  never_climbs: at('habits', 'Never climbs trees: it stays on or under the ground, or in water.', 'It never goes up trees, staying on or under the ground, or in water.', { implies: ['trees:no'], denies: ['often_in_trees', 'seldom_on_ground', 'hangs_upside_down', 'roosts_in_trees', 'sleeps_high_in_trees'] }),
  no_tadpoles: retired('life'),
  no_tongue: at('habits', 'Has no tongue.', 'It lacks a tongue entirely.', { denies: ['long_tongue'] }),
  nomadic: at('habits', 'Has no fixed home area: it wanders or migrates over long distances, following food, water or rain.', 'It has no fixed home area, wandering or migrating over great distances to follow food, water or rain.'),
  often_in_trees: at('habits', 'Spends much of its time up in trees, feeding, resting or sleeping there, even if it also travels on the ground.', 'It spends much of its time up in the branches, feeding, resting or sleeping there, even if it also travels on the ground.'),
  one_island: at('range', "Its whole wild range today (or when it was last alive, if extinct) is on one island, of any size (Madagascar, New Guinea or Tasmania count; a continent like Australia doesn't; two or more islands don't).", 'Its whole wild range, today or when it was last alive, is on a single landmass surrounded by sea, not a continent.'),
  orange_feet: at('body', 'Its feet (toes or toe pads) are orange.', 'Its toes or toe pads are bright orange.'),
  pack_hunter: at('habits', 'Hunts together with others of its group to catch prey.', 'It hunts as a team with others of its group to catch prey.', { implies: ['social:groups'], denies: NOT_ANIMALS }),
  paddle_tail: at('body', 'Its tail is flattened like a paddle or oar, for swimming.', 'Its tail is flattened like an oar to push it through the water.', { implies: ['habitat:wetlands'] }),
  patchy_coat: at('body', 'Its coat is a blotchy patchwork of several colors, different on each animal.', 'Its fur is a blotchy mix of several colors, laid out differently on each individual.', { implies: ['covering:fur'] }),
  pig_nose: at('body', 'Its nose ends in a flat, round, pig-like snout disc with the nostrils at the front.', 'Its snout ends in a flat, round disc, with the nostrils facing forward.'),
  pinta_island: at('habitat', 'Lives (or lived) wild only on Pinta Island in the Galápagos.', null, { implies: ['one_island'] }), // null: single-island Galápagos endemic: can't be stated without naming the place.
  pointed_snout: at('body', 'Its snout is long, or ends in a narrow, pointed tip.', 'Its face stretches far forward, or narrows to a sharp tip at the front.'),
  poor_eyesight: at('habits', 'Sees poorly or is blind, and relies mainly on other senses (smell, hearing or touch).', 'It sees poorly or is blind, and relies mainly on smell, hearing or touch.'),
  pouch: at('life', 'The female has a pouch on her belly where her baby (or egg) grows.', 'Its females have a pocket on the belly where a baby, or an egg, grows.'),
  prairie_dog_towns: at('habitat', 'Lives in prairie dog colonies ("towns") and uses their burrows (not the same as living near people, see town_dweller).', null, { implies: ['habitat:grassland'] }), // null: defined by prairie dog colonies: can't be stated without naming another animal.
  puffs_up: at('habits', 'Puffs its body up with air when threatened.', 'It swells its body up with air when threatened.'),
  purple_gray: at('body', 'Its body is dark purplish gray.', 'Its skin is a dark, grayish violet.'),
  pushes_over_trees: at('habits', 'Pushes or knocks over whole trees to feed.', 'It knocks down whole trees to feed.'),
  raids_termite_mounds: at('habits', "Breaks open ant or termite nests or mounds with its claws or snout to eat the insects inside (poking tools into openings doesn't count).", 'It breaks open ant or termite nests with its claws or snout to eat the insects inside.', { denies: NOT_ANIMALS }),
  rain_breeder: at('life', 'Breeds when heavy rains come, often in pools or puddles the rain fills.', 'It mates and lays its eggs when heavy downpours come, often in the pools or puddles they fill.'),
  rarely_drinks: at('habits', 'Can go days or longer without drinking, getting most of its water from its food.', 'It can go days or longer without drinking, getting most of its water from its food.'),
  red_eyes: at('body', 'Its eyes are red.', 'Its irises are bright crimson.'),
  red_orange: at('body', 'Its body is bright red-orange.', 'Its body is a bright, fiery color, halfway between red and orange.'),
  reddish_fur: at('body', 'Its fur is mostly red, reddish brown or golden red.', 'Its coat is mostly rust-colored, chestnut or ginger.', { implies: ['covering:fur'] }),
  regrows_body_parts: at('habits', 'Can regrow lost body parts such as legs, tail or gills.', 'It can grow back lost parts of its body, such as legs, tail or gills.'),
  rests_by_waterfalls: at('habits', 'Rests on wet rocks by waterfalls or rapids.', 'It sits on wet rocks beside waterfalls or rapids.', { implies: FRESH_WATER }),
  rests_on_bottom: at('habits', 'Rests on the bottom of a river, lake or pond, under water.', 'It rests under water, lying on the bed of a river, lake or pool.', { implies: ['habitat:wetlands'] }),
  ringed_tail: at('body', 'Its tail has rings of alternating colors.', 'Its tail is wrapped in bands of alternating colors.'),
  rock_basker: retired('habits'),
  rock_climber: retired('habits'),
  rodent_hunter: at('habits', 'Rodents are a main part of its prey.', 'Its main prey includes gnawing animals such as mice, rats and squirrels.', { denies: NOT_ANIMALS }),
  rolls_into_ball: at('habits', 'Curls up into a tight ball to protect itself.', 'It curls up into a tight ball to protect itself.'),
  roosts_in_trees: at('habits', 'Rests (roosts) hanging or perching in tree branches, often in groups.', 'It rests hanging or perching among branches.', { implies: ['trees:yes', 'habitat:forest', 'often_in_trees'] }),
  round_body: at('body', 'Its body is round and puffy.', 'It is plump and puffy, shaped almost like a ball.'),
  s_shaped_horns: at('body', 'Its horns curve back and then up or forward, making an S shape seen from the side.', 'Its horns curve back and then up or forward, like the letter S seen from the side.', { implies: ['horns'] }),
  saddleback_shell: at('body', 'Its shell is a "saddleback": raised high at the front, above the neck.', 'Its shell rises high at the front, arching up above its neck.', { implies: ['covering:shell'] }),
  salt_licks: at('habits', 'Seeks out salt licks, or mineral-rich soil, clay or water, to get minerals.', 'It seeks out salty or mineral-rich soil, clay or water to get minerals.'),
  sand_dunes: at('habitat', 'Lives on or in sand dunes, coastal or inland.', 'It lives on or in dunes, the hills of wind-blown sand, near the coast or inland.'),
  sand_swimmer: retired('habits'),
  sandy_bottoms: at('habitat', 'Lives in rivers or lakes with soft, sandy or muddy bottoms.', 'It lives in rivers or lakes with soft, sandy or muddy beds.', { implies: FRESH_WATER }),
  scavenger: at('habits', 'Often eats animals that are already dead (carrion).', 'It often eats animals that are already dead.', { denies: NOT_ANIMALS }),
  scent_marks: at('habits', "Marks its home area, paths or objects with scent: urine, dung or rubbed-on gland scent (just having scent glands doesn't count).", 'It leaves its smell on its home area, paths or objects, using urine, dung or rubbed-on gland scent.'),
  screecher: at('habits', 'Makes loud, harsh screeches.', 'It makes loud, harsh shrieks.'),
  seasonal_streams: retired('habitat'),
  seed_spreader: at('habits', 'Spreads plant seeds to new places, mostly by eating fruit and passing the seeds in its droppings.', 'It carries plant seeds to new places, mostly by eating fruit and passing the seeds in its droppings.', { denies: NOT_PLANTS }),
  seldom_on_ground: at('habits', 'Lives in trees and seldom comes down to the ground.', 'It lives up in the branches and rarely comes down to the ground.', { implies: ['trees:yes', 'often_in_trees'] }),
  senses_vibrations: at('habits', 'Feels vibrations or ripples through the ground or water, to sense prey, danger or others.', 'It feels tremors or ripples traveling through the ground or water, to detect prey, danger or others.'),
  shallow_wetlands: at('habitat', 'Lives in shallow, still water such as marshes, ponds and bogs.', 'It lives in shallow, still water such as marshes, swamps, pools and bogs.', { implies: FRESH_WATER }),
  shares_food: at('habits', "Shares food with, or brings food to, other members of its group beyond its own young (a parent feeding only its own young doesn't count).", 'It splits meals with, or brings meals to, members of its group beyond its own young.', { denies: ['social:alone'] }),
  shell_spines: at('body', 'Has small spines or pointed bumps on its shell, mainly along the front edge.', 'Its shell has small pointed bumps, mainly along the front edge.', { implies: ['covering:shell'] }),
  shoulder_stripe: at('body', 'A single bold stripe runs across its shoulders.', 'It has a single bold band of contrasting color running across its shoulders.', { implies: ['stripes'] }),
  side_frills: at('body', 'Grows thin, hair-like flaps of skin on its sides (and thighs).', 'It grows thin, thread-like flaps of skin along its sides and thighs, at least in males.'),
  skin_folds: at('body', 'Its skin has deep folds, like plates of armor.', 'Its hide has deep creases, like plates of armor.', { implies: ['covering:skin'] }),
  sleeping_nests: at('habits', 'Builds a nest or bed (of leaves, branches or grass) to sleep or rest in, in a tree or on the ground.', 'It builds a bed of leaves, branches or grass to sleep or rest in.'),
  sleeps_high_in_trees: at('habits', 'Sleeps or rests high up in trees.', 'It sleeps or rests far above the ground, up in the branches.', { implies: ['trees:yes', 'often_in_trees'] }),
  slow_mover: at('habits', 'Moves very slowly, even when disturbed.', 'It creeps along at a crawl, even when disturbed.', { denies: ['fast_runner'] }),
  snorkel_nose: at('habits', 'Can breathe through the tip of its raised nose, snout or trunk while the rest of its body stays under water.', 'It can breathe through the tip of its raised nose, snout or trunk while the rest of its body stays under water.'),
  snowy_winters: at('habitat', 'Lives where snow covers the ground for weeks or months in winter.', 'It lives where snow covers the ground for weeks or months each year.'),
  snub_nose: at('body', 'Its nose is short, flat and turned up.', 'Its snout is short, flat and tipped upward.'),
  soars: at('habits', 'Soars: glides on rising warm air without flapping.', 'It rides rising currents of warm air without flapping.'),
  spectacles: at('body', 'Pale rings or markings around its eyes look like glasses.', 'Its eyes are circled by pale rings or markings that look like a pair of glasses.', { implies: ['face_markings'] }),
  spiky_shell: at('body', 'Its shell has spikes or sharp points around its edge.', 'Its shell has sharp points sticking out around its edge.', { implies: ['covering:shell'] }),
  spiny_forest: at('habitat', 'Lives in dry spiny forest: thorny, cactus-like forest and brush.', 'It lives in dry, prickly woodland and brush full of thorny, cactus-like plants.', { implies: ['habitat:forest'] }),
  spiral_horns: at('body', 'Its horns twist in a spiral, like a corkscrew, along their length.', 'Its horns twist like a corkscrew along their length.', { implies: ['horns'] }),
  spots: at('body', 'Its coat or skin is covered with spots or rosettes.', 'Its coat or skin is covered with dots, speckles or rose-shaped rings.'),
  spotted_belly: at('body', 'Its belly is spotted.', 'Its underside is dotted with blotches of another color.'),
  squeaker: at('habits', 'Makes high squeaking calls.', 'It makes thin, high-pitched calls, like a squeezed rubber toy.'),
  stands_on_hind_legs: at('habits', 'Rises up or moves on its back legs alone, at least sometimes: standing, rearing up, hopping or running upright.', 'It rises up or moves on its back legs alone, at least sometimes, by standing, rearing, hopping or running upright.'),
  star_fingers: at('body', 'Each fingertip ends in a tiny star shape.', 'Its fingertips each end in a tiny burst of points, like a little star.'),
  star_pattern: at('body', 'Its shell or skin has lines spreading out like stars.', 'Its shell or skin has lines that fan out from center points, like the rays of the sun.'),
  startle_display: at('habits', 'Suddenly flashes bright colors (eyes or body) to startle a predator.', 'It suddenly flashes bright colors, on its eyes or body, to shock a predator.'),
  stays_larval: at('life', 'Grows up and breeds while keeping its larval body (gills, life in water), never changing into a land form.', 'It grows up and breeds while keeping the gills and water-living body it had when young, never changing into a land-living adult.'),
  stays_underground: retired('habits'),
  sticky_skin: at('habits', 'Its skin oozes a sticky glue when it is grabbed.', 'Its skin oozes a gluey slime when it is grabbed.', { implies: ['covering:skin'] }),
  stores_food: at('habits', 'Gathers food and stores it for later, such as haypiles for winter.', 'It hides or piles up food and comes back to eat it later.'),
  striped_young: at('life', 'Its young have stripes (and sometimes spots) that fade as they grow up.', 'Its babies have lines of contrasting color along their bodies, and sometimes spots, that fade as they grow up.'),
  stripes: at('body', "Has stripes: one or more long bands of contrasting color on its body or legs (tail rings don't count, see ringed_tail).", 'It has one or more long bands of contrasting color on its body or legs.'),
  strong_bite: at('body', 'Bites or chews with unusual force for its size.', 'Its jaws clamp or chew with unusual force for its size.'),
  stubby_tail: at('body', 'Its tail is very short, just a stub.', 'Its tail is very short, hardly more than a nub.', { denies: ['long_tail'] }),
  sucker_mouth_tadpoles: at('life', 'Its tadpoles cling to rocks in fast water with a sucker-like mouth.', 'Its tadpoles hold onto rocks in rushing water with a mouth that works like a suction cup.', { implies: ['birth:eggs'] }),
  super_hearing: at('body', 'Has exceptionally sharp hearing that it relies on.', 'It relies on its ability to pick up very faint sounds.'),
  surfaces_to_breed: at('life', 'Lives underground and comes to the surface only briefly, to breed.', 'It lives underground and comes up above ground only briefly, to mate and lay eggs.'),
  swimmer: at('habits', "Swims well or often, by choice, in water (moving through sand or soil doesn't count).", 'It paddles through water well or often, by choice.'),
  tail_organ: at('body', 'Males have a tail-like body part used for mating.', 'Its males have a short, stub-like body part used for mating.'),
  tap_forager: at('habits', 'Taps on wood or bark and listens for hollow spots to find hidden food.', 'It taps on wood or bark and listens for hollow spots to find hidden food.'),
  tear_lines: at('body', 'Dark lines run from the inner corner of each eye down to its mouth, like tear tracks.', 'Its face has dark streaks running from the inner corner of each eye down to its mouth, as if it had been crying.', { implies: ['face_markings'] }),
  temperature_sex: at('life', "Whether its eggs hatch male or female depends on the nest's temperature.", 'Its eggs hatch male or female depending on how warm the nest is.'),
  territorial: at('habits', "Defends an area (a territory, home patch or den site) against others of its kind (fights over mates alone don't count).", 'It defends an area, such as a home patch or den site, against others of its kind.'),
  throat_patch: at('body', 'Has a patch or patches of contrasting color on its throat.', 'It has one or more areas of contrasting color under its chin, at the front of its neck.'),
  tooth_plate: at('body', 'Has a bony, tooth-like plate in its jaw.', 'It has a bony ridge in its jaw that looks like a row of teeth.'),
  toothless: at('body', 'Has no teeth at all as an adult.', 'It has no teeth at all in its jaws once it is grown.', { denies: ['many_teeth', 'tube_teeth', 'ever_growing_teeth', 'tusks'] }),
  town_dweller: at('habitat', 'Lives in or near human settlements: towns, villages, gardens, parks or plantations (not the same as prairie dog towns).', 'It lives in or near human settlements, such as villages, gardens, parks or plantations.'),
  tree_dweller: retired('habits'),
  trunk: at('body', "Has a trunk: a long, bendy nose joined with its upper lip (an elephant's long trunk or a tapir's short one).", 'Its nose and upper lip are joined into one flexible tube, short or reaching far down.'),
  tube_teeth: at('body', 'Its teeth are made of many tiny tubes and have no enamel.', 'Its teeth are made of many tiny straw-like columns and have no enamel.'),
  tusks: at('body', 'Has tusks: long teeth that stick out of its mouth, in at least one sex.', 'It has extra-long teeth jutting out of its mouth, in at least one sex.'),
  underwater_breathing: at('body', 'Can take in oxygen from the water (through gills, skin or throat) while it stays under water.', 'It can draw oxygen from the water through gills, skin or throat while it stays submerged.', { implies: ['habitat:wetlands'] }),
  uses_tools: at('habits', 'Uses objects such as sticks or stones as tools to get food or do tasks.', 'It picks up objects such as sticks or stones and uses them to get food or do tasks.'),
  venomous: at('body', 'Can inject venom with a bite, sting or spur.', 'It can inject a toxin with a bite, sting or spur.'),
  vertical_pupils: at('body', 'Its pupils are vertical slits.', 'Its eyes have dark centers shaped like upright slits.'),
  voiceless: at('habits', "Makes no calls: no croaks, songs, squeaks or other voice sounds (a hiss of breath doesn't count as a call).", 'It makes no calls at all: no croaks, songs, squeaks or other vocal sounds.', { denies: ['chirps', 'loud_calls', 'low_rumbles', 'screecher', 'squeaker', 'whistle_calls'] }),
  walks_on_knuckles: at('habits', 'Walks on its knuckles or the sides of its curled front feet, keeping its claws or fingers off the ground.', 'It puts its weight on its knuckles or the sides of its curled front feet when walking, keeping its claws or fingers off the ground.'),
  walks_upright: at('habits', 'Usually walks on its back legs, using its front legs only now and then.', 'It usually walks on its back legs, using its front legs only now and then.', { implies: ['stands_on_hind_legs'] }),
  warning_colors: at('body', 'Has bright colors that warn predators it is poisonous or bad to eat.', 'Its bright colors tell predators that it is toxic or bad to eat.'),
  webbed_feet: at('body', 'Has webbed feet: skin joins its toes.', 'Its toes are joined by flaps of skin between them.'),
  whistle_calls: at('habits', 'Calls with high whistles.', 'It makes high-pitched whistles.'),
  white_belly: at('body', 'Its belly is plain white.', 'Its underside is plain white.'),
  white_ear_rims: at('body', 'Its ears have white edges.', 'Its ears are trimmed with white edges.'),
  white_tail_tip: at('body', 'Its tail ends in white, or has a white band near its end.', 'Its tail ends in white, or has a white band near its end.'),
  wings: at('body', 'Has wings it flies with.', 'It lifts itself through the air by flapping a pair of broad limbs.'),
  winter_rest: at('habits', 'Rests or sleeps through the winter, inactive for weeks or months (hibernation or brumation).', 'It sleeps or lies still through the coldest part of the year, staying inactive for weeks or months.'),
  yellow_head: at('body', 'Its head is mostly yellow.', 'Its head is mostly yellow.'),
  yellow_legs: at('body', 'Its legs are yellow (yellow skin or scales).', 'Its legs have yellow skin or scales.'),
  yellow_scales: retired('body'),
};

const tableProblems = signTableProblems(SIGNS);
if (tableProblems.length) throw new Error(`SIGNS (src/clueGame/signs.ts) is broken:\n${tableProblems.join('\n')}`);
/** Each sign -> the open signs it transitively implies. */
const IMPLIED = buildImplied(SIGNS);

function lookup(table: SignTable, tag: string): SignEntry | undefined {
  return Object.hasOwn(table, tag) ? table[tag] : undefined;
}

/** Whether `tag` exists in `table` (active or retired). */
export function isKnownSign(tag: string, table: SignTable = SIGNS): boolean {
  return lookup(table, tag) !== undefined;
}

/** A sign's standard sentence; null for a retired, unknown or deliberately unwritten sign (never throws: old live rows load). */
export function witnessSentence(tag: string, table: SignTable = SIGNS): string | null {
  const entry = lookup(table, tag);
  return entry && !entry.retired ? entry.witness : null;
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
 * What's wrong with a sign table: an active sign with no meaning; a witness sentence that is empty or untrimmed, has a
 * blank (`_`) or repeats its label (whole phrase, any case, space or hyphen between words); a trait target whose prefix
 * is in neither EXCLUSIVE_PREFIXES nor COMPLETE_PREFIXES (a typo would match nothing); an open target missing or
 * retired; a sign implying or denying itself; a cycle of open-tag `implies`. Empty when the table is sound.
 */
export function signTableProblems(table: SignTable): string[] {
  const problems: string[] = [];
  for (const [tag, entry] of Object.entries(table)) {
    if (entry.retired) continue;
    if (!entry.meaning.trim()) problems.push(`sign "${tag}" has no meaning: write what counts and what doesn't`);
    if (entry.witness !== null) {
      if (!entry.witness.trim() || entry.witness !== entry.witness.trim()) problems.push(`sign "${tag}" has an empty or untrimmed witness sentence`);
      if (entry.witness.includes('_')) problems.push(`sign "${tag}" has a blank (_) in its witness sentence`);
      if (labelPattern(tag).test(entry.witness)) problems.push(`sign "${tag}" repeats its label in its witness sentence: say it in other words`);
    }
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
