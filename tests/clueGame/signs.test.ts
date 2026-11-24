// The sign table and its rules (plan 2026-11-23-sign-audit §1.1-1.3, 1.6). Written down first, the ways they could break:
//  A1 signTableProblems: an empty or whitespace-only meaning passes; a trait target with a prefix typo (`sytem:freshwater`,
//     `:foo`) passes; an open target missing from the table, or retired, passes; a sign implying or denying itself passes;
//     a 2- or 3-cycle of open-tag implies passes, or is reported without its path; the real SIGNS isn't clean, or its
//     active signs with a null witness aren't exactly floreana_island, pinta_island and prairie_dog_towns.
//  A2 Types: an active entry without a meaning compiles; a retired entry with implies, denies or a meaning compiles.
//  A3 buildImplied / heldSigns: a transitive edge isn't closed; a diamond holds duplicates; a retired tag implies
//     something or isn't held as itself; trait tags leak in; undefined input throws; an unknown tag doesn't throw.
//  A4 signsOf: a narrower sign and its wired broader one (on different notes) show two badges; a lone broader sign is
//     dropped; tag order changes; one tag on two notes shows twice; a retired tag is dropped; one of the 10 former
//     deferred edges isn't wired, or `badges(['backward_pouch', 'pouch'])` isn't `['backward_pouch']`.
//  A5 signProblems: an unknown tag doesn't return early; a retired tag passes; a trait implies conflict reached only
//     through a narrower sign isn't reported, or names the wrong `via`; an implied trait with no record is reported; a
//     trait denies the record holds passes; an open denies against a sign held directly, or reached through a narrower
//     one, passes; a one-way mutual exclusion fires only in one clue order; narrower and broader on the same note pass;
//     on different notes they're flagged; a clean profile returns anything.
//  A6 Rule fixes F1-F4 and the S1/S2 rulings: each fixed rule still blocks a true holder on real SIGNS.
//  A1-W signTableProblems (witness, plan 2026-11-24-witness-signs): an empty, whitespace-only or untrimmed witness
//     passes; one containing `_` passes; one containing its label as a whole phrase (one word like `mane`, several like
//     `digging claws`, the hyphen form `S-shaped horns`, any case) passes. Or it wrongly flags a label inside another
//     word ("remains" for `mane`), a `null` witness, or a retired entry.
//  A2-W Types: an active entry without `witness` compiles; a retired entry with `witness` (string or null) compiles.
//  A10 witnessSentence / isKnownSign: witnessSentence throws, or returns text, for a retired tag, an unknown tag or an
//     inherited key (`constructor`); isKnownSign is true for an unknown tag or `constructor`, false for a retired tag,
//     or throws.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SIGNS, buildImplied, heldSigns, isKnownSign, signCategory, signProblems, signTableProblems, signsOf,
  witnessSentence,
  type ActiveSignEntry, type SignEntry,
} from '@/clueGame/signs';

type Table = Record<string, SignEntry>;
const sign = (meaning: string, rules: Pick<ActiveSignEntry, 'implies' | 'denies'> = {}, witness: string | null = null): SignEntry => ({ category: 'body', meaning, witness, ...rules });
const old: SignEntry = { category: 'habits', retired: true };
/** The one problem a fixture table has. */
const onlyProblem = (table: Table): string => {
  const problems = signTableProblems(table);
  assert.equal(problems.length, 1, problems.join('\n'));
  return problems[0];
};

