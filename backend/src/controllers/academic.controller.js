import { respond } from '../utils/catchAsync.js';
import { crud } from '../utils/crud.js';
import * as academic from '../services/academic.service.js';

export const enrollments = crud('enrollments', { filters: ['term_label'] });
export const assessments = crud('assessments', { filters: ['enrollment_id'] });
export const syllabus = crud('syllabus_topics', { filters: ['enrollment_id'], order: ['position', true] });
export const boardMarks = crud('board_subject_marks', { filters: ['level'], order: ['subject_name', true] });

export const performance = respond(({ db }) => academic.getPerformance(db));
export const bunkCalculator = respond(({ db }) => academic.getBunkCalculator(db));
export const listAttendance = respond(({ db, query }) => academic.listAttendance(db, query));
export const markAttendance = respond(({ db, user, body }) => academic.markAttendance(db, user.id, body));
