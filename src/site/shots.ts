// Screenshots of the game on the website (plan 051 §9), in src/site/shots/ as WebP. Taken 2026-10-29 from the game at
// origin/main 0bbbeb0e, light mode: globe, board-phone and hero-board from the production build; the rest from a dev
// build, the seeded trail played through window.__cc. `photos`: the animals (profile ids) whose photos show in the
// shot; each page's footer credits them (render.tsx), and the build fails on an id with no profile or photo.
// Retake: the take.mjs and convert.mjs in the cc-website mission's artifacts (shots/), then check every shot by eye.

export type Shot = {
  file: string;
  /** Pixels of the file (390-wide phone shots are 2x). */
  width: number;
  height: number;
  alt: string;
  /** The seeded trail shown: `/explore/?seed=…&place=…`, and its round (null: no round on screen). */
  seed: number | null;
  place: string | null;
  round: number | null;
  photos: number[];
};

const PHONE = { width: 780, height: 1688 };
const AFRICA = { seed: 1, place: 'continent:africa' };
// Round 1 of seed 1 in Africa: Aye-aye (the camera's), Okapi, Addax, Chimpanzee, Indri.
const ROUND_1 = [23, 29, 50, 56, 61];

export const SHOTS = {
  globe: {
    file: 'globe.webp', ...PHONE, seed: null, place: null, round: null, photos: [],
    alt: 'The globe, with each continent and how many animals live there',
  },
  boardPhone: {
    file: 'board-phone.webp', ...PHONE, ...AFRICA, round: 1, photos: ROUND_1,
    alt: 'A round on a phone: five look-alike animals in the evidence grid, their cards pinned on a board of gems',
  },
  heroBoard: {
    file: 'hero-board.webp', width: 1440, height: 900, ...AFRICA, round: 1, photos: ROUND_1,
    alt: 'A round on a computer: the board of gems with five animal cards pinned on it, the evidence grid beside it',
  },
  fieldGuide: {
    file: 'field-guide.webp', ...PHONE, ...AFRICA, round: 1, photos: ROUND_1,
    alt: 'The Aye-aye\'s field guide, open over the grid: its photo, its signs and its answers to the questions',
  },
  gridMarked: {
    file: 'grid-marked.webp', ...PHONE, ...AFRICA, round: 1, photos: ROUND_1,
    alt: 'The evidence grid mid-round: the camera\'s answer to the size question is no, and the Okapi is ruled out',
  },
  witnessNote: {
    file: 'witness-note.webp', ...PHONE, ...AFRICA, round: 2, photos: [32, 39, 46, 56, 57],
    alt: 'A witness note: "Its long snout looks like a stretched-out pig\'s snout." 2 of 5 field guides say this too',
  },
  roundEnd: {
    file: 'round-end.webp', ...PHONE, ...AFRICA, round: 1, photos: ROUND_1,
    alt: 'The round-end card: found it, the Aye-aye, with its family tree and the evidence lined up',
  },
  journal: {
    file: 'journal.webp', ...PHONE, ...AFRICA, round: null, photos: [23, 57],
    alt: 'The Field Journal with 2 of 76 animals found, the Aye-aye and the Aardvark, each with its range map and facts',
  },
  globeFound: {
    file: 'globe-found.webp', ...PHONE, ...AFRICA, round: null, photos: [],
    alt: 'The globe with the two finds marked in Africa, and Africa\'s row saying 2 found',
  },
} satisfies Record<string, Shot>;

export type ShotName = keyof typeof SHOTS;
