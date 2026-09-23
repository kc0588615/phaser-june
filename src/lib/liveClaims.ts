/** Shared evidence effects and claim rules. Hidden answer/effect tables stay server-side. */
import { getRecord } from '@/lib/record';
export interface ExplanationEffects { supports: string[]; contradicts: string[] }
export type HypothesisState = 'open' | 'supported' | 'contradicted';
export type Hypotheses = Record<string, HypothesisState>;
export interface ClaimState {
  species: 'open' | 'locked'; explanation: 'open' | 'locked'; wrongClaims: number;
  lockedSpeciesId?: number; lockedExplanationId?: string;
}
export type ClaimInput = { claim: 'species'; speciesId: number } | { claim: 'explanation'; explanationId: string };
export const EMPTY_CLAIMS: ClaimState = { species: 'open', explanation: 'open', wrongClaims: 0 };

export function parseExplanationEffects(value: unknown): ExplanationEffects | null {
  if (value == null) return null;
  const v = getRecord(value);
  const valid = (a: unknown): a is string[] => Array.isArray(a) && a.length <= 4 && new Set(a).size === a.length
    && a.every(x => typeof x === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x) && x.length <= 80);
  if (!valid(v.supports) || !valid(v.contradicts) || v.supports.some(id => (v.contradicts as string[]).includes(id))) {
    throw new Error('Invalid explanation effects');
  }
  return { supports: [...v.supports], contradicts: [...v.contradicts] };
}

export function validateExplanationEffects(effects: readonly unknown[], choices: readonly string[], answer: string, strict: boolean): string[] {
  const errors: string[] = []; const contradicted = new Set<string>(); let redHerrings = 0;
  for (const value of effects) {
    try {
      const effect = parseExplanationEffects(value);
      if (!effect) continue;
      if ([...effect.supports, ...effect.contradicts].some(id => !choices.includes(id))) errors.push('Unknown explanation slug');
      if (effect.contradicts.includes(answer)) errors.push('Evidence contradicts answer explanation');
      redHerrings += effect.supports.filter(id => id !== answer).length;
      effect.contradicts.forEach(id => contradicted.add(id));
    } catch { errors.push('Invalid explanation effects'); }
  }
  if (redHerrings > 2) errors.push('More than two red herrings');
  if (strict && choices.some(id => id !== answer && !contradicted.has(id))) errors.push('Wrong explanation has no contradicting evidence');
  return errors;
}

export function foldHypotheses(choices: readonly string[], effects: readonly unknown[], answer?: string): Hypotheses {
  const states: Hypotheses = Object.fromEntries(choices.map(id => [id, 'open']));
  for (const value of effects) {
    const effect = parseExplanationEffects(value);
    if (!effect) continue;
    if ([...effect.supports, ...effect.contradicts].some(id => !choices.includes(id)) || (answer && effect.contradicts.includes(answer))) {
      throw new Error('Explanation corpus invariant failed');
    }
    for (const id of effect.supports) if (states[id] === 'open') states[id] = 'supported';
    for (const id of effect.contradicts) states[id] = 'contradicted';
  }
  return states;
}

export function claimsFromMetadata(metadata: unknown): ClaimState {
  const m = getRecord(metadata); const c = getRecord(m.claims);
  const wrong = c.wrongClaims ?? m.wrongGuessCount ?? 0;
  const speciesLocked = c.species === 'locked' && Number.isSafeInteger(c.lockedSpeciesId) && Number(c.lockedSpeciesId) > 0;
  const explanationLocked = c.explanation === 'locked' && typeof c.lockedExplanationId === 'string';
  return {
    species: speciesLocked ? 'locked' : 'open', explanation: explanationLocked ? 'locked' : 'open',
    wrongClaims: Number.isSafeInteger(wrong) ? Math.max(0, Math.min(3, Number(wrong))) : 0,
    ...(speciesLocked ? { lockedSpeciesId: Number(c.lockedSpeciesId) } : {}),
    ...(explanationLocked ? { lockedExplanationId: c.lockedExplanationId as string } : {}),
  };
}