// A small table: narrow -> mid -> broad (broad reads as trees:yes), a diamond, exclusions, a retired tag.
const T: Table = {
  broad: sign('Broad.', { implies: ['trees:yes'] }),
  mid: sign('Mid.', { implies: ['broad'] }),
  narrow: sign('Narrow.', { implies: ['mid', 'size:large'] }),
  top: sign('Top.', { implies: ['left', 'right'] }),
  left: sign('Left.', { implies: ['bottom'] }),
  right: sign('Right.', { implies: ['bottom'] }),
  bottom: sign('Bottom.'),
  grounded: sign('Grounded.', { denies: ['mid'] }),
  daytime: sign('Daytime.', { denies: ['activity:night'] }),
  old,
};
const record = (clues: ReadonlyArray<{ tags: readonly string[] }>, traits: readonly string[] = []) => new Set([...clues.flatMap(clue => clue.tags), ...traits]);
const problemsOf = (clues: Array<{ tags: string[] }>, traits: readonly string[] = [], table: Table = T) => signProblems(clues, record(clues, traits), table);
/** One profile of real signs, each on its own note, with its trait record. */
const real = (signs: string[], traits: readonly string[]) => problemsOf(signs.map(tag => ({ tags: [tag] })), traits, SIGNS as Table);

// ---- A1

test('A1: an active sign with an empty or whitespace-only meaning is a problem', () => {
  assert.match(onlyProblem({ a: sign('') }), /"a"/);
  assert.match(onlyProblem({ a: sign('  \t ') }), /"a"/);
  assert.deepEqual(signTableProblems({ a: sign('A.'), old }), []);
});

test('A1: a trait target whose prefix is no trait prefix is a problem', () => {
  assert.match(onlyProblem({ a: sign('A.', { implies: ['sytem:freshwater'] }) }), /sytem:freshwater/);
  assert.match(onlyProblem({ a: sign('A.', { denies: ['sytem:freshwater'] }) }), /sytem:freshwater/);
  assert.match(onlyProblem({ a: sign('A.', { implies: [':foo'] }) }), /:foo/);
  assert.deepEqual(signTableProblems({ a: sign('A.', { implies: ['system:freshwater', 'trees:yes', 'forest:tropical_moist_lowland'] }) }), []);
});

test('A1: an open target missing from the table, or retired, is a problem', () => {
  assert.match(onlyProblem({ a: sign('A.', { implies: ['gone'] }) }), /"gone"/);
  assert.match(onlyProblem({ a: sign('A.', { denies: ['gone'] }) }), /"gone"/);
  assert.match(onlyProblem({ a: sign('A.', { implies: ['old'] }), old }), /"old"/);
  assert.match(onlyProblem({ a: sign('A.', { denies: ['old'] }), old }), /"old"/);
});

test('A1: a sign that implies or denies itself is a problem', () => {
  assert.match(onlyProblem({ a: sign('A.', { implies: ['a'] }) }), /"a"/);
  assert.match(onlyProblem({ a: sign('A.', { denies: ['a'] }) }), /"a"/);
});

test('A1: a cycle of open-tag implies is reported once, with its path', () => {
  assert.match(onlyProblem({ a: sign('A.', { implies: ['b'] }), b: sign('B.', { implies: ['a'] }) }), /a -> b -> a/);
  assert.match(onlyProblem({ a: sign('A.', { implies: ['b'] }), b: sign('B.', { implies: ['c'] }), c: sign('C.', { implies: ['a'] }) }), /a -> b -> c -> a/);
  assert.deepEqual(signTableProblems(T), []); // a diamond is no cycle
});

test('A1: the real SIGNS is clean, and its retired tags are the 15 no note may use', () => {
  assert.deepEqual(signTableProblems(SIGNS), []);
  assert.deepEqual(Object.keys(SIGNS).filter(tag => SIGNS[tag].retired).sort(), [
    'builds_nests', 'climbing_tail', 'coalitions', 'coastal_dunes', 'giant_frog', 'hair_like_frills', 'internal_fertilization',
    'no_tadpoles', 'rock_basker', 'rock_climber', 'sand_swimmer', 'seasonal_streams', 'stays_underground', 'tree_dweller', 'yellow_scales',
  ]);
  assert.equal(Object.values(SIGNS).filter(entry => !entry.retired).length, 201);
  assert.deepEqual(
    Object.keys(SIGNS).filter(tag => !SIGNS[tag].retired && SIGNS[tag].witness === null).sort(),
    ['floreana_island', 'pinta_island', 'prairie_dog_towns'],
  );
});

