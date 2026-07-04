import type { GemType, GemFamily, CurrencyKey } from './constants';
import {
    getGemFamily,
} from './constants';
import { GemCategory } from './clueConfig';
import {
    GEM_REGISTRY,
    getClueCategoryForGemType as getDomainClueCategoryForGemType,
    getCurrencyKeyForGemType as getDomainCurrencyKeyForGemType,
    isActionGem as isDomainActionGem,
    isLootGem as isDomainLootGem,
} from '../expedition/domain';

export interface GemSemanticDef {
    gemType: GemType;
    family: GemFamily;
    clueCategory: GemCategory | null;
    resourceKey: CurrencyKey | null;
}

export const GEM_SEMANTICS: Record<GemType, GemSemanticDef> = Object.fromEntries(
    Object.values(GEM_REGISTRY).map((definition) => [
        definition.gemType,
        {
            gemType: definition.gemType,
            family: definition.family,
            clueCategory: definition.clueCategory,
            resourceKey: definition.currencyKey,
        },
    ])
) as Record<GemType, GemSemanticDef>;

export function getClueCategoryForGemType(gemType: GemType): GemCategory | null {
    return getDomainClueCategoryForGemType(gemType);
}

export function getResourceKeyForGemType(gemType: GemType): CurrencyKey | null {
    return getDomainCurrencyKeyForGemType(gemType);
}

export function isKnowledgeGem(gemType: GemType): boolean {
    return isDomainLootGem(gemType);
}

export function isResourceGem(gemType: GemType): boolean {
    return isDomainActionGem(gemType);
}
