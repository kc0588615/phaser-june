import type { ExpeditionMapView } from '@/expedition/mapView';

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

export function buildPublicMysteryCase(
  authored: AuthoredMysteryCase,
  mapView: ExpeditionMapView,
): PublicMysteryCase {
  const firstSite = mapView.route[0];
  const label = firstSite.nearestFeature?.trim()
    || firstSite.biome?.trim()
    || 'Selected survey region';
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
  if (!ID_PATTERN.test(publicCase.id)) errors.push('case id is invalid');
  for (const [field, value] of Object.entries({
    title: publicCase.title,
    incident: publicCase.incident,
    atmosphere: publicCase.atmosphere,
    question: publicCase.question,
  })) {
    if (!validCopy(value)) errors.push(`${field} is invalid`);
  }
  if (choices.length < 3 || choices.length > 5) errors.push('case must expose three to five explanations');
  if (new Set(choices.map(choice => choice.id)).size !== choices.length) errors.push('explanation ids must be unique');
  for (const choice of choices) {
    if (!ID_PATTERN.test(choice.id) || !validCopy(choice.label) || !validCopy(choice.description)) {
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
    || resolution.sources.length < 1 || resolution.sources.some(source => !validCopy(source.label) || !validSourceUrl(source.url))) {
    errors.push('resolution content is incomplete');
  }
  const publicCopy = JSON.stringify(publicCase).toLowerCase();
  for (const term of forbiddenTerms.map(value => value.trim().toLowerCase()).filter(value => value.length >= 4)) {
    if (publicCopy.includes(term)) errors.push(`public copy leaks answer term: ${term}`);
  }
  return errors;
}

export function parsePublicMysteryCase(value: unknown): PublicMysteryCase | null {
  const source = record(value);
  const location = record(source.location);
  const choices = Array.isArray(source.explanationChoices)
    ? source.explanationChoices.flatMap(item => {
        const choice = record(item);
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
  const source = record(value);
  const answerExplanationId = string(source.answerExplanationId);
  const feedbackSource = record(source.explanationFeedback);
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
  const source = record(value);
  const evidenceChain = stringArray(source.evidenceChain, 6);
  const rejectedAlternatives = stringArray(source.rejectedAlternatives, 6);
  const sources = Array.isArray(source.sources) ? source.sources.flatMap(item => {
    const candidate = record(item);
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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function string(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
