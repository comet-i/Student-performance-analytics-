import { env } from '../config/env.js';
import { admin } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { enginePredictions, engineRecommendations } from '../validators/schemas.js';

/*
 * Contract with the Python engine. Every call is POST with header X-API-Key.
 * The backend reads the student's data under RLS and sends it, so the engine needs no database access:
 *
 *   body = { student: { board_10th_pct, ... },
 *            subjects: [{ enrollment_id, subject_code, ..., assessments[], attendance_logs[], study_tasks[], study_sessions[] }] }
 *
 *   /predict          -> { model_version, predictions: [{ enrollment_id|null, predicted_score, confidence?, risk_level?,
 *                          recommended_weekly_hours?, features? }] }
 *   /recommendations  -> { recommendations: [{ enrollment_id?, category, message, priority }] }
 *   /simulate         body + { enrollment_id, scenario } -> any JSON (passed through)
 *   /insights         -> any JSON, chart-ready (passed through)
 *
 * Predictions and recommendations are validated here, then stored with the service-role client.
 */

const STUDENT_SELECT = 'board_10th_pct, board_12th_pct, previous_sem_gpa, weekly_study_hours, current_semester';
const SUBJECT_SELECT = [
  'id, subject_code, subject_name, term_label, credits, target_score, attendance_pct, predicted_score, final_score',
  'assessments(assessment_type, score, weightage, recorded_at)',
  'attendance_logs(class_date, status)',
  'study_tasks(status, due_date, completed_at)',
  'study_sessions(started_at, duration_minutes, focus_rating)',
].join(', ');

// One subject, or every subject still in progress (no final_score yet). Read as the user, so RLS scopes it.
const loadPayload = async (db, enrollmentId) => {
  const subjects = db.from('enrollments').select(SUBJECT_SELECT);
  const [student, enrollments] = await Promise.all([
    db.from('student_profiles').select(STUDENT_SELECT).single().throwOnError(),
    (enrollmentId ? subjects.eq('id', enrollmentId) : subjects.is('final_score', null)).throwOnError(),
  ]);
  if (!enrollments.data.length) throw new ApiError(404, enrollmentId ? 'Enrollment not found' : 'No active subjects to analyse');
  return { student: student.data, subjects: enrollments.data.map(({ id, ...s }) => ({ enrollment_id: id, ...s })) };
};

const call = async (path, body) => {
  let res;
  try {
    res = await fetch(`${env.ML_ENGINE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': env.ML_ENGINE_API_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(env.ML_ENGINE_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(503, 'Analytics engine is unavailable, please retry shortly');
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const clientError = res.status < 500;
    throw new ApiError(clientError ? 400 : 502, 'Analytics engine could not process the request', clientError ? payload : undefined);
  }
  return payload;
};

const validated = (schema, data) => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.error('Invalid engine response:', parsed.error.issues);
    throw new ApiError(502, 'Analytics engine returned an unexpected response');
  }
  return parsed.data;
};

// Engine output may only reference this user's subjects (null = overall).
const ownedBy = (payload) => {
  const ids = new Set(payload.subjects.map((s) => s.enrollment_id));
  return (row) => !row.enrollment_id || ids.has(row.enrollment_id);
};

export const predict = async (db, userId, enrollmentId) => {
  const payload = await loadPayload(db, enrollmentId);
  const { model_version, predictions } = validated(enginePredictions, await call('/predict', payload));
  const rows = predictions.filter(ownedBy(payload));
  if (!rows.length) throw new ApiError(502, 'Analytics engine returned no predictions');

  const stored = await admin
    .from('predictions')
    .insert(
      rows.map((p) => ({
        user_id: userId,
        enrollment_id: p.enrollment_id ?? null,
        predicted_score: p.predicted_score,
        confidence: p.confidence ?? null,
        risk_level: p.risk_level ?? null,
        model_version,
        features: p.features ?? null,
      })),
    )
    .select()
    .throwOnError();

  // Latest values shown on the subject cards
  await Promise.all(
    rows
      .filter((p) => p.enrollment_id)
      .map((p) =>
        admin
          .from('enrollments')
          .update({ predicted_score: p.predicted_score, recommended_weekly_hours: p.recommended_weekly_hours ?? 0 })
          .eq('id', p.enrollment_id)
          .eq('user_id', userId)
          .throwOnError(),
      ),
  );
  return stored.data;
};

// Replaces the user's unread tips with a fresh set; read tips are kept as history.
export const refreshRecommendations = async (db, userId) => {
  const payload = await loadPayload(db);
  const { recommendations } = validated(engineRecommendations, await call('/recommendations', payload));
  const rows = recommendations.filter(ownedBy(payload)).map((r) => ({ ...r, enrollment_id: r.enrollment_id ?? null, user_id: userId }));

  await admin.from('recommendations').delete().eq('user_id', userId).eq('is_read', false).throwOnError();
  if (!rows.length) return [];
  return (await admin.from('recommendations').insert(rows).select().throwOnError()).data;
};

export const simulate = async (db, { enrollment_id, scenario }) =>
  call('/simulate', { ...(await loadPayload(db, enrollment_id)), enrollment_id, scenario });

export const insights = async (db) => call('/insights', await loadPayload(db));
