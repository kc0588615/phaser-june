// Science words in clue text, each with a plain definition a player can tap to
// read. Pure: glossaryParts splits text into plain runs and glossary terms.

export interface GlossaryTerm {
  /** Shown as the heading of the definition. */
  term: string;
  definition: string;
}

// [term, definition, pattern (defaults to the term)]. Patterns are
// case-insensitive and matched on word boundaries; longer ones win.
const ENTRIES: Array<[string, string, string?]> = [
  // Life cycle
  ['Oviparous', 'Lays eggs that hatch outside the mother’s body.'],
  ['Clutch', 'A batch of eggs laid at one time.'],
  ['Metamorphosis', 'The big body change from tadpole to frog.'],
  ['Froglet', 'A young frog that has just finished changing from a tadpole.', 'froglets?'],
  ['Internal fertilisation', 'The eggs are fertilized inside the female’s body.', 'internal fertili[sz]ation'],
  ['Temperature-dependent sex determination', 'The warmth of the nest decides whether eggs hatch male or female.'],
  ['Lineage', 'A family line of ancestors and their descendants.'],
  ['Joey', 'A baby marsupial, like a baby kangaroo or wombat.', 'joeys?'],
  ['Puggle', 'A baby echidna.'],
  ['Marsupial', 'A mammal whose tiny newborn grows in its mother’s pouch.', 'marsupials?'],
  ['Pouch', 'A pocket of skin on the mother’s belly where a marsupial baby grows.'],
  ['Hybrid', 'The young of parents from two different species or subspecies.', 'hybrids?'],
  // Bodies
  ['Carapace', 'The top part of a turtle’s shell.'],
  ['Plastron', 'The bottom part of a turtle’s shell.'],
  ['Scute', 'One of the hard plates covering a turtle’s shell.', 'scutes?'],
  ['Prehensile', 'Able to grab and hold on, like a hand.'],
  ['Dorsal', 'On the back.', 'dorsal|dorsum'],
  ['Vertebral keel', 'A ridge running down the middle of the shell.'],
  ['Ossified', 'Turned into bone.'],
  ['Growth annuli', 'Rings on each shell plate, added as the animal grows.', 'growth annuli'],
  ['Morph', 'One of the different color forms of the same species.', 'morphs?'],
  ['Copulatory organ', 'A body part males use to mate.'],
  ['Vertebrate', 'An animal with a backbone.'],
  ['Keratin', 'The tough material that hair, nails, horns and pangolin scales are made of.'],
  ['Venomous', 'Able to inject a toxin with a bite or sting.', 'venomous|venom'],
  ['Pericardial sacs', 'Pouches around the heart.', 'pericardial sacs?'],
  ['Bimodal respiration', 'Breathing two ways: with lungs, and through the skin or throat.'],
  ['Suctorial', 'Built for sucking or clinging.'],
  ['Exudes', 'Oozes out.'],
  // Behavior and diet
  ['Nocturnal', 'Active at night.'],
  ['Diurnal', 'Active during the day.'],
  ['Crepuscular', 'Active at dawn and dusk.'],
  ['Arboreal', 'Lives in trees.'],
  ['Fossorial', 'Digs and lives underground.'],
  ['Basking', 'Lying in the sun to warm up.'],
  ['Hibernates', 'Sleeps deeply through winter to save energy.', 'hibernat(?:es|ion|ing|e)'],
  ['Wallows', 'Rolls or lies in mud or water to cool off.', 'wallows?|wallowing'],
  ['Territory', 'An area an animal lives in and defends from others of its kind.', 'territory|territories'],
  ['Haypiles', 'Piles of dried plants a pika stores to eat in winter.', 'haypiles?'],
  ['Nectar', 'The sweet liquid flowers make to attract animals.'],
  ['Pollen', 'Fine powder from flowers that helps plants make seeds.'],
  ['Carrion', 'The meat of animals that are already dead.'],
  ['Omnivore', 'Eats both plants and animals.'],
  ['Herbivore', 'Eats only plants.'],
  ['Carnivore', 'Eats other animals.', 'carnivore|carnivorous'],
  ['Insectivore', 'Mostly eats insects.'],
  ['Herbivory', 'Eating plants.'],
  ['Seed dispersal', 'Carrying seeds to new places, often by eating fruit.'],
  ['Ecosystem engineer', 'An animal that reshapes its habitat in ways that help other living things.', 'ecosystem engineers?'],
  ['Altitudinal migration', 'Moving up and down mountains with the seasons.', 'altitudinal migrations?'],
  // Places
  ['Realm', 'One of Earth’s eight great wildlife regions. Each has its own mix of animals, shaped by oceans, mountains and deserts that are hard to cross.'],
  ['Endemic', 'Found in one place and nowhere else on Earth.'],
  ['Headwaters', 'The small streams where a river begins.'],
  ['Canopy', 'The top layer of a forest, where the tree crowns meet.'],
  ['Understory', 'The layer of plants growing under a forest’s tall trees.'],
  ['Cloud forest', 'A mountain forest that is often wrapped in cloud and mist.', 'cloud forests?'],
  ['Afroalpine', 'High mountain grassland in Africa, above where trees grow.'],
  ['Moorland', 'Open, windy land covered with grass and low shrubs.'],
  ['Bais', 'Swampy forest clearings where elephants gather to drink and find minerals.'],
  ['Lichens', 'Crusty growths made of a fungus and an alga living together.', 'lichens?'],
  ['Savanna', 'Grassland with scattered trees.'],
  ['Scrubland', 'Land covered with low, tough bushes.', 'scrubland|scrub'],
  ['Mangrove', 'Trees that grow in salty water along tropical coasts.', 'mangroves?'],
  ['Kopje', 'A small rocky hill rising out of the African plains.', 'kopjes?'],
  ['Sundaland', 'The part of Southeast Asia that includes Borneo, Sumatra, Java and the Malay Peninsula.'],
  ['Gondwana', 'An ancient supercontinent that split into South America, Africa, India, Australia and Antarctica.'],
  ['Monsoon', 'The rainy season brought by seasonal winds.'],
  ['Substrate', 'The ground or bottom surface an animal lives on.', 'substrates?'],
  ['Caltrops', 'Spiky objects that always land with a point sticking up.'],
  ['Adaptive radiation', 'When one ancestor spreads out and evolves into many species, each suited to a different home.'],
  // Family tree
  // Class and Order only as labels ("Class: Amphibia"), not in "in order to".
  ['Class', 'A big group of related animals, like mammals, reptiles or amphibians.', 'class(?=:)'],
  ['Order', 'A group inside a class, like frogs and toads, or turtles.', 'order(?=:)'],
  ['Family', 'A group of closely related animals, like the cat family.'],
  ['Genus', 'A small group of very close relatives. It is the first word of a scientific name.'],
  ['Amphibia', 'Amphibians: frogs, toads and salamanders. Most start life in water and have thin, damp skin.'],
  ['Reptilia', 'Reptiles: turtles, snakes, lizards and crocodiles. They have scaly skin and most lay eggs on land.'],
  ['Mammalia', 'Mammals: animals with hair that feed their young milk.'],
  ['Anura', 'Frogs and toads.'],
  ['Caudata', 'Salamanders and newts: amphibians with tails.'],
  ['Testudines', 'Turtles and tortoises.'],
  ['Carnivora', 'Meat-eating mammals like cats, dogs and bears.'],
  ['Artiodactyla', 'Hoofed mammals with an even number of toes, like deer, antelopes and cattle.'],
  ['Perissodactyla', 'Hoofed mammals with an odd number of toes, like horses, zebras and rhinos.'],
  ['Primates', 'Monkeys, apes, lemurs and their relatives, including humans.'],
  ['Proboscidea', 'Elephants.'],
  ['Monotremata', 'Egg-laying mammals: the platypus and echidnas.'],
  ['Pilosa', 'Sloths and anteaters.'],
  ['Cingulata', 'Armadillos.'],
  ['Diprotodontia', 'Kangaroos, koalas, wombats and their relatives.'],
  ['Dasyuromorphia', 'Meat-eating marsupials, like the Tasmanian devil and quolls.'],
  ['Peramelemorphia', 'Bandicoots and bilbies.'],
  ['Afrosoricida', 'Tenrecs and golden moles.'],
  ['Macroscelidea', 'Sengis, also called elephant shrews.'],
  ['Lagomorpha', 'Rabbits, hares and pikas.'],
  ['Rodentia', 'Rodents: mice, squirrels, marmots and their relatives.'],
  ['Eulipotyphla', 'Shrews, moles, hedgehogs and solenodons.'],
  ['Chiroptera', 'Bats.'],
  ['Pholidota', 'Pangolins.'],
  ['Tubulidentata', 'The aardvark, the only living member of its order.'],
  // Conservation (IUCN Red List)
  ['Critically Endangered', 'At extremely high risk of dying out in the wild.'],
  ['Endangered', 'At very high risk of dying out in the wild.'],
  ['Vulnerable', 'At high risk of dying out in the wild.'],
  ['Near Threatened', 'Close to being at risk of dying out.'],
  ['Least Concern', 'Widespread and not at risk for now.'],
  ['Functionally extinct', 'So few are left that the species can’t recover on its own.'],
  ['Extinct', 'None are left alive.'],
  ['Allee effect', 'When a group gets so small that finding mates is hard, so numbers keep falling.'],
  ['Desertification', 'When dry land slowly turns into desert.'],
  ['Poaching', 'Hunting or taking animals when it is against the law.', 'poaching|poachers?'],
  ['Snares', 'Wire traps set to catch animals.', 'snares?'],
  ['Palm oil', 'An oil from palm fruit used in many foods; forests are cleared to grow the palms.'],
  ['Ivory', 'The hard white material that tusks are made of.'],
  ['eDNA', 'Environmental DNA: traces animals leave in water or soil, used to find rare species.'],
];

const TERMS = ENTRIES
  .map(([term, definition, pattern]) => ({ term, definition, pattern: pattern ?? term.toLowerCase() }))
  .sort((a, b) => b.pattern.length - a.pattern.length);

const ANY_TERM = new RegExp(`\\b(?:${TERMS.map(entry => `(${entry.pattern})`).join('|')})\\b`, 'gi');

export const GLOSSARY: readonly GlossaryTerm[] = TERMS.map(({ term, definition }) => ({ term, definition }));

export type TextPart = string | { text: string; term: GlossaryTerm };

/** Split text into plain runs and glossary terms; each term is marked once, at its first use. */
export function glossaryParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const seen = new Set<string>();
  let last = 0;
  for (const match of text.matchAll(ANY_TERM)) {
    const index = match.slice(1).findIndex(group => group !== undefined);
    const term = GLOSSARY[index];
    if (!term || seen.has(term.term)) continue;
    seen.add(term.term);
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ text: match[0], term });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