// ---- A1-W

const withWitness = (tag: string, witness: string | null): Table => ({ [tag]: sign('A meaning.', {}, witness) });

test('A1-W: an empty, whitespace-only or untrimmed witness is a problem', () => {
  assert.match(onlyProblem(withWitness('quill', '')), /"quill"/);
  assert.match(onlyProblem(withWitness('quill', '  \t ')), /"quill"/);
  assert.match(onlyProblem(withWitness('quill', ' It has a trait.')), /"quill"/);
  assert.match(onlyProblem(withWitness('quill', 'It has a trait. ')), /"quill"/);
  assert.deepEqual(signTableProblems(withWitness('quill', 'It has a trait.')), []);
});

test('A1-W: a witness with a blank (_) is a problem', () => {
  assert.match(onlyProblem(withWitness('quill', 'It has a ___.')), /"quill"/);
});

test('A1-W: a witness that repeats its label, as a whole phrase in any case or hyphen form, is a problem', () => {
  assert.match(onlyProblem(withWitness('mane', 'It has a mane on its neck.')), /"mane"/);
  assert.match(onlyProblem(withWitness('mane', 'Its MANE is long.')), /"mane"/);
  assert.match(onlyProblem(withWitness('digging_claws', 'It has digging claws.')), /"digging_claws"/);
  assert.match(onlyProblem(withWitness('digging_claws', 'Its Digging  Claws are long.')), /"digging_claws"/);
  assert.match(onlyProblem(withWitness('s_shaped_horns', 'It has S-shaped horns.')), /"s_shaped_horns"/);
  assert.match(onlyProblem(withWitness('s_shaped_horns', 'It has s shaped horns.')), /"s_shaped_horns"/);
});

test('A1-W: a label inside another word, a null witness and a retired entry pass', () => {
  assert.deepEqual(signTableProblems(withWitness('mane', 'Its long hair remains on its neck.')), []);
  assert.deepEqual(signTableProblems(withWitness('mane', null)), []);
  assert.deepEqual(signTableProblems({ mane: old }), []);
});

// ---- A10

test('A10: witnessSentence returns an active sign\'s text, else null, and never throws', () => {
  const table: Table = { said: sign('Said.', {}, 'It says so.'), unsaid: sign('Unsaid.'), old };
  assert.equal(witnessSentence('said', table), 'It says so.');
  assert.equal(witnessSentence('unsaid', table), null);
  assert.equal(witnessSentence('old', table), null);
  assert.equal(witnessSentence('tree_dweller'), null);
  for (const tag of ['nope', 'constructor', 'toString']) {
    assert.equal(witnessSentence(tag, table), null);
    assert.equal(witnessSentence(tag), null);
  }
});

test('A10: isKnownSign is true for any tag in the table, retired included, and false otherwise', () => {
  const table: Table = { said: sign('Said.', {}, 'It says so.'), unsaid: sign('Unsaid.'), old };
  for (const tag of ['said', 'unsaid', 'old']) assert.equal(isKnownSign(tag, table), true);
  assert.equal(isKnownSign('tree_dweller'), true);
  assert.equal(isKnownSign('big_ears'), true);
  for (const tag of ['nope', 'constructor', 'toString']) {
    assert.equal(isKnownSign(tag, table), false);
    assert.equal(isKnownSign(tag), false);
  }
});

// ---- A2 (checked by `npm run typecheck`)

