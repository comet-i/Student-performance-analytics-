# analytics/ — prediction engine

A small FastAPI service that turns a student's academic history into a predicted score, a risk
level, and actionable recommendations. Two models do the work:

| model | job | output |
| --- | --- | --- |
| `RandomForestRegressor` | predicts the **final score** of a subject | 0-100 |
| `RandomForestClassifier` | predicts the **risk level** of missing the target | `low` / `medium` / `high` |

The service is stateless and holds **no database credentials**. The Express backend on Render
assembles the payload from Supabase, calls this engine, and writes the results back into
`predictions`, `enrollments`, and `recommendations`.

```
Next.js (Vercel) → Express (Render) → analytics engine (Render) → back to Express → Supabase
                        ↑
          GitHub Actions nightly batch (offline/nightly_batch.py)
```

## Endpoints

| method | path | auth | purpose |
| --- | --- | --- | --- |
| GET | `/health` | none | liveness + which model is loaded |
| POST | `/v1/predict` | `x-api-key` | score + risk + recommended hours per subject, plus an `Overall` row |
| POST | `/v1/simulate` | `x-api-key` | what-if for one subject (planner sliders) |
| POST | `/v1/recommendations` | `x-api-key` | prioritised, actionable items ready for the `recommendations` table |
| POST | `/v1/insights` | `x-api-key` | chart-ready series + global feature importances |

`x-api-key` must equal `ML_ENGINE_API_KEY`, the same secret the backend holds.

### Request shape

All four v1 endpoints take the same payload (`/v1/simulate` adds `enrollment_id` and `scenario`):

```jsonc
{
  "student": {                       // from student_profiles
    "board_10th_pct": 88, "board_12th_pct": 84,
    "previous_sem_gpa": 7.8, "weekly_study_hours": 12, "current_semester": 5
  },
  "subjects": [{                     // one per row in enrollments
    "enrollment_id": "uuid", "subject_code": "CS301", "subject_name": "Operating Systems",
    "credits": 4, "target_score": 85, "min_attendance": 75, "attendance_pct": 82,
    "assessments":     [{ "assessment_type": "quiz", "score": 72, "weightage": 10, "recorded_at": "2026-03-04" }],
    "attendance_logs": [{ "class_date": "2026-03-04", "status": "present" }],
    "study_tasks":     [{ "status": "completed", "due_date": "2026-03-01", "completed_at": "2026-03-01T18:00:00Z" }],
    "study_sessions":  [{ "started_at": "2026-03-01T18:00:00Z", "duration_minutes": 90, "focus_rating": 4 }],
    "syllabus_topics": [{ "is_completed": true }]
  }]
}
```

`assessments[].score` is a percentage — the backend sends `raw_marks / max_marks * 100`.
Anything unknown may be omitted; missing inputs become `NaN` and the median imputer handles them.

### Response (`/v1/predict`)

```jsonc
{
  "model_version": "v1",
  "predictions": [
    { "enrollment_id": null, "subject_name": "Overall", "predicted_score": 74.1, ... },
    { "enrollment_id": "uuid", "subject_name": "Operating Systems",
      "predicted_score": 72.9, "confidence": 0.69, "risk_level": "medium",
      "risk_probabilities": { "low": 0.2, "medium": 0.5, "high": 0.3 },
      "recommended_weekly_hours": 15.6, "target_score": 85,
      "drivers": [{ "feature": "attendance_pct", "label": "attendance", "impact": -4.2 }],
      "features": { "...": 0 } }
  ]
}
```

The first row is always the credit-weighted `Overall` prediction with `enrollment_id: null`;
skip it when inserting into `predictions`. `features` goes straight into `predictions.features`
(jsonb), so a past prediction can always be explained after the fact.

## Layout

