import { crud } from '../utils/crud.js';

export const tasks = crud('study_tasks', { filters: ['status', 'enrollment_id'] });
export const sessions = crud('study_sessions', { filters: ['enrollment_id', 'task_id'], order: ['started_at', false] });
