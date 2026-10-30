"""What-if: re-score one subject with the scenario knobs applied to its feature row."""
import math

from fastapi import HTTPException, status

from app.features.builder import build_features
from app.ml.pipelines.cold_start import COLD_START_ERROR, COLD_START_VERSION, cold_start_risk
from app.ml.predictor import get_predictor
from app.schemas.payload import SimulateRequest
from app.schemas.prediction import Outcome, SimulationResponse
from app.services.prediction_service import _confidence, score_rows


def _apply(row: dict[str, float], scenario) -> tuple[dict[str, float], dict[str, float]]:
    out, applied = dict(row), {}
    s = scenario

    if s.expected_score is not None:
        # treat the expected score as one more assessment, blended into the running average
        n = max(out["n_assessments"], 0.0)
        prior = out["weighted_score"] if n else s.expected_score
        blended = (prior * n + s.expected_score) / (n + 1)
        out.update(
            n_assessments=n + 1,
            avg_score=blended,
            weighted_score=blended,
            latest_score=s.expected_score,
            score_trend_30d=s.expected_score - prior,
            score_gap_to_target=blended - out["target_score"],
        )
        applied["expected_score"] = s.expected_score

    if s.extra_study_hours is not None:
        base = 0.0 if math.isnan(out["weekly_study_hours"]) else out["weekly_study_hours"]
        monthly = 0.0 if math.isnan(out["study_hours_30d"]) else out["study_hours_30d"]
        out["weekly_study_hours"] = base + s.extra_study_hours
        out["study_hours_30d"] = monthly + 4.3 * s.extra_study_hours
        applied["extra_study_hours"] = s.extra_study_hours

    if s.attendance_pct is not None:
        out["attendance_pct"] = s.attendance_pct
        out["attendance_recent_pct"] = s.attendance_pct
        # the exact margin needs min_attendance, which simulate() fills in below
        applied["attendance_pct"] = s.attendance_pct

    if s.task_completion_rate is not None:
        out["task_completion_rate"] = s.task_completion_rate
        applied["task_completion_rate"] = s.task_completion_rate

    return out, applied


def simulate(request: SimulateRequest) -> SimulationResponse:
    subject = next((s for s in request.subjects if s.enrollment_id == request.enrollment_id), None)
    if subject is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "enrollment_id is not in the submitted subjects")

    predictor = get_predictor()
    base_row = build_features(request.student, subject)
    sim_row, applied = _apply(base_row, request.scenario)
    # min_attendance is not in the feature row, so recompute the margin from the subject
    if request.scenario.attendance_pct is not None:
        sim_row["attendance_margin"] = request.scenario.attendance_pct - subject.min_attendance

    scores, spreads, probabilities = score_rows([base_row, sim_row], predictor)
    error = predictor.expected_error if predictor else COLD_START_ERROR

    outcomes = []
    for i, row in enumerate((base_row, sim_row)):
        score = float(scores[i])
        if probabilities is not None:
            probs = probabilities[i]
            risk = max(probs, key=probs.get)
        else:
            risk, _ = cold_start_risk(score, row)
        outcomes.append(
            Outcome(
                predicted_score=round(score, 2),
                risk_level=risk,
                confidence=_confidence(float(spreads[i]), error, row["n_assessments"]),
            )
        )

    return SimulationResponse(
        model_version=predictor.version if predictor else COLD_START_VERSION,
        enrollment_id=subject.enrollment_id,
        subject_name=subject.subject_name,
        baseline=outcomes[0],
        simulated=outcomes[1],
        delta=round(outcomes[1].predicted_score - outcomes[0].predicted_score, 2),
        scenario=applied,
    )
