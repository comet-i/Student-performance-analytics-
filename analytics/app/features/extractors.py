"""Feature groups, each computed from data available up to `as_of`.

Training calls these with past dates (term snapshots), live requests with today,
so offline and online always see exactly the same logic.
"""
import math
from datetime import date, timedelta

import numpy as np

from app.schemas.payload import Student, Subject

NAN = math.nan


def _f(x) -> float:
    return NAN if x is None else float(x)


def baseline_features(student: Student) -> dict[str, float]:
    gpa = student.previous_sem_gpa
    return {
        "board_10th_pct": _f(student.board_10th_pct),
        "board_12th_pct": _f(student.board_12th_pct),
        "prev_gpa_pct": NAN if gpa is None else gpa * 10,  # 0-10 scale -> percent
        "weekly_study_hours": _f(student.weekly_study_hours),
        "current_semester": _f(student.current_semester),
    }


def _pct(part: int, total: int) -> float:
    return 100 * part / total if total else NAN


def attendance_counts(subject: Subject, as_of: date) -> tuple[int, int]:
    """(attended, total) up to as_of. 'excused' counts for neither; 'late' counts as attended."""
    logs = [log for log in subject.attendance_logs if log.class_date <= as_of and log.status != "excused"]
    return sum(log.status in ("present", "late") for log in logs), len(logs)


def attendance_features(subject: Subject, as_of: date) -> dict[str, float]:
    attended, total = attendance_counts(subject, as_of)
    recent = [
        log
        for log in subject.attendance_logs
        if as_of - timedelta(days=14) < log.class_date <= as_of and log.status != "excused"
    ]
    pct = _pct(attended, total)
    # fall back to the denormalised enrollments.attendance_pct when no logs were sent
    if math.isnan(pct):
        pct = _f(subject.attendance_pct)
    return {
        "attendance_pct": pct,
        "attendance_recent_pct": _pct(sum(log.status in ("present", "late") for log in recent), len(recent)),
        "attendance_margin": NAN if math.isnan(pct) else pct - subject.min_attendance,
        "absences": float(total - attended),
    }


def assessment_features(subject: Subject, as_of: date) -> dict[str, float]:
    # 'final' is the outcome being predicted, so it is never an input
    rows = sorted(
        (a for a in subject.assessments if a.assessment_type != "final" and a.recorded_at <= as_of),
        key=lambda a: a.recorded_at,
    )
    keys = ["avg_score", "weighted_score", "latest_score", "score_volatility", "score_trend_30d", "score_gap_to_target"]
    if not rows:
        return dict.fromkeys(keys, NAN) | {"n_assessments": 0.0, "assessed_weightage": 0.0}

    scores = np.array([a.score for a in rows], dtype=float)
    weights = np.array([a.weightage or 0.0 for a in rows], dtype=float)
    days = np.array([(a.recorded_at - rows[0].recorded_at).days for a in rows], dtype=float)

    trend = NAN
    if len(rows) > 1:  # points gained per 30 days (least-squares fit)
        trend = float(np.polyfit(days, scores, 1)[0] * 30) if days[-1] > days[0] else 0.0
    # weighted by weightage when set (rows without it count 0), plain mean otherwise: same rule as the backend
    weighted = float(scores @ weights / weights.sum()) if weights.sum() else float(scores.mean())
    return {
        "n_assessments": float(len(rows)),
        "assessed_weightage": float(weights.sum()),
        "avg_score": float(scores.mean()),
        "weighted_score": weighted,
        "latest_score": float(scores[-1]),
        "score_volatility": float(scores.std(ddof=1)) if len(rows) > 1 else NAN,
        "score_trend_30d": trend,
        "score_gap_to_target": weighted - subject.target_score,
    }


def study_features(subject: Subject, as_of: date) -> dict[str, float]:
    since = as_of - timedelta(days=30)
    sessions = [s for s in subject.study_sessions if since < s.started_at.date() <= as_of]
    focus = [s.focus_rating for s in sessions if s.focus_rating]
    due = [t for t in subject.study_tasks if t.due_date and t.due_date <= as_of]
    done = [t for t in due if t.status == "completed" and (t.completed_at is None or t.completed_at.date() <= as_of)]
    topics = subject.syllabus_topics
    return {
        # unknown (not zero) for students who never log sessions at all
        "study_hours_30d": sum(s.duration_minutes for s in sessions) / 60 if subject.study_sessions else NAN,
        "avg_focus": float(np.mean(focus)) if focus else NAN,
        "task_completion_rate": _pct(len(done), len(due)),
        "tasks_overdue": float(len(due) - len(done)),
        "syllabus_completion_pct": _pct(sum(t.is_completed for t in topics), len(topics)),
    }
