"""Export finished terms from Supabase into one training CSV.

A row = one student-subject whose `final_score` is set. Features are computed as of the
day before the final assessment, so training never sees the outcome it must predict.

    python -m offline.export_training_data --out data/synthetic/training.csv
"""
import argparse
from collections import defaultdict
from datetime import date, timedelta

import pandas as pd

from app.features.builder import FEATURES, build_features
from app.ml.pipelines.forest import risk_from_scores
from app.schemas.payload import Student, Subject
from offline.db.supabase_client import client, fetch_all


def _group(rows: list[dict], key: str = "enrollment_id") -> dict[str, list[dict]]:
    out = defaultdict(list)
    for row in rows:
        if row.get(key):
            out[row[key]].append(row)
    return out


def _subject(enrollment: dict, children: dict[str, list[dict]]) -> Subject:
    assessments = [
        {
            "assessment_type": a["assessment_type"],
            "score": a["score"] if a.get("score") is not None else 100 * a["raw_marks"] / a["max_marks"],
            "weightage": a.get("weightage"),
            "recorded_at": a["recorded_at"],
        }
        for a in children["assessments"]
        if a.get("max_marks")
    ]
    return Subject(
        enrollment_id=enrollment["id"],
        subject_code=enrollment["subject_code"],
        subject_name=enrollment["subject_name"],
        term_label=enrollment.get("term_label") or "Current",
        credits=enrollment.get("credits") or 3,
        target_score=enrollment.get("target_score") or 85,
        min_attendance=enrollment.get("min_attendance") or 75,
        attendance_pct=enrollment.get("attendance_pct"),
        final_score=enrollment["final_score"],
        assessments=assessments,
        attendance_logs=children["attendance_logs"],
        study_tasks=children["study_tasks"],
        study_sessions=children["study_sessions"],
        syllabus_topics=children["syllabus_topics"],
    )


def export(out_path: str) -> pd.DataFrame:
    db = client()
    profiles = {p["user_id"]: p for p in fetch_all(db, "student_profiles")}
    enrollments = [e for e in fetch_all(db, "enrollments") if e.get("final_score") is not None]
    children = {
        table: _group(fetch_all(db, table))
        for table in ("assessments", "attendance_logs", "study_tasks", "study_sessions", "syllabus_topics")
    }

    records = []
    for enrollment in enrollments:
        profile = profiles.get(enrollment["user_id"])
        if not profile:
            continue
        kids = {table: children[table].get(enrollment["id"], []) for table in children}
        subject = _subject(enrollment, kids)
        student = Student(**{k: profile.get(k) for k in Student.model_fields})

        # cut-off: the day before the final, else the last signal we have
        finals = [a.recorded_at for a in subject.assessments if a.assessment_type == "final"]
        dates = [a.recorded_at for a in subject.assessments] + [log.class_date for log in subject.attendance_logs]
        as_of = (min(finals) - timedelta(days=1)) if finals else (max(dates) if dates else date.today())

        row = build_features(student, subject, as_of)
        row["final_score"] = float(enrollment["final_score"])
        row["risk_level"] = risk_from_scores(row["final_score"], subject.target_score)
        row["user_id"], row["enrollment_id"], row["as_of"] = enrollment["user_id"], enrollment["id"], as_of
        records.append(row)

    frame = pd.DataFrame.from_records(records, columns=[*FEATURES, "final_score", "risk_level",
                                                        "user_id", "enrollment_id", "as_of"])
    frame.to_csv(out_path, index=False)
    print(f"Wrote {len(frame)} rows to {out_path}")
    return frame


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/synthetic/training.csv")
    export(parser.parse_args().out)
