-- =============================================================================
-- 20260104000000_rls_policies.sql
-- Row Level Security + column privileges.
-- The Python service and admin jobs use service_role, which bypasses RLS.
-- (select auth.uid()) is wrapped so Postgres evaluates it once per query.
-- =============================================================================

-- ---------- Profile ----------
alter table public.student_profiles enable row level security;
create policy "read own profile"   on public.student_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "update own profile" on public.student_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------- Student-owned tables: full access to own rows ----------
-- Parent ownership is enforced by the composite FKs in the core migration.
do $$
declare t text;
begin
  foreach t in array array['enrollments','assessments','attendance_logs',
                           'study_tasks','board_subject_marks','study_sessions','syllabus_topics'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- Students must not write system-computed fields on enrollments
-- (attendance_pct is maintained by a SECURITY DEFINER trigger).
revoke insert, update on public.enrollments from authenticated;
grant insert (user_id, subject_code, subject_name, term_label, credits, min_attendance, target_score, final_score, color)
  on public.enrollments to authenticated;
grant update (subject_code, subject_name, term_label, credits, min_attendance, target_score, final_score, color)
  on public.enrollments to authenticated;

-- ---------- Achievements: badges are awarded by the server only ----------
alter table public.achievement_definitions enable row level security;
create policy "read badge catalog" on public.achievement_definitions for select to authenticated using (true);

alter table public.user_achievements enable row level security;
create policy "read own achievements" on public.user_achievements for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "manage own custom achievements" on public.user_achievements for all to authenticated
  using ((select auth.uid()) = user_id and definition_id is null)
  with check ((select auth.uid()) = user_id and definition_id is null);

-- ---------- Analytics output: read-only for students ----------
alter table public.predictions enable row level security;
create policy "read own predictions" on public.predictions for select to authenticated
  using ((select auth.uid()) = user_id);

alter table public.recommendations enable row level security;
create policy "read own recommendations" on public.recommendations for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "update own recommendations" on public.recommendations for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke update on public.recommendations from authenticated;
grant update (is_read) on public.recommendations to authenticated;

-- ---------- Reference data ----------
alter table public.education_boards enable row level security;
create policy "read boards" on public.education_boards for select to authenticated using (true);