test('A2: an active sign needs a meaning; a retired one takes no meaning and no rules', () => {
  const wrong: SignEntry[] = [
    // @ts-expect-error an active sign needs its meaning
    { category: 'body' },
    // @ts-expect-error an active sign needs its meaning
    { category: 'body', implies: ['trees:yes'] },
    // @ts-expect-error a retired sign has no rules
    { category: 'body', retired: true, implies: ['trees:yes'] },
    // @ts-expect-error a retired sign has no rules
    { category: 'body', retired: true, denies: ['trees:yes'] },
    // @ts-expect-error a retired sign has no meaning
    { category: 'body', retired: true, meaning: 'Old.' },
    // @ts-expect-error an active sign needs its witness (A2-W)
    { category: 'body', meaning: 'Has a trait.' },
    // @ts-expect-error a retired sign has no witness (A2-W)
    { category: 'body', retired: true, witness: 'It has a trait.' },
    // @ts-expect-error a retired sign has no witness, not even null (A2-W)
    { category: 'body', retired: true, witness: null },
  ];
  assert.equal(wrong.length, 8);
});

// ---- A3

test('A3: the closure is transitive, holds a diamond once, and skips trait tags', () => {
  const implied = buildImplied(T);
  assert.deepEqual([...implied.get('narrow')!].sort(), ['broad', 'mid']);
  assert.deepEqual([...implied.get('top')!].sort(), ['bottom', 'left', 'right']);
  assert.deepEqual([...heldSigns(['top'], T)].sort(), ['bottom', 'left', 'right', 'top']);
  assert.deepEqual([...heldSigns(['size:large', 'narrow', 'trees:no'], T)].sort(), ['broad', 'mid', 'narrow']);
});

test('A3: a retired tag is held as itself and implies nothing', () => {
  assert.equal(buildImplied(T).get('old')!.size, 0);
  assert.deepEqual([...heldSigns(['old'], T)], ['old']);
  assert.deepEqual([...heldSigns(['tree_dweller'])], ['tree_dweller']);
});

test('A3: no tags hold nothing; an unknown tag throws', () => {
  assert.equal(heldSigns(undefined).size, 0);
  assert.equal(heldSigns(undefined, T).size, 0);
  assert.throws(() => heldSigns(['nope']), /Unknown sign "nope"/);
  assert.throws(() => heldSigns(['nope'], T), /Unknown sign "nope"/);
  assert.throws(() => signCategory('nope'), /Unknown sign "nope"/);
});

// ---- A4

const impliesOf = (tag: string): readonly string[] => { const entry = SIGNS[tag]; return entry.retired ? [] : entry.implies ?? []; };
/** The first wired open-tag edge in SIGNS: [narrower, broader]. */
const wiredEdge = (): [string, string] => {
  for (const tag of Object.keys(SIGNS)) {
    const broader = impliesOf(tag).find(target => !target.includes(':'));
    if (broader) return [tag, broader];
  }
  throw new Error('no wired open-tag edge in SIGNS');
};
const badges = (tags: string[], table?: Table) => signsOf(tags, table).map(badge => badge.tag);

test('A4: a narrower sign hides its wired broader one; a lone broader sign shows', () => {
  assert.deepEqual(impliesOf('dung_piles'), ['scent_marks']);
  assert.deepEqual(badges(['scent_marks', 'size:large', 'territorial', 'dung_piles']), ['territorial', 'dung_piles']);
  assert.deepEqual(badges(['scent_marks', 'territorial']), ['scent_marks', 'territorial']);
  const [narrower, broader] = wiredEdge();
  assert.deepEqual(badges([broader, narrower]), [narrower]);
  assert.deepEqual(badges(['broad', 'bottom', 'narrow'], T), ['bottom', 'narrow']); // transitive
});

test('A4: badges keep tag order, show each tag once, and keep retired tags as themselves', () => {
  assert.deepEqual(badges(['burrower', 'diet:insects', 'digging_claws', 'burrower']), ['burrower', 'digging_claws']);
  assert.deepEqual(signsOf(['tree_dweller']), [{ tag: 'tree_dweller', text: 'tree dweller', category: 'habits' }]);
});

