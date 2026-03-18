import type { GemType, GemFamily, ResourceGemType } from './constants';
import { getGemFamily } from './constants';
import { GemCategory } from './clueConfig';

export interface GemSemanticDef {
    gemType: GemType;
    family: GemFamily;
    clueCategory: GemCategory | null;
    resourceKey: ResourceGemType | null;
}

export const GEM_SEMANTICS: Record<GemType, GemSemanticDef> = {
    // Knowledge gems (8) — map to clue categories
    black:   { gemType: 'black',   family: 'knowledge', clueCategory: GemCategory.LIFE_CYCLE,      resourceKey: null },
    blue:    { gemType: 'blue',    family: 'knowledge', clueCategory: GemCategory.GEOGRAPHIC,       resourceKey: null },
    green:   { gemType: 'green',   family: 'knowledge', clueCategory: GemCategory.HABITAT,          resourceKey: null },
    orange:  { gemType: 'orange',  family: 'knowledge', clueCategory: GemCategory.MORPHOLOGY,       resourceKey: null },
    red:     { gemType: 'red',     family: 'knowledge', clueCategory: GemCategory.CLASSIFICATION,   resourceKey: null },
    white:   { gemType: 'white',   family: 'knowledge', clueCategory: GemCategory.CONSERVATION,     resourceKey: null },
    yellow:  { gemType: 'yellow',  family: 'knowledge', clueCategory: GemCategory.BEHAVIOR,         resourceKey: null },
    purple:  { gemType: 'purple',  family: 'knowledge', clueCategory: GemCategory.KEY_FACTS,        resourceKey: null },
    // Resource gems (4) — map to run economy currencies
    nature:    { gemType: 'nature',    family: 'resource', clueCategory: null, resourceKey: 'nature' },
    water:     { gemType: 'water',     family: 'resource', clueCategory: null, resourceKey: 'water' },
    knowledge: { gemType: 'knowledge', family: 'resource', clueCategory: null, resourceKey: 'knowledge' },
    craft:     { gemType: 'craft',     family: 'resource', clueCategory: null, resourceKey: 'craft' },
};

export function getClueCategoryForGemType(gemType: GemType): GemCategory | null {
    return GEM_SEMANTICS[gemType]?.clueCategory ?? null;
}

export function getResourceKeyForGemType(gemType: GemType): ResourceGemType | null {
    return GEM_SEMANTICS[gemType]?.resourceKey ?? null;
}

export function isKnowledgeGem(gemType: GemType): boolean {
    return getGemFamily(gemType) === 'knowledge';
}

export function isResourceGem(gemType: GemType): boolean {
    return getGemFamily(gemType) === 'resource';
}
