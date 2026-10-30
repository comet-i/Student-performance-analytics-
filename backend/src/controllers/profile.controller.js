import { respond } from '../utils/catchAsync.js';
import { crud } from '../utils/crud.js';

export const boards = crud('education_boards', { order: ['name', true] });
export const catalog = crud('achievement_definitions', { order: ['points', true] });
export const achievements = crud('user_achievements', {
  select: '*, achievement_definitions(code, title, description, icon, points)',
  order: ['earned_at', false],
});

export const getProfile = respond(async ({ db, user }) =>
  (await db.from('student_profiles').select().eq('user_id', user.id).single().throwOnError()).data,
);

export const updateProfile = respond(async ({ db, user, body }) =>
  (await db.from('student_profiles').update(body).eq('user_id', user.id).select().single().throwOnError()).data,
);

// Idempotent: upserts first and onboarding_done flips last, so a failed attempt can simply be retried.
export const onboard = respond(async ({ db, user, body: { profile, board_marks, subjects } }) => {
  const owned = (rows) => rows.map((r) => ({ ...r, user_id: user.id }));

  if (board_marks.length) {
    await db.from('board_subject_marks').upsert(owned(board_marks), { onConflict: 'user_id,level,subject_name' }).throwOnError();
  }
  // Existing enrollments are left untouched (students can't overwrite system columns anyway).
  await db
    .from('enrollments')
    .upsert(owned(subjects), { onConflict: 'user_id,subject_code,term_label', ignoreDuplicates: true, defaultToNull: false })
    .throwOnError();

  return (await db.from('student_profiles').update({ ...profile, onboarding_done: true }).eq('user_id', user.id).select().single().throwOnError()).data;
});
