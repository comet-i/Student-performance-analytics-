import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import academic from './v1/academic.routes.js';
import analytics from './v1/analytics.routes.js';
import profile from './v1/profile.routes.js';
import tasks from './v1/task.routes.js';

const v1 = Router()
  .use(requireAuth) // everything under /api/v1 requires a valid Supabase session
  .use(profile, academic, tasks)
  .use('/analytics', analytics);

export default Router().use('/api/v1', v1);
