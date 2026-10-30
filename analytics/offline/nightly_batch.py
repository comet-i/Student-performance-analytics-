"""Nightly refresh (GitHub Actions: .github/workflows/nightly-predictions.yml).

Pulls every active student from Supabase, calls the running engine for predictions and
recommendations, then writes the results back:
  - insert into  predictions
  - update       enrollments.predicted_score, recommended_weekly_hours
  - insert into  recommendations (unread ones for the subject are cleared first)

    python -m offline.nightly_batch [--dry-run] [--limit 50]
"""

from __future__ import annotations
import argparse
import os
from collections import defaultdict
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv

from offline.db.supabase_client import client, fetch_all

load_dotenv()
ANALYTICS_URL = os.getenv("ANALYTICS_URL", "http://127.0.0.1:8000")
API_KEY = os.environ["ML_ENGINE_API_KEY"]
TIMEOUT = httpx.Timeout(60.0)


def _group(rows: list[dict], key: str) -> dict[str, list[dict]]:
    out = defaultdict(list)
    for row in rows:
        if row.get(key):
            out[row[key]].append(row)
    return out


def build_payload(profile: dict, enrollments: list[dict], children: dict) -> dict:
    subjects = []
    for enrollment in enrollments:
        eid = enrollment["id"]
        subjects.append({
            "enrollment_id": eid,
            "subject_code": enrollment["subject_code"],
            "subject_name": enrollment["subject_name"],
            "term_label": enrollment.get("term_label") or "Current",
            "credits": enrollment.get("credits") or 3,
            "target_score": enrollment.get("target_score") or 85,
            "min_attendance": enrollment.get("min_attendance") or 75,
            "attendance_pct": enrollment.get("attendance_pct"),
            "assessments": [
                {
                    "assessment_type": a["assessment_type"],
                    "score": a["score"] if a.get("score") is not None else 100 * a["raw_marks"] / a["max_marks"],
                    "weightage": a.get("weightage"),
                    "recorded_at": a["recorded_at"],
                }
                for a in children["assessments"].get(eid, [])
                if a.get("max_marks")
            ],
            "attendance_logs": children["attendance_logs"].get(eid, []),
            "study_tasks": children["study_tasks"].get(eid, []),
            "study_sessions": children["study_sessions"].get(eid, []),
            "syllabus_topics": children["syllabus_topics"].get(eid, []),
        })
    student = {k: profile.get(k) for k in
               ("board_10th_pct", "board_12th_pct", "previous_sem_gpa", "weekly_study_hours", "current_semester")}
    return {"student": student, "subjects": subjects}


def call(http: httpx.Client, path: str, payload: dict) -> dict:
    response = http.post(f"{ANALYTICS_URL}/v1/{path}", json=payload, headers={"x-api-key": API_KEY})
    response.raise_for_status()
    return response.json()


def persist(db, user_id: str, prediction: dict, recommendations: dict) -> None:
    now = datetime.now(timezone.utc).isoformat()
    rows = [p for p in prediction["predictions"] if p["enrollment_id"]]

    db.table("predictions").insert([
        {
            "user_id": user_id,
            "enrollment_id": p["enrollment_id"],
            "predicted_score": p["predicted_score"],
            "confidence": p["confidence"],
            "risk_level": p["risk_level"],
            "model_version": prediction["model_version"],
            "features": p["features"],
            "created_at": now,
        }
        for p in rows
    ]).execute()

    for p in rows:
        db.table("enrollments").update({
            "predicted_score": p["predicted_score"],
            "recommended_weekly_hours": p["recommended_weekly_hours"],
        }).eq("id", p["enrollment_id"]).execute()

    # replace yesterday's unread suggestions so the list does not pile up
    db.table("recommendations").delete().eq("user_id", user_id).eq("is_read", False).execute()
    items = recommendations["recommendations"]
    if items:
        db.table("recommendations").insert([
            {"user_id": user_id, "is_read": False, "created_at": now, **item} for item in items
        ]).execute()


def run(dry_run: bool = False, limit: int | None = None) -> None:
    db = client()
    profiles = [p for p in fetch_all(db, "student_profiles") if p.get("onboarding_done")]
    enrollments_by_user = _group(fetch_all(db, "enrollments"), "user_id")
    children = {
        table: _group(fetch_all(db, table), "enrollment_id")
        for table in ("assessments", "attendance_logs", "study_tasks", "study_sessions", "syllabus_topics")
    }

    done = failed = 0
    with httpx.Client(timeout=TIMEOUT) as http:
        for profile in profiles[:limit]:
            user_id = profile["user_id"]
            enrollments = [e for e in enrollments_by_user.get(user_id, []) if e.get("final_score") is None]
            if not enrollments:
                continue
            payload = build_payload(profile, enrollments, children)
            try:
                prediction = call(http, "predict", payload)
                recommendations = call(http, "recommendations", payload)
                if not dry_run:
                    persist(db, user_id, prediction, recommendations)
                done += 1
            except Exception as exc:  # one bad student must not stop the batch
                failed += 1
                print(f"[warn] {user_id}: {exc}")

    print(f"{'(dry run) ' if dry_run else ''}updated {done} students, {failed} failed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    run(args.dry_run, args.limit)