test('A4: the 10 former deferred edges are wired', () => {
  const edges: Array<[string, string]> = [
    ['backward_pouch', 'pouch'],
    ['carries_young_on_back', 'mother_carries_young'],
    ['face_mask', 'face_markings'],
    ['feathery_gills', 'underwater_breathing'],
    ['s_shaped_horns', 'horns'],
    ['shoulder_stripe', 'stripes'],
    ['spectacles', 'face_markings'],
    ['spiral_horns', 'horns'],
    ['tear_lines', 'face_markings'],
    ['walks_upright', 'stands_on_hind_legs'],
  ];
  for (const [narrower, broader] of edges) assert.ok(impliesOf(narrower).includes(broader), `${narrower} -> ${broader}`);
  assert.deepEqual(badges(['backward_pouch', 'pouch']), ['backward_pouch']);
});

// ---- A5

test('A5: an unknown tag is reported alone, before anything else is checked', () => {
  const problems = problemsOf([{ tags: ['nope', 'narrow', 'old'] }, { tags: ['grounded'] }], ['trees:no']);
  assert.deepEqual(problems, ['sign "nope" is not in SIGNS: add it to SIGNS with its category']);
});

test('A5: a retired tag is a problem', () => {
  assert.deepEqual(problemsOf([{ tags: ['old'] }]), ['sign "old" is retired (kept only so old rows load): tag what the note shows with an active sign']);
  assert.equal(real(['tree_dweller'], ['trees:yes']).length, 1);
});

test('A5: a trait implies reached through a narrower sign conflicts, naming the sign it comes from', () => {
  assert.deepEqual(problemsOf([{ tags: ['narrow'] }], ['trees:no', 'size:large']), [
    'sign "narrow" contradicts its holder\'s record (it reads as trees:yes, via broad): tag what the note shows',
  ]);
  assert.deepEqual(problemsOf([{ tags: ['narrow'] }], ['trees:yes', 'size:small']), [
    'sign "narrow" contradicts its holder\'s record (it reads as size:large): tag what the note shows',
  ]);
  assert.deepEqual(problemsOf([{ tags: ['narrow'] }]), []); // no trees or size record: unknown, not a conflict
});

test('A5: a trait denies the record holds is a problem', () => {
  assert.deepEqual(problemsOf([{ tags: ['daytime'] }], ['activity:night']), [
    'sign "daytime" contradicts its holder\'s record (it reads as not activity:night): tag what the note shows',
  ]);
  assert.deepEqual(problemsOf([{ tags: ['daytime'] }], ['activity:day']), []);
});

test('A5: an open denies fires on a sign held directly or through a narrower one, in either clue order', () => {
  const message = 'sign "grounded" contradicts its holder\'s record (it reads as not mid): tag what the note shows';
  assert.deepEqual(problemsOf([{ tags: ['grounded'] }, { tags: ['mid'] }]), [message]);
  assert.deepEqual(problemsOf([{ tags: ['mid'] }, { tags: ['grounded'] }]), [message]);
  assert.deepEqual(problemsOf([{ tags: ['narrow'] }, { tags: ['grounded'] }]), [message]);
  assert.deepEqual(problemsOf([{ tags: ['grounded'] }, { tags: ['broad'] }]), []); // broader than the denied sign
});

test('A5: a narrower and a broader sign on one note break one sign per fact; on two notes they are fine', () => {
  assert.deepEqual(problemsOf([{ tags: ['broad', 'narrow'] }]), [
    'sign "broad" is already stated by "narrow" on the same note: keep only the narrower (one sign per fact)',
  ]);
  assert.deepEqual(problemsOf([{ tags: ['narrow', 'mid'] }]), [
    'sign "mid" is already stated by "narrow" on the same note: keep only the narrower (one sign per fact)',
  ]);
  assert.deepEqual(problemsOf([{ tags: ['narrow'] }, { tags: ['broad'] }, { tags: ['mid'] }]), []);
  assert.deepEqual(real(['dung_piles', 'scent_marks'], []), []);
  assert.equal(problemsOf([{ tags: ['dung_piles', 'scent_marks'] }], [], SIGNS as Table).length, 1);
});