export function decideClaim(claims: ClaimState, input: ClaimInput, answerId: number, answerExplanation: string,
  candidateIds: readonly number[], eliminatedIds: readonly number[], hypotheses: Hypotheses) {
  if (claims.wrongClaims >= 3) return { claims, verdict: 'revise' as const, resolved: false, slipped: true };
  if (claims[input.claim] === 'locked') return { error: 'claim_locked' } as const;
  if (input.claim === 'species' && !candidateIds.includes(input.speciesId)) return { error: 'invalid_candidate' } as const;
  if (input.claim === 'species' && eliminatedIds.includes(input.speciesId)) return { error: 'candidate_eliminated' } as const;
  if (input.claim === 'explanation' && !Object.hasOwn(hypotheses, input.explanationId)) return { error: 'invalid_explanation' } as const;
  if (input.claim === 'explanation' && hypotheses[input.explanationId] === 'contradicted') return { error: 'hypothesis_contradicted' } as const;
  const correct = input.claim === 'species' ? input.speciesId === answerId : input.explanationId === answerExplanation;
  const next: ClaimState = correct ? { ...claims, [input.claim]: 'locked',
    ...(input.claim === 'species' ? { lockedSpeciesId: input.speciesId } : { lockedExplanationId: input.explanationId }),
  } : { ...claims, wrongClaims: claims.wrongClaims + 1 };
  return { claims: next, verdict: correct ? 'supported' as const : 'revise' as const,
    resolved: next.species === 'locked' && next.explanation === 'locked', slipped: next.wrongClaims >= 3 };
}

/** Only already-revealed IDs select effects; legacy saves never acquire new authoring effects. */
export function hypothesesFromMetadata(metadata: unknown): Hypotheses {
  const m = getRecord(metadata); const priv = getRecord(m.casePrivate); const mystery = getRecord(priv.mystery);
  const publicMystery = getRecord(getRecord(m.casePublic).mystery);
  const choices = Array.isArray(publicMystery.explanationChoices) ? publicMystery.explanationChoices.map(x => getRecord(x).id).filter((x): x is string => typeof x === 'string') : [];
  const hints = Array.isArray(priv.familyHints) ? priv.familyHints.map(getRecord) : [];
  const cards = getRecord(priv.familyCardEffects);
  const ledger = Array.isArray(m.factLedger) ? m.factLedger.map(getRecord) : [];
  const applications = Array.isArray(m.evidenceApplications) ? m.evidenceApplications.map(getRecord) : [];
  return foldHypotheses(choices, [
    ...ledger.map(entry => hints.find(h => h.id === entry.hintId)?.explains),
    ...applications.map(entry => cards[String(entry.cardId)]),
  ], typeof mystery.answerExplanationId === 'string' ? mystery.answerExplanationId : undefined);
}

export function revealedExplanationFeedback(metadata: unknown): Record<string, string> {
  const entries = getRecord(getRecord(metadata).explanationFeedback);
  return Object.fromEntries(Object.entries(entries).filter((pair): pair is [string, string] => typeof pair[1] === 'string'));
}

/** Public prose about a revealed fact, never the hidden effects table. */
export function revealedEffectNote(metadata: unknown, family: string, rung: number): string | undefined {
  const m = getRecord(metadata); const priv = getRecord(m.casePrivate);
  const ids = getRecord(priv.familyHintIds)[family];
  const id = Array.isArray(ids) ? ids[rung] : undefined;
  const hint = Array.isArray(priv.familyHints) ? priv.familyHints.map(getRecord).find(h => h.id === id) : undefined;
  const effect = parseExplanationEffects(hint?.explains);
  if (!effect) return undefined;
  const choices = getRecord(getRecord(m.casePublic).mystery).explanationChoices;
  const label = (id: string) => Array.isArray(choices) ? choices.map(getRecord).find(c => c.id === id)?.label : undefined;
  const notes = [
    ...effect.supports.map(id => label(id) ? `Supports ${label(id)}` : ''),
    ...effect.contradicts.map(id => label(id) ? `Weakens ${label(id)}` : ''),
  ].filter(Boolean);
  return notes.length ? notes.join(' · ') : undefined;
}

/** Attach the public explanation note to a revealed fact when its rung has one. */
export function withExplanationNote<T extends { family: string; rung: number }>(fact: T, metadata: unknown): T & { explanationNote?: string } {
  const explanationNote = revealedEffectNote(metadata, fact.family, fact.rung);
  return explanationNote ? { ...fact, explanationNote } : fact;
}
