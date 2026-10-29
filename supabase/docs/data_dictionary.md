# Data Dictionary

`NULL` always means "not known / not entered". Percent columns are 0-100.

## student_profiles
| Column | Type | Notes |
|---|---|---|
| user_id | uuid PK | = `auth.users.id`, created by trigger on signup |
| full_name | text | From signup metadata or email prefix |
| course, institution | text | |
| current_semester | smallint | 1-12 |
| board_10th_pct, board_12th_pct | numeric(5,2) | Overall % (subject marks in `board_subject_marks`) |
| previous_sem_gpa | numeric(4,2) | 0-10 scale |
| weekly_study_hours | numeric(4,1) | Self-reported availability, 0-100 |
| onboarding_done | boolean | Frontend redirects to `/onboarding` while false |

## enrollments
One subject for one student in one term.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | Unique with `id` (target of composite FKs) |
| subject_code, subject_name, term_label | text | Unique per (user, code, term); allows retakes |
| credits | int | 1-6 |
| attendance_pct | numeric | **Trigger-managed**: present / (present + absent) |
| min_attendance | numeric | Required % (default 75) |
| target_score | numeric | Student's goal (default 85) |
| final_score | numeric | Actual end-of-term result. Entered by the student; **the training label** |
| predicted_score, recommended_weekly_hours | numeric | **Written by the backend** from the analytics engine's output |
| color | text | Hex, reused on every chart |

## assessments
| Column | Type | Notes |
|---|---|---|
| enrollment_id, user_id | uuid | Composite FK to enrollments: owner must match |
| assessment_title | text | e.g. "Quiz 1" |
| assessment_type | text | quiz, assignment, midterm, final, lab, project, mock |
| raw_marks, max_marks | numeric | `raw_marks <= max_marks` |
| weightage | numeric | % contribution to final grade (optional) |
| score | numeric | **Generated**: `raw / max * 100` |
| recorded_at | date | Used for trend calculation |

## attendance_logs
| Column | Type | Notes |
|---|---|---|
| enrollment_id, user_id | uuid | Composite FK |
| class_date | date | Unique per enrollment (upsert to change a day) |
| status | text | present, absent, excused (excused is ignored in %) |

## study_tasks
| Column | Type | Notes |
|---|---|---|
| enrollment_id | uuid, nullable | Subject link; set to NULL if the enrollment is deleted |
| status | text | todo, in_progress, completed |
| priority | text | low, medium, high, critical |
| is_ai_suggested | boolean | Created from a recommendation |
| allocated_hours | numeric | |
| due_date | date | Overdue = not completed and past due (derived, not stored) |
| completed_at | timestamptz | **Trigger-managed** |

## syllabus_topics
Checklist for the subject detail page. `unit` groups topics, `position` orders them, `is_completed` is the tick box. Composite FK to enrollments.

## board_subject_marks
Per-subject 10th/12th marks. Unique per (user, level, subject). `board_name` is free text (suggestions come from `education_boards`).

## study_sessions
Time actually studied. `duration_minutes` > 0, `focus_rating` 1-5, optional links to enrollment and task.

## achievement_definitions / user_achievements
- `achievement_definitions.criteria` is a JSON rule such as `{"metric":"tasks_completed","gte":10}` evaluated by the backend.
- `user_achievements.definition_id` is set for catalog badges (server-awarded). It is NULL for personal achievements, which need `custom_title`.

## predictions
History of model outputs. `enrollment_id` NULL = overall prediction. `features` (jsonb) stores the model inputs for explainability. `risk_level`: low, medium, high.

## recommendations
Tips shown on the dashboard. `category`: study_tip, attendance, subject_focus, time_management, general. Students can only change `is_read`.

## education_boards
Lookup list (CBSE, CISCE, state boards, IB, CAIE, Other) for onboarding dropdowns.

## Views
| View | Purpose |
|---|---|
| v_attendance_breakdown | Present / absent / excused counts per subject. Feeds the bunk calculator and attendance donut |

ML features are built in the analytics service from raw rows the backend sends, so there is no feature view.
