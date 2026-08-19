import { CASE_TRAIT_CATEGORIES } from '@/lib/caseTraits';
import {
  validateDeductionTagProfile,
  type DeductionProfileCategory,
  type DeductionTagProfile,
} from '@/lib/deductionTags';

export const EVIDENCE_PROTOTYPE_IUCN_IDS = [
  512,
  5_748,
  7_140,
  12_763,
  15_955,
  18_732,
] as const;

export interface EvidenceProfileDossier {
  iucnId: number;
  scientificName: string;
  commonName: string;
  sources: readonly string[];
  profile: DeductionTagProfile;
}

function assertValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireTrimmedString(value: unknown, context: string): string {
  assertValue(
    typeof value === 'string' && value.length > 0 && value.trim() === value,
    `${context} must be a nonempty trimmed string`,
  );
  return value;
}

function requireStringArray(value: unknown, context: string): string[] {
  assertValue(Array.isArray(value), `${context} must be an array`);
  const result = value.map((item, index) => requireTrimmedString(item, `${context}[${index}]`));
  assertValue(new Set(result).size === result.length, `${context} must not contain duplicates`);
  return result;
}

export function parseEvidenceProfileDossier(
  raw: unknown,
  fileName = 'deduction dossier',
): EvidenceProfileDossier {
  assertValue(isPlainObject(raw), `${fileName} must be an object`);
  assertValue(Number.isSafeInteger(raw.iucn_id) && Number(raw.iucn_id) > 0, `${fileName}.iucn_id must be a positive safe integer`);
  assertValue(isPlainObject(raw.species), `${fileName}.species must be an object`);
  assertValue(isPlainObject(raw.profile), `${fileName}.profile must be an object`);

  const profile = {} as Record<DeductionProfileCategory, readonly string[]>;
  for (const category of CASE_TRAIT_CATEGORIES) {
    const jsonKey = `${category}_tags`;
    profile[category] = requireStringArray(raw.profile[jsonKey], `${fileName}.profile.${jsonKey}`);
  }
  const signatureTag = raw.profile.signature_tag;
  assertValue(
    signatureTag === null || typeof signatureTag === 'string',
    `${fileName}.profile.signature_tag must be a string or null`,
  );
  const tagProfile: DeductionTagProfile = { ...profile, signatureTag };
  const profileErrors = validateDeductionTagProfile(tagProfile);
  assertValue(profileErrors.length === 0, `${fileName}.profile invalid: ${profileErrors.join('; ')}`);

  return {
    iucnId: Number(raw.iucn_id),
    scientificName: requireTrimmedString(raw.scientific_name, `${fileName}.scientific_name`),
    commonName: requireTrimmedString(raw.common_name, `${fileName}.common_name`),
    sources: requireStringArray(raw.species.sources, `${fileName}.species.sources`),
    profile: tagProfile,
  };
}
