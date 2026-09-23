// Evidence ladder — continuous deduction between the three hard clues.
//
// Each family owns an ordered ladder of reviewed facts about the answer. Every
// direct match climbs the matched family's ladder one rung (one Speak per
// swap); each rung carries a trait tag in the family's category, and every live
// candidate lacking that tag is ruled out. Rung tags are authored broad → narrow
// so early matches disqualify only broadly different animals and later rungs
// cut closer. A single ladder never identifies the animal (final rung keeps ≥2
// survivors); families must be combined. The six-move hard card stays the
// decisive site clue and closes its family.
import { EVIDENCE_FAMILY_LABELS, isEvidenceFamily, type EvidenceChargeState, type EvidenceFamily } from '@/expedition/evidenceFamilies';
import { CASE_TRAIT_CATEGORIES, PROFILE_KEY_BY_CATEGORY, type CaseTraitCategory, type CompilerSpeciesProfile } from '@/lib/caseTraits';
import { isCanonicalDeductionTag } from '@/lib/deductionTags';
import type { EvidenceProgressInput } from '@/lib/evidenceRunState';
import { getRecord } from '@/lib/runCaseState';

/** Rung survivor bounds: never zero information, never a single-family identification. */
export const LADDER_MIN_SURVIVORS = 2;
export const LADDER_MAX_SURVIVORS = 5;
export const MAX_LEDGER_ENTRIES = 3 * 6 * 3;

export interface LadderIssue {
  family: EvidenceFamily;
  hintId: number;
  /** Zero-based rung revealed by this issue. */
  rung: number;
}

export interface LadderSelection {
  issues: LadderIssue[];
  /** Families matched this move whose ladder is already complete. No fact, no reward. */
  reinforcedFamilies: EvidenceFamily[];
}

/**
 * One rung per player swap: the direct-match family with the most cleared cells
 * (ties → replay order) that still has rungs. A Field Signal payout adds its
 * one or two rungs on the clearing family. Cascades never climb.
 */
export function selectLadderIssues(
  input: Pick<EvidenceProgressInput, 'directClears' | 'directMatchFamilies' | 'signalClearedFamily' | 'signalHintCount'>,
  cursors: EvidenceChargeState,
  idsByFamily: Record<EvidenceFamily, readonly number[]>,
): LadderSelection {
  const next = { ...cursors };
  const issues: LadderIssue[] = [];
  const reinforced = new Set<EvidenceFamily>();
  const climb = (family: EvidenceFamily): boolean => {
    const ids = idsByFamily[family] ?? [];
    if (next[family] >= ids.length) { reinforced.add(family); return false; }
    issues.push({ family, hintId: ids[next[family]], rung: next[family] });
    next[family] += 1;
    return true;
  };
  const ranked = [...new Set(input.directMatchFamilies)]
    .sort((left, right) => input.directClears[right] - input.directClears[left]
      || input.directMatchFamilies.indexOf(left) - input.directMatchFamilies.indexOf(right));
  for (const family of ranked) {
    if (climb(family)) break;
  }
  if (input.signalClearedFamily) {
    for (let count = 0; count < (input.signalHintCount ?? 1); count += 1) {
      if (!climb(input.signalClearedFamily)) break;
    }
  }
  // Reinforce is only reported when the whole move revealed nothing new.
  return { issues, reinforcedFamilies: issues.length > 0 ? [] : [...reinforced] };
}

/** Live candidates lacking the rung tag in the family's trait category. */
export function computeLadderEliminatedIds(
  profiles: ReadonlyArray<Pick<CompilerSpeciesProfile, 'speciesId'> & Partial<CompilerSpeciesProfile>>,
  alreadyEliminatedIds: Iterable<number>,
  traitCategory: CaseTraitCategory,
  weakTag: string,
): number[] {
  const key = PROFILE_KEY_BY_CATEGORY[traitCategory];
  const out = new Set(alreadyEliminatedIds);
  return profiles
    .filter(profile => !out.has(profile.speciesId) && !((profile[key] ?? []) as readonly string[]).includes(weakTag))
    .map(profile => profile.speciesId)
    .sort((a, b) => a - b);
}

export function ladderEliminationReason(family: EvidenceFamily, rung: number): string {
  return `${EVIDENCE_FAMILY_LABELS[family]} fact ${rung + 1} rules it out`;
}

// ---------------------------------------------------------------------------
// Durable ledger (session metadata, server-private ids) and public projection
// ---------------------------------------------------------------------------

export interface FactLedgerEntry {
  nodeIndex: number;
  moveNumber: number;
  family: EvidenceFamily;
  hintId: number;
  rung: number;
  actualEliminatedIds: number[];
  issuedAt: string;
}

export interface PublicLedgerFact {
  nodeIndex: number;
  moveNumber: number;
  family: EvidenceFamily;
  traitCategory: CaseTraitCategory;
  rung: number;
  rungTotal: number;
  factText: string;
  explanationNote?: string;
  eliminatedIds: number[];
  eliminationReasons: Record<string, string>;
}

