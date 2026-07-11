export interface AnswerPriorSpecies {
  speciesId: number;
  commonName?: string | null;
  scientificName?: string | null;
  habitatDescription?: string | null;
  habitatTags?: readonly string[] | null;
  geographicDescription?: string | null;
  distributionComment?: string | null;
  conservationText?: string | null;
  conservationCode?: string | null;
  threats?: string | null;
  marine?: boolean | null;
  freshwater?: boolean | null;
}

export interface AnswerPriorAnchor {
  waypointType: string;
}

/**
 * Builds a soft, answer-independent location prior. Every candidate retains a
 * non-zero chance; GIS context influences selection but never proves identity.
 */
export function buildAnswerPrior(
  species: readonly AnswerPriorSpecies[],
  anchors: readonly AnswerPriorAnchor[],
): Map<number, number> {
  return new Map(
    [...species]
      .sort((left, right) => left.speciesId - right.speciesId)
      .map(candidate => {
        const contextualScore = anchors.reduce(
          (total, anchor) => total + scoreSpeciesForAnchor(candidate, anchor),
          0,
        );
        return [candidate.speciesId, 1 + contextualScore] as const;
      }),
  );
}

export function scoreSpeciesForAnchor(
  species: AnswerPriorSpecies,
  anchor: AnswerPriorAnchor,
): number {
  const text = speciesSearchText(species);

  if (anchor.waypointType === 'river' || anchor.waypointType === 'lake' || anchor.waypointType === 'wetland') {
    let score = species.freshwater ? 5 : 0;
    if (/(freshwater|river|stream|lake|wetland|marsh|swamp|aquatic|riparian)/.test(text)) score += 3;
    if (species.marine || /marine|coastal|shore|estuary/.test(text)) score += 1;
    return score;
  }

  if (anchor.waypointType === 'city' || anchor.waypointType === 'basecamp') {
    return /(urban|city|town|settlement|artificial|built|garden|crop|agricultur|pasture)/.test(text) ? 3 : 0;
  }

  if (anchor.waypointType === 'protected_area') {
    const code = (species.conservationCode ?? '').toUpperCase();
    let score = /^(VU|EN|CR)$/.test(code) ? 4 : 0;
    if (/(vulnerable|endangered|critically endangered|threatened)/.test(text)) score += 2;
    return score;
  }

  return 0;
}

function speciesSearchText(species: AnswerPriorSpecies): string {
  return [
    species.commonName,
    species.scientificName,
    species.habitatDescription,
    Array.isArray(species.habitatTags) ? species.habitatTags.join(' ') : null,
    species.geographicDescription,
    species.distributionComment,
    species.conservationText,
    species.conservationCode,
    species.threats,
  ].filter(Boolean).join(' ').toLowerCase();
}
