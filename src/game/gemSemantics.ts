import type { GemType } from './constants';
import { GemCategory } from './clueConfig';

export interface GemSemanticDef {
    gemType: GemType;
    clueCategory: GemCategory | null;
}

export const GEM_SEMANTICS: Record<GemType, GemSemanticDef> = {
    black: { gemType: 'black', clueCategory: GemCategory.LIFE_CYCLE },
    blue: { gemType: 'blue', clueCategory: GemCategory.GEOGRAPHIC },
    green: { gemType: 'green', clueCategory: GemCategory.HABITAT },
    orange: { gemType: 'orange', clueCategory: GemCategory.MORPHOLOGY },
    red: { gemType: 'red', clueCategory: GemCategory.CLASSIFICATION },
    white: { gemType: 'white', clueCategory: GemCategory.CONSERVATION },
    yellow: { gemType: 'yellow', clueCategory: GemCategory.BEHAVIOR },
    purple: { gemType: 'purple', clueCategory: GemCategory.KEY_FACTS },
};

export function getClueCategoryForGemType(gemType: GemType): GemCategory | null {
    return GEM_SEMANTICS[gemType]?.clueCategory ?? null;
}
