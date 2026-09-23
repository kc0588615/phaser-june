import type { ExpeditionMapView } from '@/expedition/mapView';
import { getRecord } from '@/lib/record';

export interface MysteryExplanationChoice {
  id: string;
  label: string;
  description: string;
}

export interface MysteryLocationContext {
  label: string;
  basis: string;
  confidence: 'contextual';
}

export interface PublicMysteryCase {
  id: string;
  title: string;
  incident: string;
  atmosphere: string;
  question: string;
  location: MysteryLocationContext;
  explanationChoices: MysteryExplanationChoice[];
}

export interface MysterySource {
  label: string;
  url: string;
}

export interface MysteryResolution {
  headline: string;
  diagnosis: string;
  evidenceChain: string[];
  ecologicalRole: string;
  taxonomy: string;
  misconception: string;
  rejectedAlternatives: string[];
  sources: MysterySource[];
}

export interface PrivateMysteryCase {
  answerExplanationId: string;
  explanationFeedback: Record<string, string>;
  resolution: MysteryResolution;
}

export interface AuthoredMysteryCase {
  public: Omit<PublicMysteryCase, 'location'>;
  private: PrivateMysteryCase;
}

export interface DiagnosisFeedback {
  speciesVerdict: 'supported' | 'revise';
  explanationVerdict: 'supported' | 'revise';
  explanationText: string;
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAX_COPY_LENGTH = 1_000;

const FALLBACK_LOCATION_LABEL = 'Selected survey region';

export function buildPublicMysteryCase(
  authored: AuthoredMysteryCase,
  mapView: ExpeditionMapView,
  forbiddenTerms: readonly string[] = [],
): PublicMysteryCase {
  const firstSite = mapView.route[0];
  const label = [firstSite.nearestFeature?.trim(), firstSite.biome?.trim(), FALLBACK_LOCATION_LABEL]
    .find((candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0 && !copyLeaksTerms(candidate, forbiddenTerms))
    ?? FALLBACK_LOCATION_LABEL;
  return {
    ...authored.public,
    explanationChoices: authored.public.explanationChoices.map(choice => ({ ...choice })),
    location: {
      label,
      basis: 'Incident logged across three GIS-selected research sites.',
      confidence: 'contextual',
    },
  };
}

export function buildPrivateMysteryCase(authored: AuthoredMysteryCase): PrivateMysteryCase {
  return {
    answerExplanationId: authored.private.answerExplanationId,
    explanationFeedback: { ...authored.private.explanationFeedback },
    resolution: cloneResolution(authored.private.resolution),
  };
}

export function validateAuthoredMysteryCase(
  authored: AuthoredMysteryCase,
  forbiddenTerms: readonly string[],
): string[] {
  const errors: string[] = [];
  const publicCase = authored.public;
  const choices = publicCase.explanationChoices;
  for (const [field, value] of Object.entries({
    title: publicCase.title,
    incident: publicCase.incident,
    atmosphere: publicCase.atmosphere,
    question: publicCase.question,
  })) {
    if (!validCopy(value)) errors.push(`${field} is invalid`);
  }
  if (choices.length < 3 || choices.length > 5) errors.push('case must expose three to five explanations');
  for (const choice of choices) {
    if (!validCopy(choice.label) || !validCopy(choice.description)) {
      errors.push(`explanation ${choice.id || '(missing)'} is invalid`);
    }
  }
  if (!choices.some(choice => choice.id === authored.private.answerExplanationId)) {
    errors.push('correct explanation is not a public choice');
  }
  if (choices.some(choice => !validCopy(authored.private.explanationFeedback[choice.id]))) {
    errors.push('every explanation needs private feedback');
  }
  const resolution = authored.private.resolution;
  if (![resolution.headline, resolution.diagnosis, resolution.ecologicalRole, resolution.taxonomy, resolution.misconception].every(validCopy)
    || resolution.evidenceChain.length < 2 || resolution.evidenceChain.some(item => !validCopy(item))
    || resolution.rejectedAlternatives.length < 2 || resolution.rejectedAlternatives.some(item => !validCopy(item))
    || resolution.sources.length < 1 || resolution.sources.some(source => !validCopy(source.label) || !validCopy(source.url))) {
    errors.push('resolution content is incomplete');
  }
  errors.push(...leakedAnswerTerms(JSON.stringify(publicCase), forbiddenTerms).map(term => `public copy leaks answer term: ${term}`));
  return errors;
}

/** Scans the fully built public payload, including GIS-injected location copy. */
export function validatePublicMysteryCase(
  publicCase: PublicMysteryCase,
  forbiddenTerms: readonly string[],
): string[] {
  const errors: string[] = [];
  if (!validCopy(publicCase.location.label) || !validCopy(publicCase.location.basis) || publicCase.location.confidence !== 'contextual') {
    errors.push('location is invalid');
  }
  errors.push(...leakedAnswerTerms(JSON.stringify(publicCase), forbiddenTerms).map(term => `public copy leaks answer term: ${term}`));
  return errors;
}

export function parsePublicMysteryCase(value: unknown): PublicMysteryCase | null {
  const source = getRecord(value);
  const location = getRecord(source.location);
  const choices = Array.isArray(source.explanationChoices)
    ? source.explanationChoices.flatMap(item => {
        const choice = getRecord(item);
        return ID_PATTERN.test(string(choice.id)) && validCopy(choice.label) && validCopy(choice.description)
          ? [{ id: choice.id as string, label: choice.label as string, description: choice.description as string }]
          : [];
      })
    : [];
  if (!ID_PATTERN.test(string(source.id))
    || !validCopy(source.title) || !validCopy(source.incident) || !validCopy(source.atmosphere) || !validCopy(source.question)
    || choices.length < 3 || choices.length > 5 || new Set(choices.map(choice => choice.id)).size !== choices.length
    || !validCopy(location.label) || !validCopy(location.basis) || location.confidence !== 'contextual') return null;
  return {
    id: source.id as string,
    title: source.title as string,
    incident: source.incident as string,
    atmosphere: source.atmosphere as string,
    question: source.question as string,
    location: {
      label: location.label as string,
      basis: location.basis as string,
      confidence: 'contextual',
    },
    explanationChoices: choices,
  };
}

export function parsePrivateMysteryCase(value: unknown, publicCase?: PublicMysteryCase): PrivateMysteryCase | null {
  const source = getRecord(value);
  const answerExplanationId = string(source.answerExplanationId);
  const feedbackSource = getRecord(source.explanationFeedback);
  const resolution = parseMysteryResolution(source.resolution);
  const choiceIds = publicCase?.explanationChoices.map(choice => choice.id) ?? Object.keys(feedbackSource);
  if (!ID_PATTERN.test(answerExplanationId) || !choiceIds.includes(answerExplanationId) || !resolution) return null;
  const explanationFeedback = Object.fromEntries(choiceIds.flatMap(id => {
    const copy = feedbackSource[id];
    return validCopy(copy) ? [[id, copy as string]] : [];
  }));
  return Object.keys(explanationFeedback).length === choiceIds.length
    ? { answerExplanationId, explanationFeedback, resolution }
    : null;
}

export function parseMysteryResolution(value: unknown): MysteryResolution | null {
  const source = getRecord(value);
  const evidenceChain = stringArray(source.evidenceChain, 6);
  const rejectedAlternatives = stringArray(source.rejectedAlternatives, 6);
  const sources = Array.isArray(source.sources) ? source.sources.flatMap(item => {
    const candidate = getRecord(item);
    return validCopy(candidate.label) && validSourceUrl(candidate.url)
      ? [{ label: candidate.label as string, url: candidate.url as string }]
      : [];
  }) : [];
  if (![source.headline, source.diagnosis, source.ecologicalRole, source.taxonomy, source.misconception].every(validCopy)
    || evidenceChain.length < 2 || rejectedAlternatives.length < 2 || sources.length < 1) return null;
  return {
    headline: source.headline as string,
    diagnosis: source.diagnosis as string,
    evidenceChain,
    ecologicalRole: source.ecologicalRole as string,
    taxonomy: source.taxonomy as string,
    misconception: source.misconception as string,
    rejectedAlternatives,
    sources,
  };
}

function cloneResolution(resolution: MysteryResolution): MysteryResolution {
  return {
    ...resolution,
    evidenceChain: [...resolution.evidenceChain],
    rejectedAlternatives: [...resolution.rejectedAlternatives],
    sources: resolution.sources.map(source => ({ ...source })),
  };
}

function leakedAnswerTerms(copy: string, forbiddenTerms: readonly string[]): string[] {
  const haystack = copy.toLowerCase();
  const leaked = new Set<string>();
  for (const value of forbiddenTerms) {
    const term = value.trim().toLowerCase();
    if (term.length >= 4 && haystack.includes(term)) leaked.add(term);
  }
  return [...leaked];
}

function copyLeaksTerms(copy: string, forbiddenTerms: readonly string[]): boolean {
  return leakedAnswerTerms(copy, forbiddenTerms).length > 0;
}

function validCopy(value: unknown): value is string {
  return typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= MAX_COPY_LENGTH;
}

function validSourceUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_COPY_LENGTH) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function stringArray(value: unknown, max: number): string[] {
  return Array.isArray(value) && value.length <= max && value.every(validCopy) ? [...value] : [];
}

function string(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Assemble ordered content rows without exposing private fields in the public case. */
export function assembleMysteryCases(rows: {
  cases: Array<typeof import('@/db/schema').mysteryCases.$inferSelect>;
  explanations: Array<typeof import('@/db/schema').mysteryExplanations.$inferSelect>;
  resolutions: Array<typeof import('@/db/schema').mysteryResolutions.$inferSelect>;
  steps: Array<typeof import('@/db/schema').mysteryEvidenceSteps.$inferSelect>;
  alternatives: Array<typeof import('@/db/schema').mysteryRejectedAlternatives.$inferSelect>;
  sources: Array<typeof import('@/db/schema').mysterySources.$inferSelect>;
}): Map<number, AuthoredMysteryCase> {
  return new Map(rows.cases.map(item => {
    const explanations = rows.explanations.filter(row => row.caseId === item.id).sort((a, b) => a.sortOrder - b.sortOrder);
    const answer = explanations.find(row => row.isAnswer);
    const resolution = rows.resolutions.find(row => row.caseId === item.id);
    // The partial unique index prevents two answers, but cannot require one.
    if (!answer || !resolution) throw new Error(`Case ${item.slug} is missing its answer or resolution.`);
    return [item.speciesId, {
      public: {
        id: item.slug, title: item.title, incident: item.incident, atmosphere: item.atmosphere, question: item.question,
        explanationChoices: explanations.map(row => ({ id: row.slug, label: row.label, description: row.description })),
      },
      private: {
        answerExplanationId: answer.slug,
        explanationFeedback: Object.fromEntries(explanations.map(row => [row.slug, row.feedback])),
        resolution: {
          headline: resolution.headline, diagnosis: resolution.diagnosis, ecologicalRole: resolution.ecologicalRole,
          taxonomy: resolution.taxonomy, misconception: resolution.misconception,
          evidenceChain: rows.steps.filter(row => row.caseId === item.id).sort((a, b) => a.sequenceIndex - b.sequenceIndex).map(row => row.stepText),
          rejectedAlternatives: rows.alternatives.filter(row => row.caseId === item.id).sort((a, b) => a.sequenceIndex - b.sequenceIndex).map(row => row.alternativeText),
          sources: rows.sources.filter(row => row.caseId === item.id).sort((a, b) => a.id - b.id).map(row => ({ label: row.label, url: row.url })),
        },
      },
    }];
  }));
}

export interface MysteryCaseSeed extends AuthoredMysteryCase { species_iucn_id: number }

export function parseMysteryCaseSeed(value: unknown): MysteryCaseSeed {
  const source = getRecord(value);
  const publicSource = getRecord(source.public);
  const publicCase = parsePublicMysteryCase({ ...publicSource, location: { label: 'Selected survey region', basis: 'Seed validation', confidence: 'contextual' } });
  const privateCase = publicCase ? parsePrivateMysteryCase(source.private, publicCase) : null;
  if (!Number.isSafeInteger(source.species_iucn_id) || Number(source.species_iucn_id) <= 0 || !publicCase || !privateCase) {
    throw new Error('Invalid mystery case seed.');
  }
  // Do not silently discard malformed choices, feedback, or resolution entries.
  const { location: _location, ...publicFields } = publicCase;
  const seed = { species_iucn_id: Number(source.species_iucn_id), public: publicFields, private: privateCase };
  const canonical = (v: unknown): string => JSON.stringify(v, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  if (canonical(source.public) !== canonical(seed.public) || canonical(source.private) !== canonical(seed.private)) {
    throw new Error('Malformed mystery case content.');
  }
  const errors = validateAuthoredMysteryCase(seed, []);
  if (errors.length) throw new Error(errors.join('; '));
  return seed;
}