test('A5: a clean profile has no problems', () => {
  assert.deepEqual(problemsOf([{ tags: ['top', 'daytime'] }, { tags: ['size:large'] }, { tags: ['bottom'] }], ['trees:yes', 'activity:day']), []);
  assert.deepEqual(real(['burrower', 'digging_claws', 'poor_eyesight'], ['diet:insects', 'trees:no']), []);
});

// ---- A6: the rule fixes on real SIGNS (F1-F4, and S1's rulings for snorkel_nose, shares_food, often_in_trees,
// fully_aquatic, climbs_boulders; the S25 review fixes for above_tree_line, crevice_hider, leaf_litter).

test('A6: climber and swimmer carry no habitat rule', () => {
  assert.deepEqual(real(['climber'], ['trees:no']), []);
  assert.deepEqual(real(['swimmer'], ['system:terrestrial', 'habitat:forest']), []);
});

test('A6: never_climbs means trees only: any habitat, beside climber, but not beside a tree sign', () => {
  assert.deepEqual(real(['never_climbs'], ['trees:no', 'habitat:savanna']), []);
  assert.deepEqual(real(['never_climbs', 'climber'], ['trees:no']), []);
  assert.equal(real(['never_climbs'], ['trees:yes']).length, 1);
  const inTrees = real(['never_climbs', 'often_in_trees'], ['trees:no']);
  assert.equal(inTrees.length, 1);
  assert.match(inTrees[0], /not often_in_trees/);
});

test('A6: above_tree_line allows forest and trees lower down; sand_dunes needs no desert', () => {
  assert.deepEqual(real(['above_tree_line'], ['habitat:forest', 'trees:no']), []);
  assert.deepEqual(real(['above_tree_line'], ['habitat:forest', 'trees:yes']), []);
  assert.deepEqual(real(['above_tree_line', 'sleeps_high_in_trees'], ['habitat:forest', 'trees:yes']), []);
  assert.deepEqual(real(['sand_dunes'], ['habitat:shrubland']), []);
});

test('A6: crevice_hider needs no rocky habitat', () => {
  assert.deepEqual(real(['crevice_hider'], ['habitat:forest', 'habitat:wetlands']), []);
});

test('A6: leaf_litter states no forest_floor, so a leaf-litter climber passes', () => {
  assert.ok(!impliesOf('leaf_litter').includes('forest_floor'));
  assert.deepEqual(real(['leaf_litter', 'climber'], ['habitat:forest', 'trees:no']), []);
});

test('A6: snorkel_nose needs no fresh water; shares_food still rules out a loner', () => {
  assert.deepEqual(real(['snorkel_nose'], ['system:terrestrial', 'habitat:forest']), []);
  assert.deepEqual(real(['shares_food'], ['social:groups']), []);
  assert.match(real(['shares_food'], ['social:alone']).join(), /not social:alone/);
});

test('A6: often_in_trees needs neither trees yes nor forest; climbs_boulders needs no rocky habitat', () => {
  assert.deepEqual(real(['often_in_trees'], ['trees:no', 'habitat:savanna']), []);
  assert.deepEqual(real(['climbs_boulders'], ['habitat:forest']), []);
});

test('A6: fully_aquatic allows land and forest systems but not eggs laid on land', () => {
  assert.deepEqual(real(['fully_aquatic'], ['habitat:wetlands', 'system:terrestrial', 'habitat:forest']), []);
  assert.match(real(['fully_aquatic', 'eggs_on_land'], ['habitat:wetlands', 'birth:eggs', 'system:terrestrial']).join(), /not eggs_on_land/);
});
