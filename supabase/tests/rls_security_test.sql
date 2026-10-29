-- =============================================================================
-- pgTAP: RLS, ownership integrity, column privileges, triggers, ML view.
-- Run with:  supabase test db        (from database/)
-- Everything runs in a transaction and is rolled back.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- ---------- Fixtures (as postgres) ----------
insert into auth.users (id, instance_id, aud, role, email, confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev','','','',''),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev','','','','');

insert into public.enrollments (id, user_id, subject_code, subject_name) values
  ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','T101','Subject A'),
  ('b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','T101','Subject B');

insert into public.achievement_definitions (id, code, title)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','TEST_BADGE','Test badge');

-- ---------- Structure ----------
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0, 'RLS is enabled on every public table');

select is(
  (select count(*)::int from public.student_profiles
    where user_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')),
  2, 'signup trigger creates a profile for each new auth user');

-- ---------- Act as student A ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select is((select count(*)::int from public.enrollments), 1,
  'A sees only their own enrollment');

select is((select count(*)::int from public.enrollments where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 0,
  'A cannot read B''s enrollments');

select throws_ok(
  $$insert into public.enrollments (user_id, subject_code, subject_name)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','X','Injected')$$,
  '42501', null, 'A cannot create an enrollment for B');

select throws_ok(
  $$insert into public.assessments (enrollment_id, user_id, assessment_title, raw_marks)
    values ('b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Hack',5)$$,
  '23503', null, 'A cannot attach an assessment to B''s enrollment (composite FK)');

select throws_ok(
  $$insert into public.predictions (user_id, predicted_score, model_version)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 99, 'fake')$$,
  '42501', null, 'students cannot write predictions');

select throws_ok(
  $$update public.enrollments set predicted_score = 99
    where id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'$$,
  '42501', null, 'students cannot edit predicted_score');

select throws_ok(
  $$insert into public.user_achievements (user_id, definition_id)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd')$$,
  '42501', null, 'students cannot self-award catalog badges');

-- ---------- Attendance trigger (2 present, 1 absent -> 66.67%) ----------
select lives_ok(
  $$insert into public.attendance_logs (enrollment_id, user_id, class_date, status) values
      ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_date - 1, 'present'),
      ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_date - 2, 'present'),
      ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_date - 3, 'absent')$$,
  'A can log attendance on their own enrollment');

select is(
  (select attendance_pct from public.enrollments where id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'),
  66.67::numeric, 'attendance_pct recalculated by trigger');

-- ---------- Anonymous ----------
set local role anon;
set local request.jwt.claims = '';
select is((select count(*)::int from public.enrollments), 0, 'anon sees no enrollments');

select * from finish();
rollback;
