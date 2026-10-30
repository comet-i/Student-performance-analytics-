-- =============================================================================
-- 20260103000000_attendance_triggers.sql
-- All triggers: updated_at, signup -> profile, attendance %, task completion time.
-- =============================================================================

-- ---------- updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_student_profiles_updated on public.student_profiles;
create trigger trg_student_profiles_updated
before update on public.student_profiles
for each row execute function public.set_updated_at();

-- ---------- Signup -> student_profiles row ----------
-- Fires when the auth user is created (before email verification). Gate features
-- on auth.users.email_confirmed_at if you need verified-only access.
create or replace function public.handle_new_student()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.student_profiles (user_id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_student();

-- ---------- Attendance % per subject ----------
-- present / (present + absent); excused days don't count either way.
create or replace function public.recalculate_subject_attendance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid := case when tg_op = 'DELETE' then old.enrollment_id else new.enrollment_id end;
  total_classes int;
  attended int;
begin
  select count(*) filter (where status in ('present','absent')),
         count(*) filter (where status = 'present')
    into total_classes, attended
    from public.attendance_logs
   where enrollment_id = target;

  update public.enrollments
     set attendance_pct = case when total_classes = 0 then 100.00
                               else round(attended::numeric / total_classes * 100, 2) end
   where id = target;
  return null;
end;
$$;

drop trigger if exists trg_sync_attendance_pct on public.attendance_logs;
create trigger trg_sync_attendance_pct
after insert or update or delete on public.attendance_logs
for each row execute function public.recalculate_subject_attendance();

-- ---------- Task completed_at ----------
create or replace function public.set_task_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' then
    if tg_op = 'INSERT' then
      new.completed_at := now();
    elsif old.status is distinct from 'completed' then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_task_completed_at on public.study_tasks;
create trigger trg_task_completed_at
before insert or update on public.study_tasks
for each row execute function public.set_task_completed_at();
