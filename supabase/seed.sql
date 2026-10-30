-- =============================================================================
-- seed.sql  (runs automatically on `supabase db reset`)
-- 1) education boards  2) badge catalog  3) demo student with a semester of data
-- Safe to re-run. DEMO DATA IS FOR LOCAL/STAGING ONLY - never push to production.
-- Demo login: demo@student.test / Demo@12345
-- =============================================================================

-- ---------- 1. Education boards ----------
insert into public.education_boards (name, full_name, region) values
  ('CBSE',            'Central Board of Secondary Education',               'India'),
  ('CISCE',           'Council for the Indian School Certificate Examinations (ICSE/ISC)', 'India'),
  ('NIOS',            'National Institute of Open Schooling',               'India'),
  ('State - Delhi',   'Delhi (CBSE-affiliated / Directorate of Education)', 'Delhi'),
  ('State - UP',      'Uttar Pradesh Madhyamik Shiksha Parishad',           'Uttar Pradesh'),
  ('State - Haryana', 'Board of School Education Haryana',                  'Haryana'),
  ('State - Punjab',  'Punjab School Education Board',                      'Punjab'),
  ('State - Rajasthan','Board of Secondary Education Rajasthan',            'Rajasthan'),
  ('State - Bihar',   'Bihar School Examination Board',                     'Bihar'),
  ('State - Maharashtra','Maharashtra State Board',                         'Maharashtra'),
  ('State - Gujarat', 'Gujarat Secondary and Higher Secondary Education Board', 'Gujarat'),
  ('State - West Bengal','West Bengal Board of Secondary Education',        'West Bengal'),
  ('State - Tamil Nadu','Tamil Nadu State Board',                           'Tamil Nadu'),
  ('State - Karnataka','Karnataka Secondary Education Examination Board',   'Karnataka'),
  ('State - Kerala',  'Kerala Board of Public Examinations',                'Kerala'),
  ('State - Telangana','Telangana State Board',                             'Telangana'),
  ('State - Andhra Pradesh','Andhra Pradesh State Board',                   'Andhra Pradesh'),
  ('IB',              'International Baccalaureate',                        'International'),
  ('CAIE',            'Cambridge Assessment International Education',       'International'),
  ('Other',           'Other board',                                        null)
on conflict (name) do nothing;

-- ---------- 2. Achievement catalog ----------
insert into public.achievement_definitions (code, title, description, icon, points, criteria) values
  ('ONBOARDING_COMPLETE', 'Ready to Roll',     'Completed your academic profile setup',        'rocket',         10, '{"metric":"onboarding_done","eq":true}'),
  ('FIRST_ASSESSMENT',    'First Marks In',    'Logged your first assessment',                 'clipboard-check',10, '{"metric":"assessments_count","gte":1}'),
  ('ATTENDANCE_STREAK_7', 'Week Warrior',      'Attended every class for 7 days in a row',     'flame',          20, '{"metric":"attendance_streak_days","gte":7}'),
  ('ATTENDANCE_STREAK_30','Monthly Maven',     'Attended every class for 30 days in a row',    'flame',          50, '{"metric":"attendance_streak_days","gte":30}'),
  ('ATTENDANCE_90',       'Always Present',    'Held 90%+ attendance in every subject',        'calendar-check', 40, '{"metric":"min_attendance_pct","gte":90}'),
  ('TASKS_10',            'Task Tackler',      'Completed 10 study tasks',                     'check-circle',   20, '{"metric":"tasks_completed","gte":10}'),
  ('TASKS_50',            'Task Master',       'Completed 50 study tasks',                     'trophy',         60, '{"metric":"tasks_completed","gte":50}'),
  ('STUDY_10H_WEEK',      'Deep Focus',        'Studied 10+ hours in a single week',           'timer',          30, '{"metric":"study_hours_week","gte":10}'),
  ('TARGET_HIT',          'On Target',         'Scored at or above your target in an assessment','target',       30, '{"metric":"score_minus_target","gte":0}'),
  ('IMPROVER',            'Upward Trend',      'Raised a subject average by 5+ points in a month','trending-up', 40, '{"metric":"score_trend_per_30d","gte":5}'),
  ('ALL_ON_TRACK',        'Balanced Scholar',  'Every subject predicted to meet its target',   'award',          60, '{"metric":"subjects_on_track_ratio","gte":1}')
