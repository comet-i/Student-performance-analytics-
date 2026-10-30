# Database (Supabase / PostgreSQL)

## Layout
```
database/
└── supabase/
    ├── config.toml        # CLI + local auth config (6-digit email OTP, redirect URLs)
    ├── migrations/        # applied in filename order; never edit one after it is applied
    │   ├── 20260101000000_core_tables.sql
    │   ├── 20260102000000_dashboard_views.sql
    │   ├── 20260103000000_attendance_triggers.sql   # all triggers
    │   └── 20260104000000_rls_policies.sql
    ├── seed.sql           # boards, badges, demo student (runs on `db reset`)
    ├── templates/otp_email.html
    ├── tests/rls_security_test.sql                  # pgTAP
    └── docs/              # erd.md, data_dictionary.md
```

## Prerequisites
- [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker running
- Run every command below **from `database/`** (the folder that contains `supabase/`)

## Local development
```bash
supabase start            # starts Postgres, Auth, Studio, Inbucket
supabase db reset         # drops local DB, runs migrations, then seed.sql
supabase test db          # runs pgTAP tests
supabase status           # prints API URL, anon key, service_role key
```
- Studio: http://127.0.0.1:54323
- Email inbox for OTP codes: http://127.0.0.1:54324
- Demo login: `demo@student.test` / `Demo@12345`

## Making schema changes
```bash
supabase migration new add_notifications   # creates an empty timestamped file
# write SQL in it, then:
supabase db reset && supabase test db
```
Never edit an applied migration; add a new one.

## Generate types for the apps
```bash
supabase gen types typescript --local > ../backend/src/types/database.types.ts
cp ../backend/src/types/database.types.ts ../frontend/types/database.types.ts
```

## Environment variables
| Where | Variable | Notes |
|---|---|---|
| frontend | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe in the browser (RLS protects data) |
| backend | same two, plus `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| analytics | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server only. Never expose the service key to the browser |

## Deploying to the hosted project
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push            # applies migrations only (seed is NOT applied)
supabase config push        # applies auth settings (OTP, redirects) from config.toml
```
## Moving an existing hosted project onto these migrations
Use this when the tables were created by hand (SQL editor / an older `schema.sql`). The project, its URL and its
keys stay the same; only the old tables are replaced.

1. **Export anything worth keeping** (Table Editor -> Export CSV, or `supabase db dump --linked --data-only -f backup.sql`). Keep exports out of git.
2. **Remove the old objects** (SQL editor; deletes the data in these tables):
   ```sql
   drop table if exists public.recommendations, public.predictions, public.user_achievements,
     public.achievement_definitions, public.study_sessions, public.board_subject_marks,
     public.study_tasks, public.attendance_logs, public.assessments, public.enrollments,
     public.student_profiles cascade;
   drop function if exists public.recalculate_subject_attendance() cascade;
   drop function if exists public.handle_new_student() cascade;
   ```
3. **Apply the migrations:** `supabase link --project-ref <ref>` then `supabase db push`.
   (An error at `study_tasks` about `SET NULL (...)` means the project runs PostgreSQL 14: upgrade it first.)
4. **Back-fill profiles** for accounts that already exist (the signup trigger only fires for new users):
   ```sql
   insert into public.student_profiles (user_id, full_name)
   select id, coalesce(nullif(raw_user_meta_data->>'full_name',''), split_part(email,'@',1)) from auth.users
   on conflict (user_id) do nothing;
   ```
5. **Seed reference data only:** run blocks 1 and 2 of `seed.sql` (boards, badges) in the SQL editor.

Avoid `supabase db reset --linked`: it wipes every auth account and can also run `seed.sql`, which creates the demo
user with a known password.

Do **not** run the demo-student block of `seed.sql` on a hosted project.

## Security model (summary)
- RLS is on for every table; students only read/write their own rows.
- Child rows carry `(parent_id, user_id)` composite foreign keys, so a row cannot reference another student's enrollment or task.
- Students cannot write `predicted_score`, `attendance_pct`, predictions, or catalog badges. Those come from triggers, the backend, or the analytics service using `service_role`.
- See `supabase/docs/erd.md` for the full "who writes what" table.
