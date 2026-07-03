import { describe, expect, it } from 'vitest';

import { getCaptureGrade } from '@/types/expedition';

describe('getCaptureGrade', () => {
  it('grades clue and wrong-guess boundaries', () => {
    expect(getCaptureGrade(2, 0)).toEqual({ tier: 3, label: 'Featured Find' });
    expect(getCaptureGrade(3, 0)).toEqual({ tier: 2, label: 'Documented' });
    expect(getCaptureGrade(5, 1)).toEqual({ tier: 2, label: 'Documented' });
    expect(getCaptureGrade(6, 0)).toEqual({ tier: 1, label: 'Logged' });
    expect(getCaptureGrade(2, 1)).toEqual({ tier: 2, label: 'Documented' });
  });
});
