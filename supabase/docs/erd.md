# Entity Relationship Diagram

```mermaid
erDiagram
    AUTH_USERS ||--|| STUDENT_PROFILES : "1:1 (trigger on signup)"
    STUDENT_PROFILES ||--o{ ENROLLMENTS : has
    STUDENT_PROFILES ||--o{ STUDY_TASKS : owns
    STUDENT_PROFILES ||--o{ STUDY_SESSIONS : logs
    STUDENT_PROFILES ||--o{ BOARD_SUBJECT_MARKS : "10th / 12th"
    STUDENT_PROFILES ||--o{ USER_ACHIEVEMENTS : earns
    STUDENT_PROFILES ||--o{ PREDICTIONS : receives
    STUDENT_PROFILES ||--o{ RECOMMENDATIONS : receives
    ENROLLMENTS ||--o{ ASSESSMENTS : "marks"
    ENROLLMENTS ||--o{ ATTENDANCE_LOGS : "daily status"
    ENROLLMENTS ||--o{ SYLLABUS_TOPICS : "checklist"
    ENROLLMENTS |o--o{ STUDY_TASKS : "optional link"
    ENROLLMENTS |o--o{ STUDY_SESSIONS : "optional link"
    ENROLLMENTS |o--o{ PREDICTIONS : "NULL = overall"
    ENROLLMENTS |o--o{ RECOMMENDATIONS : "optional link"
    STUDY_TASKS |o--o{ STUDY_SESSIONS : "optional link"
    ACHIEVEMENT_DEFINITIONS ||--o{ USER_ACHIEVEMENTS : "catalog"

    STUDENT_PROFILES {
        uuid user_id PK
        text full_name
        numeric board_10th_pct
        numeric board_12th_pct
        numeric previous_sem_gpa
        numeric weekly_study_hours
        boolean onboarding_done
    }
    ENROLLMENTS {
        uuid id PK
        uuid user_id FK
        text subject_code
        text term_label
        numeric attendance_pct "trigger"
        numeric target_score
        numeric final_score "actual result = training label"
        numeric predicted_score "analytics"
    }
    ASSESSMENTS {
        uuid id PK
        uuid enrollment_id FK
        numeric raw_marks
        numeric max_marks
        numeric score "generated %"
        numeric weightage
    }
    ATTENDANCE_LOGS {
        uuid id PK
        uuid enrollment_id FK
        date class_date
        text status
    }
    PREDICTIONS {
        uuid id PK
        numeric predicted_score
        text risk_level
        text model_version
        jsonb features
    }
```

## Who writes what

| Table / column | Student (JWT, RLS) | Backend (service_role) | Nightly job (service_role) | DB trigger |
|---|---|---|---|---|
| student_profiles | read, update own | - | - | created on signup |
| enrollments (except below) | full own | - | - | - |
| enrollments.attendance_pct | read | - | - | **writes** |
| enrollments.final_score | full own | - | - | - |
| enrollments.predicted_score, recommended_weekly_hours | read | **writes** (service_role) | - | - |
| assessments, attendance_logs, study_tasks, study_sessions, board_subject_marks, syllabus_topics | full own | - | - | - |
| study_tasks.completed_at | read | - | - | **writes** |
| user_achievements (catalog badges) | read | **awards** | - | - |
| user_achievements (custom, `definition_id` null) | full own | - | - | - |
| predictions | read | **writes** (service_role) | - | - |
| recommendations | read, mark `is_read` | **writes** (service_role) | - | - |
| achievement_definitions, education_boards | read | admin only | - | - |
