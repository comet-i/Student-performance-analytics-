"""Rule engine on top of the model output. Rules are ordered by priority and capped,
so the student sees a short, actionable list rather than everything at once.
"""
import math

from app.features.builder import build_features
from app.ml.explain import describe, drivers
from app.ml.predictor import get_predictor
from app.schemas.payload import Payload, Subject
from app.schemas.prediction import SubjectPrediction
from app.schemas.recommendation import Recommendation, RecommendationResponse
from app.services.prediction_service import predict

MAX_RECOMMENDATIONS = 8


def _subject_rules(subject: Subject, p: SubjectPrediction, row: dict[str, float]) -> list[Recommendation]:
    out: list[Recommendation] = []
    name = subject.subject_name
    gap = subject.target_score - p.predicted_score

    if p.risk_level == "high":
        out.append(Recommendation(
            enrollment_id=subject.enrollment_id, category="subject_focus", priority="critical",
            message=f"{name} is your highest-risk subject: predicted {p.predicted_score:.0f}% "
                    f"against a {subject.target_score:.0f}% target. Give it your next few study blocks.",
        ))
    elif gap > 5:
        out.append(Recommendation(
            enrollment_id=subject.enrollment_id, category="subject_focus", priority="high",
            message=f"{name} is tracking {gap:.0f} points below your target. "
                    f"About {p.recommended_weekly_hours:.0f} hours a week should close the gap.",
        ))

    margin = row["attendance_margin"]
    if not math.isnan(margin):
        if margin < 0:
            out.append(Recommendation(
                enrollment_id=subject.enrollment_id, category="attendance", priority="critical",
                message=f"Attendance in {name} is {row['attendance_pct']:.0f}%, below the "
                        f"{subject.min_attendance:.0f}% requirement. Do not miss the next classes.",
            ))
        elif margin < 5:
            out.append(Recommendation(
                enrollment_id=subject.enrollment_id, category="attendance", priority="high",
                message=f"Attendance in {name} is only {margin:.0f} points above the minimum: "
                        f"two more absences would put you short.",
            ))

    if not math.isnan(row["score_trend_30d"]) and row["score_trend_30d"] <= -4:
        out.append(Recommendation(
            enrollment_id=subject.enrollment_id, category="study_tip", priority="high",
            message=f"Your {name} scores have fallen about {abs(row['score_trend_30d']):.0f} points "
                    f"over the last month. Revisit the most recent topics before moving on.",
        ))

    if row["tasks_overdue"] >= 3:
        out.append(Recommendation(
            enrollment_id=subject.enrollment_id, category="time_management", priority="medium",
            message=f"{int(row['tasks_overdue'])} {name} tasks are overdue. "
                    f"Clear the two oldest ones first, then reschedule the rest.",
        ))

    if not math.isnan(row["syllabus_completion_pct"]) and row["syllabus_completion_pct"] < 50:
        out.append(Recommendation(
            enrollment_id=subject.enrollment_id, category="study_tip", priority="medium",
            message=f"Only {row['syllabus_completion_pct']:.0f}% of the {name} syllabus is marked done. "
                    f"Plan one topic per session to finish before revision week.",
        ))

    if not math.isnan(row["avg_focus"]) and row["avg_focus"] < 3:
        out.append(Recommendation(
            enrollment_id=subject.enrollment_id, category="study_tip", priority="low",
            message=f"Your focus ratings for {name} average {row['avg_focus']:.1f}/5. "
                    f"Try shorter 25-minute blocks with a real break between them.",
        ))
    return out


def _global_rules(payload: Payload, overall: SubjectPrediction) -> list[Recommendation]:
    out: list[Recommendation] = []
    hours = payload.student.weekly_study_hours
    if hours and overall.recommended_weekly_hours > hours * 1.3:
        out.append(Recommendation(
            category="time_management", priority="high",
            message=f"Hitting every target needs roughly {overall.recommended_weekly_hours:.0f} hours a week, "
                    f"but you have {hours:.0f}. Lower a target or move hours to your weakest subject.",
        ))
    if overall.risk_level == "low":
        out.append(Recommendation(
            category="general", priority="low",
            message=f"You are on track for about {overall.predicted_score:.0f}% overall. "
                    f"Keep the current routine and log your sessions so the forecast stays accurate.",
        ))
    return out


PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def recommend(payload: Payload) -> RecommendationResponse:
    predictor = get_predictor()
    result = predict(payload, explain=False)
    overall = result.predictions[0]
    by_enrollment = {p.enrollment_id: p for p in result.predictions[1:]}

    items = _global_rules(payload, overall)
    for subject in payload.subjects:
        row = build_features(payload.student, subject)
        p = by_enrollment[subject.enrollment_id]
        items += _subject_rules(subject, p, row)

        # one model-derived line: the strongest negative driver the student can act on
        if predictor and p.risk_level != "low":
            negative = [d for d in drivers(predictor, row, k=3) if d["impact"] < -1]
            if negative:
                items.append(Recommendation(
                    enrollment_id=subject.enrollment_id, category="study_tip", priority="medium",
                    message=f"For {subject.subject_name}, {describe(negative[0])}.",
                ))

    items.sort(key=lambda r: PRIORITY_ORDER[r.priority])
    return RecommendationResponse(recommendations=items[:MAX_RECOMMENDATIONS])