on conflict (code) do nothing;

-- ---------- 3. Demo student ----------
do $$
declare
  demo uuid := '00000000-0000-4000-8000-000000000001';
begin
  if exists (select 1 from auth.users where id = demo) then
    return;
  end if;

  -- Auth user (token columns must be '' not NULL or GoTrue login fails)
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', demo, 'authenticated', 'authenticated',
    'demo@student.test', extensions.crypt('Demo@12345', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Student"}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), demo, demo::text,
          jsonb_build_object('sub', demo::text, 'email', 'demo@student.test', 'email_verified', true),
          'email', now(), now(), now());

  -- Profile row was created by the on_auth_user_created trigger
  update public.student_profiles
     set course = 'B.Tech Computer Science', institution = 'Demo Institute of Technology',
         current_semester = 4, board_10th_pct = 91.20, board_12th_pct = 88.60,
         previous_sem_gpa = 8.10, weekly_study_hours = 22, onboarding_done = true
   where user_id = demo;

  insert into public.board_subject_marks (user_id, level, board_name, subject_name, marks_obtained, max_marks, year_of_passing) values
    (demo, '10th', 'CBSE', 'Mathematics', 94, 100, 2020),
    (demo, '10th', 'CBSE', 'Science',     90, 100, 2020),
    (demo, '10th', 'CBSE', 'English',     88, 100, 2020),
    (demo, '12th', 'CBSE', 'Physics',     86, 100, 2022),
    (demo, '12th', 'CBSE', 'Mathematics', 92, 100, 2022),
    (demo, '12th', 'CBSE', 'Computer Science', 95, 100, 2022);

  insert into public.enrollments (user_id, subject_code, subject_name, credits, target_score, color) values
    (demo, 'CS201', 'Data Structures',         4, 90, '#6366f1'),
    (demo, 'CS202', 'Operating Systems',       4, 85, '#10b981'),
    (demo, 'MA201', 'Discrete Mathematics',    3, 80, '#f59e0b'),
    (demo, 'CS203', 'Database Systems',        3, 88, '#ef4444'),
    (demo, 'HS201', 'Technical Communication', 2, 85, '#06b6d4');

  -- Assessments (days_ago controls the trend)
  insert into public.assessments (enrollment_id, user_id, assessment_title, assessment_type, raw_marks, max_marks, weightage, recorded_at)
  select en.id, demo, v.title, v.typ, v.raw, v.mx, v.w, current_date - v.d
  from (values
    ('CS201','Quiz 1',  'quiz',    16, 20, 10, 60),
    ('CS201','Quiz 2',  'quiz',    17, 20, 10, 30),
    ('CS201','Midterm', 'midterm', 71, 100, 30, 12),
    ('CS202','Quiz 1',  'quiz',    14, 20, 10, 55),
    ('CS202','Midterm', 'midterm', 64, 100, 30, 10),
    ('MA201','Assignment 1','assignment', 15, 25, 15, 50),
    ('MA201','Quiz 1',  'quiz',    11, 20, 10, 28),
    ('MA201','Midterm', 'midterm', 49, 100, 30, 9),
    ('CS203','Lab 1',   'lab',     23, 25, 10, 40),
    ('CS203','Midterm', 'midterm', 78, 100, 30, 8),
    ('HS201','Presentation','assignment', 21, 25, 20, 20)
  ) as v(code, title, typ, raw, mx, w, d)
  join public.enrollments en on en.user_id = demo and en.subject_code = v.code;

  -- ~5 weeks of weekday attendance with a different rate per subject
  insert into public.attendance_logs (enrollment_id, user_id, class_date, status)
  select en.id, demo, g.d::date,
         case when (abs(hashtext(en.id::text || g.d::text)) % 100) < r.pct then 'present' else 'absent' end
  from public.enrollments en
  join (values ('CS201',92), ('CS202',78), ('MA201',64), ('CS203',88), ('HS201',95)) as r(code, pct)
       on r.code = en.subject_code
  cross join generate_series(current_date - 35, current_date - 1, interval '1 day') as g(d)
  where en.user_id = demo and extract(isodow from g.d) < 6;

  insert into public.study_tasks (user_id, enrollment_id, title, status, priority, is_ai_suggested, allocated_hours, due_date)
  select demo, en.id, v.title, v.st, v.pr, v.ai, v.hrs, current_date + v.dd
  from (values
    ('MA201','Revise graph theory proofs',     'todo',        'high',     true,  3.0,  2),
    ('CS201','Solve 10 tree problems',         'in_progress', 'medium',   false, 2.0,  1),
    ('CS202','Read CPU scheduling chapter',    'completed',   'low',      false, 1.5, -2),
    ('CS203','Normalization practice sheet',   'todo',        'critical', true,  2.5,  3),
    ('HS201','Draft lab report',               'completed',   'medium',   false, 1.0, -4)
  ) as v(code, title, st, pr, ai, hrs, dd)
  join public.enrollments en on en.user_id = demo and en.subject_code = v.code;

  -- Study sessions over the last 2 weeks
  insert into public.study_sessions (user_id, enrollment_id, started_at, duration_minutes, focus_rating)
  select demo, en.id, (current_date - g.n)::timestamptz + interval '18 hours',
         30 + (abs(hashtext(en.id::text || g.n::text)) % 90),
         3 + (abs(hashtext(g.n::text || en.id::text)) % 3)
  from public.enrollments en
  cross join generate_series(1, 14) as g(n)
  where en.user_id = demo and (abs(hashtext(en.id::text || g.n::text || 'x')) % 3) = 0;

  insert into public.syllabus_topics (user_id, enrollment_id, unit, title, position, is_completed)
  select demo, en.id, v.unit, v.title, v.pos, v.done
  from (values
    ('CS201', 'Unit 1', 'Arrays and linked lists',        1, true),
    ('CS201', 'Unit 2', 'Stacks and queues',              2, true),
    ('CS201', 'Unit 3', 'Trees and BST',                  3, false),
    ('CS201', 'Unit 4', 'Graphs',                         4, false),
    ('MA201', 'Unit 1', 'Logic and proofs',               1, true),
    ('MA201', 'Unit 2', 'Sets, relations and functions',  2, false),
    ('MA201', 'Unit 3', 'Graph theory',                   3, false)
  ) as v(code, unit, title, pos, done)
  join public.enrollments en on en.user_id = demo and en.subject_code = v.code;

  insert into public.user_achievements (user_id, definition_id)
  select demo, id from public.achievement_definitions
  where code in ('ONBOARDING_COMPLETE', 'FIRST_ASSESSMENT');

  insert into public.user_achievements (user_id, custom_title, custom_details)
  values (demo, 'Inter-college coding contest finalist', 'Placed top 10 among 120 teams');

  -- Placeholder analytics output so the dashboard isn't empty before the model runs
  insert into public.predictions (user_id, enrollment_id, predicted_score, confidence, risk_level, model_version)
  select demo, en.id, v.score, v.conf, v.risk, 'seed-v0'
  from (values ('CS201',84.5,0.82,'low'), ('CS202',72.0,0.78,'medium'), ('MA201',58.5,0.74,'high'),
               ('CS203',82.0,0.80,'low'), ('HS201',86.0,0.70,'low')) as v(code, score, conf, risk)
  join public.enrollments en on en.user_id = demo and en.subject_code = v.code;

  update public.enrollments e set predicted_score = p.predicted_score
  from public.predictions p where p.enrollment_id = e.id and e.user_id = demo;

  insert into public.recommendations (user_id, enrollment_id, category, message, priority)
  select demo, en.id, v.cat, v.msg, v.pr
  from (values
    ('MA201','subject_focus','Discrete Mathematics is your biggest risk. Add two 45-minute practice sessions this week.','high'),
    ('MA201','attendance','Attendance in Discrete Mathematics is below 75%. Attend the next 5 classes to recover.','critical'),
    ('CS202','time_management','Block 3 focused hours before the Operating Systems midterm review.','medium')
  ) as v(code, cat, msg, pr)
  join public.enrollments en on en.user_id = demo and en.subject_code = v.code;
end $$;
