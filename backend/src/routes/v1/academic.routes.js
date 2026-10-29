import { Router } from 'express';
import * as c from '../../controllers/academic.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { crudRouter } from '../../utils/crud.js';
import * as s from '../../validators/schemas.js';

export default Router()
  .use('/enrollments', crudRouter(c.enrollments, { create: s.enrollmentCreate, patch: s.enrollmentPatch }))
  .use('/assessments', crudRouter(c.assessments, { create: s.assessmentCreate, patch: s.assessmentPatch }))
  .use('/syllabus', crudRouter(c.syllabus, { create: s.syllabusCreate, patch: s.syllabusPatch }))
  .use('/board-marks', crudRouter(c.boardMarks, { create: s.boardMark, patch: s.boardMarkPatch }))
  .get('/performance', c.performance)
  .get('/attendance', c.listAttendance)
  .put('/attendance', validate({ body: s.attendanceUpsert }), c.markAttendance)
  .get('/attendance/bunk-calculator', c.bunkCalculator);
