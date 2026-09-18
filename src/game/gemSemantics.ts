import type { GemType, GemFamily } from './constants';
import {
    GEM_REGISTRY,
} from '../expedition/domain';

export interface GemSemanticDef {
    gemType: GemType;
    family: GemFamily;
}

export const GEM_SEMANTICS: Record<GemType, GemSemanticDef> = Object.fromEntries(
    Object.values(GEM_REGISTRY).map((definition) => [
        definition.gemType,
        {
            gemType: definition.gemType,
            family: definition.family,
        },
    ])
) as Record<GemType, GemSemanticDef>;


export function isKnowledgeGem(gemType: GemType): boolean {
    return GEM_REGISTRY[gemType] !== undefined;
}

export function isResourceGem(_gemType: GemType): boolean {
    return false;
}
