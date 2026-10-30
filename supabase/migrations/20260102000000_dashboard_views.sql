-- =============================================================================
-- 20260102000000_dashboard_views.sql
-- security_invoker = true -> the view obeys the caller's RLS.
-- Feature building for the ML model lives in the analytics service (it receives raw rows from the backend).
-- =============================================================================

-- Attendance counts per subject: feeds the bunk calculator and the attendance donut
create or replace view public.v_attendance_breakdown
with (security_invoker = true) as
select
  e.user_id,
  e.id as enrollment_id,
  e.subject_code,
  e.subject_name,
  e.color,
  e.attendance_pct,
  e.min_attendance,
  count(a.id) filter (where a.status = 'present') as present_count,
  count(a.id) filter (where a.status = 'absent')  as absent_count,
  count(a.id) filter (where a.status = 'excused') as excused_count
from public.enrollments e
left join public.attendance_logs a on a.enrollment_id = e.id
group by e.id;
