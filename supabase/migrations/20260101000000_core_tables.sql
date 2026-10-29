-- =============================================================================
-- 20260101000000_core_tables.sql
-- Tables, constraints, indexes.  Views -> 0002, triggers -> 0003, RLS -> 0004.
--
-- Ownership integrity: child tables carry (parent_id, user_id) composite FKs, so
-- a row can never point at another student's enrollment/task.
-- =============================================================================

-- ---------- Reference data ----------
create table public.education_boards (
  name      text primary key,
  full_name text,
  region    text
);

-- ---------- 1. Student profiles (1:1 with auth.users) ----------
create table public.student_profiles (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  full_name          text not null,
  course             text,
  institution        text,
  current_semester   smallint check (current_semester between 1 and 12),
  avatar_url         text,
  -- NULL = "not entered yet" (0 would look like a real score to the ML model)
  board_10th_pct     numeric(5,2) check (board_10th_pct between 0 and 100),
  board_12th_pct     numeric(5,2) check (board_12th_pct between 0 and 100),
  previous_sem_gpa   numeric(4,2) check (previous_sem_gpa between 0 and 10),
  weekly_study_hours numeric(4,1) check (weekly_study_hours > 0 and weekly_study_hours <= 100),
  onboarding_done    boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- 2. Enrollments (subject per student per term) ----------
create table public.enrollments (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.student_profiles(user_id) on delete cascade,
  subject_code             text not null,
  subject_name             text not null,
  term_label               text not null default 'Current',
  credits                  int  not null default 3 check (credits between 1 and 6),
  attendance_pct           numeric(5,2) not null default 100 check (attendance_pct between 0 and 100), -- trigger-managed
  min_attendance           numeric(5,2) not null default 75  check (min_attendance between 0 and 100),
  target_score             numeric(5,2) not null default 85  check (target_score between 0 and 100),
  predicted_score          numeric(5,2) check (predicted_score between 0 and 100),                      -- written by analytics
  recommended_weekly_hours numeric(4,1) not null default 0,                                              -- written by analytics
  final_score              numeric(5,2) check (final_score between 0 and 100),                           -- actual end-of-term result (training label)
  color                    text not null default '#6366f1',
  created_at               timestamptz not null default now(),
  unique (user_id, subject_code, term_label),
  constraint enrollments_id_user_key unique (id, user_id)
);

-- ---------- 3. Assessments ----------
create table public.assessments (
  id               uuid primary key default gen_random_uuid(),
  enrollment_id    uuid not null,
  user_id          uuid not null,
  assessment_title text not null,
  assessment_type  text check (assessment_type in ('quiz','assignment','midterm','final','lab','project','mock')),
  raw_marks        numeric(6,2) not null check (raw_marks >= 0),
  max_marks        numeric(6,2) not null default 100 check (max_marks > 0),
  weightage        numeric(5,2) check (weightage between 0 and 100),
  score            numeric(5,2) generated always as (round((raw_marks / max_marks) * 100, 2)) stored,
  recorded_at      date not null default current_date,
  created_at       timestamptz not null default now(),
  check (raw_marks <= max_marks),
  constraint assessments_enrollment_fk foreign key (enrollment_id, user_id)
    references public.enrollments (id, user_id) on delete cascade
);

-- ---------- 4. Attendance logs ----------
create table public.attendance_logs (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null,
  user_id       uuid not null,
  class_date    date not null default current_date,
  status        text not null check (status in ('present','absent','excused')),
  created_at    timestamptz not null default now(),
  unique (enrollment_id, class_date),
  constraint attendance_enrollment_fk foreign key (enrollment_id, user_id)
    references public.enrollments (id, user_id) on delete cascade
);

-- ---------- 5. Study tasks ----------
create table public.study_tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.student_profiles(user_id) on delete cascade,
  enrollment_id   uuid,
  title           text not null,
  description     text,
  status          text not null default 'todo' check (status in ('todo','in_progress','completed')),
  priority        text not null default 'medium' check (priority in ('low','medium','high','critical')),
  is_ai_suggested boolean not null default false,
  allocated_hours numeric(4,1) not null default 1 check (allocated_hours >= 0),
  due_date        date,
  completed_at    timestamptz,                  -- trigger-managed
  created_at      timestamptz not null default now(),
  constraint study_tasks_id_user_key unique (id, user_id),
  constraint study_tasks_enrollment_fk foreign key (enrollment_id, user_id)
    references public.enrollments (id, user_id) on delete set null (enrollment_id)
);

