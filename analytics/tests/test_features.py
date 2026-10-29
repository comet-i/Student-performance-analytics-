from datetime import date

from app.features.builder import FEATURES, build_features, to_json
from app.schemas.payload import Student, Subject
from tests.conftest import TODAY, make_subject


def _row(**overrides):
    student = Student(board_10th_pct=88, board_12th_pct=84, previous_sem_gpa=7.8,
                      weekly_study_hours=12, current_semester=5)
    return build_features(student, Subject(**make_subject(**overrides)), TODAY)


def test_row_has_every_feature_in_order():
    row = _row()
    assert list(row) == FEATURES


def test_attendance_excludes_excused_days():
    row = _row(attendance_logs=[
        {"class_date": "2026-04-01", "status": "present"},
        {"class_date": "2026-04-02", "status": "absent"},
        {"class_date": "2026-04-03", "status": "excused"},
    ])
    assert row["attendance_pct"] == 50
    assert row["absences"] == 1


def test_final_assessment_is_never_a_feature():
    row = _row(assessments=[
        {"assessment_type": "quiz", "score": 60, "recorded_at": "2026-03-01"},
        {"assessment_type": "final", "score": 95, "recorded_at": "2026-04-01"},
    ])
    assert row["n_assessments"] == 1
    assert row["avg_score"] == 60


def test_features_as_of_a_past_date_ignore_later_data():
    row = build_features(
        Student(), Subject(**make_subject(scores=(50, 90))), date(2026, 3, 15)
    )
    assert row["n_assessments"] == 1  # only the 2026-03-02 quiz is visible, not the 2026-04-01 one
    assert row["latest_score"] == 50


def test_to_json_replaces_nan_with_none():
    row = build_features(Student(), Subject(**make_subject(assessments=[])), TODAY)
    assert to_json(row)["avg_score"] is None
