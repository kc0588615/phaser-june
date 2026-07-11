import type { GemType, GemFamily } from './constants';
import { GemCategory } from './clueConfig';
import {
    GEM_REGISTRY,
    getClueCategoryForGemType as getDomainClueCategoryForGemType,
} from '../expedition/domain';

export interface GemSemanticDef {
    gemType: GemType;
    family: GemFamily;
    clueCategory: GemCategory | null;
}

export const GEM_SEMANTICS: Record<GemType, GemSemanticDef> = Object.fromEntries(
    Object.values(GEM_REGISTRY).map((definition) => [
        definition.gemType,
        {
            gemType: definition.gemType,
            family: definition.family,
            clueCategory: definition.clueCategory,
        },
    ])
) as Record<GemType, GemSemanticDef>;

export function getClueCategoryForGemType(gemType: GemType): GemCategory | null {
    return getDomainClueCategoryForGemType(gemType);
}

export function isKnowledgeGem(gemType: GemType): boolean {
    return GEM_REGISTRY[gemType] !== undefined;
}

export function isResourceGem(_gemType: GemType): boolean {
    return false;
}