export function parseFactLedger(value: unknown): FactLedgerEntry[] {
  if (!Array.isArray(value) || value.length > MAX_LEDGER_ENTRIES) return [];
  const seen = new Set<string>();
  const entries = value.flatMap(item => {
    const source = getRecord(item);
    const ids = Array.isArray(source.actualEliminatedIds) ? source.actualEliminatedIds : null;
    const eliminated = ids?.filter((id): id is number => Number.isSafeInteger(id) && (id as number) > 0) ?? null;
    if (!Number.isInteger(source.nodeIndex) || (source.nodeIndex as number) < 0 || (source.nodeIndex as number) > 2
      || !Number.isInteger(source.moveNumber) || (source.moveNumber as number) < 1 || (source.moveNumber as number) > 6
      || !isEvidenceFamily(source.family)
      || !Number.isSafeInteger(source.hintId) || (source.hintId as number) <= 0
      || !Number.isInteger(source.rung) || (source.rung as number) < 0 || (source.rung as number) > 9
      || !eliminated || eliminated.length !== ids!.length || eliminated.length > 6
      || typeof source.issuedAt !== 'string') return [];
    const key = `${source.family}:${source.rung}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      nodeIndex: source.nodeIndex as number,
      moveNumber: source.moveNumber as number,
      family: source.family,
      hintId: source.hintId as number,
      rung: source.rung as number,
      actualEliminatedIds: [...eliminated].sort((a, b) => a - b),
      issuedAt: source.issuedAt,
    }];
  });
  return entries.sort((a, b) => a.nodeIndex - b.nodeIndex || a.moveNumber - b.moveNumber || a.rung - b.rung);
}

export function ledgerEliminatedIds(ledger: readonly FactLedgerEntry[]): number[] {
  return [...new Set(ledger.flatMap(entry => entry.actualEliminatedIds))].sort((a, b) => a - b);
}

export function hydrateLedgerFact(
  entry: FactLedgerEntry,
  hint: { hintText: string },
  card: { traitCategory: CaseTraitCategory },
  rungTotal: number,
): PublicLedgerFact {
  return {
    nodeIndex: entry.nodeIndex,
    moveNumber: entry.moveNumber,
    family: entry.family,
    traitCategory: card.traitCategory,
    rung: entry.rung,
    rungTotal,
    factText: hint.hintText,
    eliminatedIds: [...entry.actualEliminatedIds],
    eliminationReasons: Object.fromEntries(entry.actualEliminatedIds.map(id => [String(id), ladderEliminationReason(entry.family, entry.rung)])),
  };
}

// ---------------------------------------------------------------------------
// Authoring rules shared by compiler, corpus verifier and seed validation
// ---------------------------------------------------------------------------

export interface LadderCard { family: EvidenceFamily; traitCategory: CaseTraitCategory; compareTag: string }
export interface LadderRung { family: EvidenceFamily; sequenceIndex: number; weakTag: string }

/**
 * Safety (always): every rung tag is canonical for the card's category, present
 * in the answer profile (answer never eliminated), leaves 2–5 survivors on its
 * own, and the cumulative survivor set never grows.
 * Quality (strict): each rung removes at least one more candidate than the rung
 * before it, so the ladder actually narrows.
 */
export function validateFamilyLadder(
  answerId: number,
  card: LadderCard,
  rungs: readonly LadderRung[],
  profiles: readonly CompilerSpeciesProfile[],
  options: { strict: boolean },
): string[] {
  const errors: string[] = [];
  const ordered = [...rungs].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  if (ordered.length < 3 || ordered.length > 5) errors.push(`${card.family}: ladder needs 3-5 rungs`);
  if (!CASE_TRAIT_CATEGORIES.includes(card.traitCategory)) return [`${card.family}: invalid trait category`];
  const key = PROFILE_KEY_BY_CATEGORY[card.traitCategory];
  const answer = profiles.find(profile => profile.speciesId === answerId);
  if (!answer) return [`${card.family}: answer profile missing`];
  let cumulative = new Set(profiles.map(profile => profile.speciesId));
  ordered.forEach((rung, index) => {
    const label = `${card.family}/rung-${index}`;
    if (rung.family !== card.family) errors.push(`${label}: family mismatch`);
    if (rung.sequenceIndex !== index) errors.push(`${label}: sequence gap`);
    if (!isCanonicalDeductionTag(rung.weakTag, card.traitCategory)) errors.push(`${label}: tag ${rung.weakTag} is not canonical for ${card.traitCategory}`);
    if (!(answer[key] as readonly string[]).includes(rung.weakTag)) errors.push(`${label}: answer profile lacks ${rung.weakTag}`);
    const own = profiles.filter(profile => (profile[key] as readonly string[]).includes(rung.weakTag)).map(profile => profile.speciesId);
    if (own.length < LADDER_MIN_SURVIVORS || own.length > LADDER_MAX_SURVIVORS) errors.push(`${label}: ${rung.weakTag} leaves ${own.length} survivors (need 2-5)`);
    const next = new Set(own.filter(id => cumulative.has(id)));
    if (next.size < LADDER_MIN_SURVIVORS) errors.push(`${label}: ladder narrows below two candidates`);
    if (options.strict && index > 0 && next.size >= cumulative.size) errors.push(`${label}: rung adds no new elimination`);
    cumulative = next;
  });
  return errors;
}

export function ladderCategoryLabel(category: CaseTraitCategory): string {
  return {
    habitat: 'Habitat', morphology: 'Body form', diet: 'Diet', behavior: 'Behavior', reproduction: 'Life cycle',
    taxonomy: 'Lineage', geography: 'Range', conservation: 'Threats', key_fact: 'Key fact',
  }[category];
}
