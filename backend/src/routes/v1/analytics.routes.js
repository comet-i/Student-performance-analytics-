import { Router } from 'express';
import * as c from '../../controllers/analytics.controller.js';
import { predictionLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as s from '../../validators/schemas.js';

export default Router()
  // stored results
  .get('/predictions', c.predictions.list)
  .get('/recommendations', c.recommendations.list)
  .patch('/recommendations/:id', validate({ params: s.idParam, body: s.recommendationPatch }), c.recommendations.update)
  // live ML engine calls (rate limited per user)
  .get('/insights', predictionLimiter, c.insights)
  .post('/predict', predictionLimiter, validate({ body: s.predictBody }), c.predict)
  .post('/simulate', predictionLimiter, validate({ body: s.simulateBody }), c.simulate)
  .post('/recommendations/refresh', predictionLimiter, c.refreshRecommendations);