-- ---------- 6. Board (10th / 12th) subject marks ----------
create table public.board_subject_marks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.student_profiles(user_id) on delete cascade,
  level           text not null check (level in ('10th','12th')),
  board_name      text,
  subject_name    text not null,
  marks_obtained  numeric(6,2) not null check (marks_obtained >= 0),
  max_marks       numeric(6,2) not null default 100 check (max_marks > 0),
  year_of_passing smallint,
  check (marks_obtained <= max_marks),
  unique (user_id, level, subject_name)
);

-- ---------- 7. Study sessions (time actually studied) ----------
create table public.study_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.student_profiles(user_id) on delete cascade,
  enrollment_id    uuid,
  task_id          uuid,
  started_at       timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  focus_rating     smallint check (focus_rating between 1 and 5),
  created_at       timestamptz not null default now(),
  constraint study_sessions_enrollment_fk foreign key (enrollment_id, user_id)
    references public.enrollments (id, user_id) on delete set null (enrollment_id),
  constraint study_sessions_task_fk foreign key (task_id, user_id)
    references public.study_tasks (id, user_id) on delete set null (task_id)
);

-- ---------- 7b. Syllabus topics (subject detail page) ----------
create table public.syllabus_topics (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  enrollment_id uuid not null,
  unit          text,
  title         text not null,
  position      integer not null default 0,
  is_completed  boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint syllabus_enrollment_fk foreign key (enrollment_id, user_id)
    references public.enrollments (id, user_id) on delete cascade
);

-- ---------- 8. Achievements ----------
create table public.achievement_definitions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  title       text not null,
  description text,
  icon        text,
  points      integer not null default 0,
  criteria    jsonb
);

create table public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.student_profiles(user_id) on delete cascade,
  definition_id  uuid references public.achievement_definitions(id) on delete set null,
  custom_title   text,
  custom_details text,
  proof_url      text,
  earned_at      timestamptz not null default now(),
  check (definition_id is not null or custom_title is not null),
  unique (user_id, definition_id)
);

-- ---------- 9. Analytics output (written by the Python service) ----------
create table public.predictions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.student_profiles(user_id) on delete cascade,
  enrollment_id   uuid,                                   -- NULL = overall prediction
  predicted_score numeric(5,2) not null check (predicted_score between 0 and 100),
  confidence      numeric(4,3) check (confidence between 0 and 1),
  risk_level      text check (risk_level in ('low','medium','high')),
  model_version   text not null,
  features        jsonb,
  created_at      timestamptz not null default now(),
  constraint predictions_enrollment_fk foreign key (enrollment_id, user_id)
    references public.enrollments (id, user_id) on delete cascade
);

create table public.recommendations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.student_profiles(user_id) on delete cascade,
  enrollment_id uuid,
  category      text not null default 'general'
                check (category in ('study_tip','attendance','subject_focus','time_management','general')),
  message       text not null,
  priority      text not null default 'medium' check (priority in ('low','medium','high','critical')),
  is_read       boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint recommendations_enrollment_fk foreign key (enrollment_id, user_id)
    references public.enrollments (id, user_id) on delete cascade
);

-- ---------- Indexes ----------
create index idx_enrollments_user          on public.enrollments(user_id);
create index idx_assessments_enrollment    on public.assessments(enrollment_id);
create index idx_assessments_user_date     on public.assessments(user_id, recorded_at);
create index idx_attendance_user_date      on public.attendance_logs(user_id, class_date);
create index idx_tasks_user_status         on public.study_tasks(user_id, status);
create index idx_tasks_user_due            on public.study_tasks(user_id, due_date);
create index idx_tasks_enrollment          on public.study_tasks(enrollment_id);
create index idx_syllabus_enrollment      on public.syllabus_topics(enrollment_id, position);
create index idx_sessions_user_time        on public.study_sessions(user_id, started_at);
create index idx_sessions_enrollment       on public.study_sessions(enrollment_id);
create index idx_user_achievements_user    on public.user_achievements(user_id);
create index idx_predictions_user_time     on public.predictions(user_id, created_at desc);
create index idx_predictions_enrollment    on public.predictions(enrollment_id, created_at desc);
create index idx_reco_user_unread          on public.recommendations(user_id, is_read, created_at desc);
