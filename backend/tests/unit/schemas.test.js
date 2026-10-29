import { describe, expect, it } from 'vitest';
import { boardMarkPatch, enginePredictions, engineRecommendations } from '../../src/validators/schemas.js';

const id = '3f2b8e2e-7c6a-4b53-9d7a-1c2f3a4b5c6d';

describe('engine response schemas', () => {
  it('accepts a well-formed prediction, including an overall one without enrollment_id', () => {
    const ok = { model_version: 'v1', predictions: [{ enrollment_id: id, predicted_score: 72.5, risk_level: 'medium' }, { predicted_score: 70 }] };
    expect(enginePredictions.safeParse(ok).success).toBe(true);
  });

  it('rejects values the database would refuse', () => {
    const score = { model_version: 'v1', predictions: [{ enrollment_id: id, predicted_score: 120 }] };
    const risk = { model_version: 'v1', predictions: [{ enrollment_id: id, predicted_score: 50, risk_level: 'extreme' }] };
    expect(enginePredictions.safeParse(score).success).toBe(false);
    expect(enginePredictions.safeParse(risk).success).toBe(false);
  });

  it('fills recommendation defaults and rejects unknown categories', () => {
    const [rec] = engineRecommendations.parse({ recommendations: [{ message: 'Study more' }] }).recommendations;
    expect(rec).toMatchObject({ category: 'general', priority: 'medium' });
    expect(engineRecommendations.safeParse({ recommendations: [{ message: 'x', category: 'nope' }] }).success).toBe(false);
  });
});

describe('patch schemas', () => {
  it('does not reset defaulted fields that were not sent', () => {
    expect(boardMarkPatch.parse({ marks_obtained: 5 })).toEqual({ marks_obtained: 5 });
  });
  it('rejects an empty patch', () => {
    expect(boardMarkPatch.safeParse({}).success).toBe(false);
  });
});
