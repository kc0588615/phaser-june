import { snapshotEvidenceHints, type EvidenceHintSnapshot } from '@/lib/evidenceHintSnapshot';
import { getRecord, parsePrivateCase } from '@/lib/runCaseState';

/** Called under the session row lock, before the seed transaction changes any content. */
export function preserveRunEvidenceHints(metadata: unknown, rows: readonly EvidenceHintSnapshot[]): Record<string, unknown> {
  const record = getRecord(metadata);
  const saved = parsePrivateCase(record.casePrivate);
  if (!saved) throw new Error('Cannot preserve invalid private case before evidence reload');
  if (saved.familyHints) return record;
  return {
    ...record,
    casePrivate: {
      ...getRecord(record.casePrivate),
      familyHints: snapshotEvidenceHints(saved.familyHintIds, rows),
    },
  };
}