```
app/
  main.py                   FastAPI app, logging, error handler
  core/       config.py security.py            settings + x-api-key check
  schemas/    payload.py prediction.py recommendation.py insight.py
  features/   extractors.py builder.py         the 24 features, computed "as of" a date
  ml/         predictor.py explain.py
              pipelines/forest.py cold_start.py
  services/   prediction_service.py simulation_service.py
              recommendation_service.py insight_service.py
  api/        router.py routes/
offline/      train.py export_training_data.py nightly_batch.py db/supabase_client.py
artifacts/    model_v1.joblib + metadata_v1.json   (committed; loaded at startup)
data/synthetic/  training CSVs (git-ignored, empty for now)
tests/
```

### The feature row

`app/features/builder.FEATURES` is the single source of truth — 24 columns, in a fixed order,
grouped as: prior academic record, subject setup, attendance, assessments, study behaviour.
Every extractor takes an `as_of` date, so training (past snapshots) and serving (today) run the
*same* code. `final` assessments are never used as an input; they are the outcome.

If you add or reorder a feature, retrain. `load_predictor` compares the artifact's feature list
with the code and falls back to the cold-start rules rather than serving nonsense.

### Cold start

With no `artifacts/model_v1.joblib` present — which is the case until you have training data —
the service still answers every endpoint using `app/ml/pipelines/cold_start.py`: a weighted prior
over 10th/12th/previous GPA, blended with current assessment scores as they accumulate, nudged by
attendance. `model_version` reports `cold-start-v1` so the frontend can label it honestly.

## Training

`data/synthetic/` is intentionally empty. Two ways to fill it:

```bash
# A. from real finished terms in Supabase (enrollments.final_score is set)
python -m offline.export_training_data --out data/synthetic/training.csv

# B. drop in your own CSV with the columns in FEATURES plus final_score (and optionally risk_level)
```

Then:

```bash
pip install -r requirements-dev.txt
python -m offline.train --data data/synthetic/training.csv --version v1
```

This writes `artifacts/model_v1.joblib` (both forests + training medians + metadata) and
`artifacts/metadata_v1.json`. Metrics are cross-validated with `GroupKFold` on `user_id`, so the
same student never appears in both folds: `mae`, `rmse`, `r2` for the regressor and
`risk_f1_macro` for the classifier. **Commit both artifact files** — Render trains nothing.

Rule of thumb: below ~200 finished subject-terms the forests will underperform the cold-start
rules. Check `mae` in the metadata before shipping a model.

## Running

```bash
cp .env.example .env            # set ML_ENGINE_API_KEY
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://127.0.0.1:8000/health
pytest                          # 17 tests, no model artifact needed
```

Render (web service):

- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
- Env: `ML_ENGINE_API_KEY` (same value as the backend), optionally `MODEL_PATH`, `ENABLE_DOCS`

One worker is deliberate: the forests are loaded once per process and cached with `lru_cache`.
`/docs` is off unless `ENABLE_DOCS=true`.

## Nightly batch

`.github/workflows/nightly-predictions.yml` runs:

```bash
pip install -r requirements-offline.txt
python -m offline.nightly_batch
```

with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ML_ENGINE_API_KEY`, and `ANALYTICS_URL` as
secrets. It refreshes every active student, inserts into `predictions`, mirrors
`predicted_score` / `recommended_weekly_hours` onto `enrollments`, and replaces unread
`recommendations`. One student failing never stops the batch. Use `--dry-run` to test it.

## Notes on the modelling choices

- **Random Forest** over a linear model: the signals are non-linear and interacting (attendance
  only matters near the minimum; a strong board record stops mattering once real assessments
  exist), and forests need no feature scaling.
- **Confidence** is the spread across the trees, not a made-up constant: the forest's own
  disagreement, combined with how much history the student has and the model's measured MAE.
- **Explanations** come from a median-substitution pass (`app/ml/explain.py`) — one batched
  predict per subject, no SHAP dependency, and the output is in score points, which is what a
  student can actually read.
