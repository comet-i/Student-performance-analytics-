import { respond } from '../utils/catchAsync.js';
import { crud } from '../utils/crud.js';
import * as engine from '../services/analytics.service.js';

// Stored results (written by the backend after each engine call, read here under RLS)
export const predictions = crud('predictions', { filters: ['enrollment_id'] });
export const recommendations = crud('recommendations', { filters: ['is_read', 'category'] });

// Live calls to the ML engine
export const predict = respond(({ db, user, body }) => engine.predict(db, user.id, body.enrollment_id));
export const simulate = respond(({ db, body }) => engine.simulate(db, body));
export const refreshRecommendations = respond(({ db, user }) => engine.refreshRecommendations(db, user.id));
export const insights = respond(({ db }) => engine.insights(db));
