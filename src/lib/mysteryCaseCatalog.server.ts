import type { AuthoredMysteryCase } from '@/lib/mysteryCase';

const CASES = new Map<number, AuthoredMysteryCase>([
  [512, {
    public: {
      id: 'waterless-feeding-ground',
      title: 'The Waterless Feeding Ground',
      incident: 'Fresh grazing and browsing traces keep appearing across a dry survey plot, even though the nearest dependable surface water is far away.',
      atmosphere: 'The feeding trail is recent, repeated, and concentrated during the coolest hours.',
      question: 'Which species made the traces, and what best explains its continued use of this arid site?',
      explanationChoices: [
        { id: 'plant-moisture', label: 'Moisture from plants', description: 'A desert-adapted herbivore can meet much of its water need through food.' },
        { id: 'hidden-water', label: 'An unmapped water source', description: 'The animals are returning to a spring or pool missed by the survey.' },
        { id: 'population-surge', label: 'Population surge', description: 'Unusually high numbers are forcing animals into marginal feeding ground.' },
        { id: 'drought-only', label: 'Drought damage only', description: 'The feeding marks are incidental; plant stress produced the visible pattern.' },
      ],
    },
    private: {
      answerExplanationId: 'plant-moisture',
      explanationFeedback: {
        'plant-moisture': 'This explanation fits the repeated feeding evidence and the dry-site context.',
        'hidden-water': 'No water-dependent travel pattern was documented; account for how the animal can persist between water points.',
        'population-surge': 'The observations show recurring use, not the crowding or broad overuse expected from a population surge.',
        'drought-only': 'Drought may shape the site, but it does not explain the fresh, repeated grazing and browsing marks.',
      },
      resolution: {
        headline: 'A dryland specialist at work',
        diagnosis: 'Addax feeding activity produced the traces. Moisture-rich grasses, shrubs, succulents, shoots, seeds, and melons can reduce its need for free water.',
        evidenceChain: ['Broad hoof traces and browsing signs indicate a large ground herbivore.', 'Cool-hour activity and open arid ground fit a heat-avoiding desert forager.', 'The diet and range evidence support plant-derived moisture rather than a hidden pool.'],
        ecologicalRole: 'Selective grazing and browsing move nutrients and shape sparse desert vegetation, but the ecological signal should not be mistaken for evidence of a population boom.',
        taxonomy: 'Addax nasomaculatus is a bovid: the sole living species in the genus Addax.',
        misconception: 'Finding fresh herbivore signs far from water does not prove that an unmapped waterhole exists.',
        rejectedAlternatives: ['A population surge lacks supporting density or overuse evidence.', 'Drought alone cannot create fresh hoof and feeding traces.'],
        sources: [
          { label: 'Smithsonian’s National Zoo — Addax', url: 'https://nationalzoo.si.edu/animals/addax' },
          { label: 'Sahara Conservation — Addax', url: 'https://saharaconservation.org/sahel-and-sahara-fauna/addax/' },
        ],
      },
    },
  }],
  [5_748, {
    public: {
      id: 'tracks-without-footprints',
      title: 'Tracks Without Footprints',
      incident: 'Fine ridges cross a coastal sand plot overnight, yet surface cameras show no animal walking the route.',
      atmosphere: 'The ridges weave beneath sparse vegetation and fade quickly after wind reaches the plot.',
      question: 'Which species left the pattern, and what process best explains the missing surface trail?',
      explanationChoices: [
        { id: 'subsurface-foraging', label: 'Subsurface foraging', description: 'A small digger is moving through shallow sand while hunting prey.' },
        { id: 'wind-pattern', label: 'Wind pattern', description: 'Airflow around plants formed ridges that resemble animal tracks.' },
        { id: 'buried-runoff', label: 'Buried runoff', description: 'Water beneath the surface displaced sand into narrow lines.' },
        { id: 'large-animal', label: 'A concealed large animal', description: 'A larger visitor crossed the site outside the camera view.' },
      ],
    },
    private: {
      answerExplanationId: 'subsurface-foraging',
      explanationFeedback: {
        'subsurface-foraging': 'This mechanism fits a continuous ridge with no exposed walking trail.',
        'wind-pattern': 'Wind erases the ridges, but their connected route beneath vegetation points to movement before erosion.',
        'buried-runoff': 'The route branches around prey-rich vegetation rather than following slope or drainage.',
        'large-animal': 'A large surface traveler should leave weight-bearing impressions as well as a visible camera passage.',
      },
      resolution: {
        headline: 'A hunter beneath the sand',
        diagnosis: 'De Winton’s golden mole made shallow subsurface runs while searching for small animal prey in soft coastal sand.',
        evidenceChain: ['The trace is a continuous ridge instead of separated footprints.', 'Movement stays within loose sand and beneath vegetation.', 'Diet evidence points to small invertebrate prey in the substrate.'],
        ecologicalRole: 'Subsurface insectivores redistribute soil while consuming small prey, linking dune structure to its hidden food web.',
        taxonomy: 'Cryptochloris wintoni belongs to Chrysochloridae, the African golden mole family, not the true mole family Talpidae.',
        misconception: 'A surface ridge can record an animal that never walked on the surface.',
        rejectedAlternatives: ['Wind explains rapid disappearance, not the organized route.', 'Runoff would follow terrain rather than a foraging path beneath plants.'],
        sources: [
          { label: 'Peer-reviewed rediscovery study', url: 'https://link.springer.com/article/10.1007/s10531-023-02728-2' },
          { label: 'Re:wild — De Winton’s golden mole rediscovered', url: 'https://www.rewild.org/news/de-wintons-golden-mole-rediscovered' },
        ],
      },
    },
  }],
  [7_140, {
    public: {
      id: 'broken-sapling-corridor',
      title: 'The Broken Sapling Corridor',
      incident: 'Young trees are snapped, bark is stripped, and a broad route through the vegetation keeps reopening after field crews mark it.',
      atmosphere: 'Damage is concentrated along a repeat travel corridor rather than spread evenly through the habitat.',
      question: 'Which species is involved, and what best explains this concentrated disturbance?',
      explanationChoices: [
        { id: 'megaherbivore-route', label: 'Routine feeding and travel', description: 'A wide-ranging herbivore is browsing while reusing a movement corridor.' },
        { id: 'overpopulation', label: 'Local overpopulation', description: 'Too many herbivores are exhausting vegetation across the region.' },
        { id: 'invasive-borer', label: 'Wood-boring invader', description: 'Hidden insects weakened the stems before they broke.' },
        { id: 'storm-damage', label: 'Storm damage', description: 'Wind and water snapped the young trees along an exposed line.' },
      ],
    },
    private: {
      answerExplanationId: 'megaherbivore-route',
      explanationFeedback: {
        'megaherbivore-route': 'This explanation fits both the plant damage and the repeatedly opened ground route.',
        'overpopulation': 'Concentrated corridor damage does not establish unusually high abundance across the wider habitat.',
        'invasive-borer': 'The field evidence points to external browsing and breakage rather than galleries inside the wood.',
        'storm-damage': 'Storm damage would not usually combine selective bark removal with repeated ground travel.',
      },
      resolution: {
        headline: 'Disturbance that engineers habitat',
        diagnosis: 'Asian elephant browsing and repeated movement produced the broken saplings, stripped bark, and reopened corridor.',
        evidenceChain: ['Heavy ground impressions indicate a very large terrestrial animal.', 'Bark, roots, shoots, and leafy growth show bulk plant feeding.', 'Repeated group travel explains why the same broad corridor reopens.'],
        ecologicalRole: 'Large herbivores can open vegetation, disperse seeds, and create routes used by other organisms. Local damage can therefore be natural ecosystem engineering rather than proof of ecological collapse.',
        taxonomy: 'Elephas maximus is an elephantid in the order Proboscidea and the broader afrotherian lineage.',
        misconception: 'Visible tree damage alone does not demonstrate overpopulation; scale and distribution matter.',
        rejectedAlternatives: ['Wood-boring insects leave internal galleries, not this combined browse-and-travel pattern.', 'A storm does not explain selective feeding signs or repeated corridor use.'],
        sources: [
          { label: 'Smithsonian’s National Zoo — Asian elephant', url: 'https://nationalzoo.si.edu/animals/asian-elephant' },
          { label: 'IUCN — Shrinking spaces for Asian elephants', url: 'https://iucn.org/news/species-survival-commission/202108/shrinking-spaces-worlds-largest-land-animal' },
        ],
      },
    },
  }],
  [12_763, {
    public: {
      id: 'opened-insect-nests',
      title: 'The Opened Insect Nests',
      incident: 'Several social-insect nests have been opened overnight, but the survey records little blood, fur, or prolonged digging at any one site.',
      atmosphere: 'The visits are quiet, selective, and repeated beneath forest cover.',
      question: 'Which species made these feeding marks, and what best explains the narrow target?',
      explanationChoices: [
        { id: 'specialist-foraging', label: 'Specialist foraging', description: 'A nocturnal feeder is opening nests to collect ants or termites.' },
        { id: 'generalist-digging', label: 'Generalist digging', description: 'A soil forager encountered the colonies while searching for varied prey.' },
        { id: 'nest-disease', label: 'Colony disease', description: 'The insects abandoned damaged nests before any vertebrate arrived.' },
        { id: 'human-disturbance', label: 'Human disturbance', description: 'People opened the nests and an animal was blamed because it was nearby.' },
      ],
    },
    private: {
      answerExplanationId: 'specialist-foraging',
      explanationFeedback: {
        'specialist-foraging': 'The focused openings and repeated nocturnal visits fit a narrow social-insect diet.',
        'generalist-digging': 'The evidence clusters at organized colonies rather than showing a broad search through soil.',
        'nest-disease': 'Disease might empty a colony, but it does not explain the external opening marks and recurring visits.',
        'human-disturbance': 'No tool pattern or daytime access record supports human opening at the sampled nests.',
      },
      resolution: {
        headline: 'A precise insect specialist',
        diagnosis: 'Sunda pangolin feeding opened the nests. Strong claws expose chambers and a long sticky tongue collects ants and termites.',
        evidenceChain: ['The target is an organized insect colony rather than general soil prey.', 'The visitor moves alone and under cover at night.', 'Limb and diet evidence support climbing, digging, and concentrated insect feeding.'],
        ecologicalRole: 'By disturbing nests and consuming social insects, specialized myrmecophages connect forest soils, insect colonies, and vertebrate predation.',
        taxonomy: 'Manis javanica belongs to Pholidota, a distinct mammal order more closely related to carnivorans than to armadillos.',
        misconception: 'Protective scales do not make pangolins reptiles; they are placental mammals.',
        rejectedAlternatives: ['A generalist soil hunter would leave a broader search pattern.', 'Colony disease does not account for the repeated external opening marks.'],
        sources: [
          { label: 'World Wildlife Fund — Sunda pangolin', url: 'https://www.worldwildlife.org/species/sunda-pangolin' },
          { label: 'Mammal Diversity Database — Manis javanica', url: 'https://www.mammaldiversity.org/taxon/1000665/' },
        ],
      },
    },
  }],
  [15_955, {
    public: {
      id: 'silent-prey-trail',
      title: 'The Silent Prey Trail',
      incident: 'A once-busy animal trail has become quiet while scrapes, scent marks, and short bursts of alarm activity appear nearby.',
      atmosphere: 'The change is strongest around cover and fades with distance from the marked route.',
      question: 'Which species is involved, and what best explains the change in trail use?',
      explanationChoices: [
        { id: 'predator-avoidance', label: 'Predator avoidance', description: 'Prey are changing where and when they move after detecting a solitary hunter.' },
        { id: 'prey-collapse', label: 'Prey population collapse', description: 'The trail is quiet because local prey numbers have sharply fallen.' },
        { id: 'seasonal-migration', label: 'Seasonal movement', description: 'Animals left the corridor as part of a normal annual shift.' },
        { id: 'observer-effect', label: 'Survey disturbance', description: 'Cameras and field crews displaced animals from the monitored trail.' },
      ],
    },
    private: {
      answerExplanationId: 'predator-avoidance',
      explanationFeedback: {
        'predator-avoidance': 'This explains the spatial link among cover, territorial signs, alarms, and reduced trail use.',
        'prey-collapse': 'Lower trail activity alone cannot establish a population decline; the localized avoidance pattern needs explanation.',
        'seasonal-migration': 'The shift is concentrated around fresh territorial signs rather than occurring evenly across the route.',
        'observer-effect': 'Survey effort is similar across sites, while the response tracks cover and scent-mark locations.',
      },
      resolution: {
        headline: 'A landscape of avoidance',
        diagnosis: 'Tiger presence changed prey behavior around a marked hunting route. The evidence supports localized avoidance, not an immediate conclusion that prey disappeared.',
        evidenceChain: ['Padded ground tracks and exposed travel rule out aerial or subsurface movement.', 'Scrapes and scent marks fit a solitary territorial mammal.', 'Alarm activity and quiet trail segments cluster around stalking cover.'],
        ecologicalRole: 'Large predators affect ecosystems through predation and through the places and times prey choose to feed and travel.',
        taxonomy: 'Panthera tigris is a felid in the big-cat genus Panthera.',
        misconception: 'Fewer camera detections do not automatically mean fewer animals; behavior and detectability can change first.',
        rejectedAlternatives: ['A population collapse needs abundance evidence beyond one quiet trail.', 'Seasonal migration should produce a broader, time-linked shift rather than a localized response to fresh signs.'],
        sources: [
          { label: 'Smithsonian’s National Zoo — Tiger', url: 'https://nationalzoo.si.edu/animals/tiger' },
          { label: 'World Wildlife Fund — Tiger', url: 'https://www.worldwildlife.org/species/tiger' },
        ],
      },
    },
  }],
  [18_732, {
    public: {
      id: 'seedlings-beyond-the-gap',
      title: 'Seedlings Beyond the Gap',
      incident: 'Fruit fragments and new seedlings appear beyond a broken stretch of canopy, far from the nearest fruiting parent trees.',
      atmosphere: 'The pattern forms overnight and links high feeding sites to open regeneration plots.',
      question: 'Which species is involved, and what process best explains plants crossing the canopy gap?',
      explanationChoices: [
        { id: 'mobile-seed-dispersal', label: 'Mobile seed dispersal', description: 'A fruit-feeding animal carries or passes seeds between separated forest patches.' },
        { id: 'wind-dispersal', label: 'Wind dispersal', description: 'Air currents carried the seeds across the opening.' },
        { id: 'human-planting', label: 'Unrecorded planting', description: 'People established seedlings outside the documented restoration plots.' },
        { id: 'parent-trees-missed', label: 'Hidden parent trees', description: 'The survey overlooked nearby fruiting trees beneath dense cover.' },
      ],
    },
    private: {
      answerExplanationId: 'mobile-seed-dispersal',
      explanationFeedback: {
        'mobile-seed-dispersal': 'This mechanism connects elevated fruit feeding, overnight movement, and seedlings beyond a canopy break.',
        'wind-dispersal': 'Wind can move some seeds, but the fruit remains and concentrated feeding sites point to an animal vector.',
        'human-planting': 'No planting record or regular spacing supports deliberate restoration at these points.',
        'parent-trees-missed': 'The mapped fruiting trees and genetic sampling place the parent source across the canopy gap.',
      },
      resolution: {
        headline: 'A forest connection made on the wing',
        diagnosis: 'Livingstone’s flying fox moved fruit material and seeds between separated canopy patches, supporting regeneration beyond the gap.',
        evidenceChain: ['Fruit and flower remains identify an above-ground plant food source.', 'Roost-centered group movement and wide forelimbs support aerial travel.', 'The island range and overnight route connect feeding trees to distant seedling plots.'],
        ecologicalRole: 'Fruit bats can move seeds and pollen through island forests, helping connect plant populations across fragmented canopy.',
        taxonomy: 'Pteropus livingstonii is a pteropodid fruit bat in the mammal order Chiroptera.',
        misconception: 'Bats are not ecological bystanders at fruiting trees; feeding can transport seeds and pollen beyond the parent plant.',
        rejectedAlternatives: ['Wind does not explain the associated fruit pulp and elevated feeding sites.', 'Unrecorded planting is unsupported by site records and the irregular seedling pattern.'],
        sources: [
          { label: 'Bat Conservation International — Livingstone’s fruit bat', url: 'https://www.batcon.org/bat/livingstones-fruit-bat/' },
          { label: 'Durrell Wildlife Conservation Trust — Livingstone’s fruit bat', url: 'https://www.durrell.org/wildlife/species-index/livingstones-fruit-bat/' },
        ],
      },
    },
  }],
]);

export function getMysteryCaseForIucnId(iucnId: number): AuthoredMysteryCase | null {
  return CASES.get(iucnId) ?? null;
}

export function getMysteryCaseCatalog(): ReadonlyMap<number, AuthoredMysteryCase> {
  return CASES;
}
