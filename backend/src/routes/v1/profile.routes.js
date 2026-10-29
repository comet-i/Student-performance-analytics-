import { Router } from 'express';
import * as c from '../../controllers/profile.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { crudRouter } from '../../utils/crud.js';
import * as s from '../../validators/schemas.js';

export default Router()
  .get('/profile', c.getProfile)
  .patch('/profile', validate({ body: s.profilePatch }), c.updateProfile)
  .post('/onboarding', validate({ body: s.onboarding }), c.onboard)
  .get('/boards', c.boards.list)
  .get('/achievements/catalog', c.catalog.list)
  .use('/achievements', crudRouter(c.achievements, { create: s.achievementCreate, patch: s.achievementPatch }));
