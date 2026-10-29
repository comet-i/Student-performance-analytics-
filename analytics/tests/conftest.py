import os
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

import pytest

os.environ.setdefault("ML_ENGINE_API_KEY", "test-key-at-least-16-chars")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

API_KEY = os.environ["ML_ENGINE_API_KEY"]
TODAY = date(2026, 5, 1)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def headers() -> dict:
    return {"x-api-key": API_KEY}


def make_subject(enrollment_id=None, scores=(72, 68, 75), present=18, absent=2, **overrides) -> dict:
    eid = str(enrollment_id or uuid4())
    subject = {
        "enrollment_id": eid,
        "subject_code": "CS301",
        "subject_name": "Operating Systems",
        "credits": 4,
        "target_score": 85,
        "min_attendance": 75,
        "assessments": [
            {"assessment_type": "quiz", "score": s, "weightage": 10,
             "recorded_at": (TODAY - timedelta(days=30 * (len(scores) - i))).isoformat()}
            for i, s in enumerate(scores)
        ],
        "attendance_logs": (
            [{"class_date": (TODAY - timedelta(days=i)).isoformat(), "status": "present"} for i in range(present)]
            + [{"class_date": (TODAY - timedelta(days=present + i)).isoformat(), "status": "absent"}
               for i in range(absent)]
        ),
        "study_tasks": [
            {"status": "completed", "due_date": (TODAY - timedelta(days=5)).isoformat(),
             "completed_at": datetime(2026, 4, 25, tzinfo=timezone.utc).isoformat()},
            {"status": "todo", "due_date": (TODAY - timedelta(days=2)).isoformat()},
        ],
        "study_sessions": [
            {"started_at": datetime(2026, 4, 20, 18, tzinfo=timezone.utc).isoformat(),
             "duration_minutes": 90, "focus_rating": 4},
        ],
        "syllabus_topics": [{"is_completed": True}, {"is_completed": False}],
    }
    return subject | overrides


@pytest.fixture
def payload() -> dict:
    return {
        "student": {
            "board_10th_pct": 88, "board_12th_pct": 84, "previous_sem_gpa": 7.8,
            "weekly_study_hours": 12, "current_semester": 5,
        },
        "subjects": [make_subject()],
    }
