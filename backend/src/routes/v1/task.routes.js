import { Router } from 'express';
import { sessions, tasks } from '../../controllers/task.controller.js';
import { crudRouter } from '../../utils/crud.js';
import * as s from '../../validators/schemas.js';

export default Router()
  .use('/tasks', crudRouter(tasks, { create: s.taskCreate, patch: s.taskPatch }))
  .use('/study-sessions', crudRouter(sessions, { create: s.studySessionCreate, patch: s.studySessionPatch }));
