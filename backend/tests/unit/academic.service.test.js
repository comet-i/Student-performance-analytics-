import { describe, expect, it } from 'vitest';
import { bunkStats, subjectAverage } from '../../src/services/academic.service.js';

describe('bunkStats', () => {
  it('counts classes that can still be skipped', () => {
    const r = bunkStats({ present_count: 20, absent_count: 4, min_attendance: 75 });
    expect(r).toMatchObject({ total: 24, attendance_pct: 83.33, can_miss: 2, must_attend: 0 });
  });

  it('counts consecutive classes needed to recover', () => {
    const r = bunkStats({ present_count: 15, absent_count: 9, min_attendance: 75 });
    expect(r).toMatchObject({ can_miss: 0, must_attend: 12 }); // 27/36 = 75%
  });

  it('handles no classes yet and an unreachable 100% minimum', () => {
    expect(bunkStats({ present_count: 0, absent_count: 0, min_attendance: 75 }).must_attend).toBe(0);
    expect(bunkStats({ present_count: 9, absent_count: 1, min_attendance: 100 }).must_attend).toBeNull();
  });
});

describe('subjectAverage', () => {
  it('weights by weightage when present', () => {
    expect(subjectAverage([{ score: 80, weightage: 30 }, { score: 60, weightage: 10 }])).toBe(75);
  });
  it('falls back to a plain mean', () => {
    expect(subjectAverage([{ score: 80, weightage: null }, { score: 60, weightage: null }])).toBe(70);
  });
  it('returns null with no assessments', () => {
    expect(subjectAverage([])).toBeNull();
  });
});
