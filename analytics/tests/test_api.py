from tests.conftest import make_subject


def test_health_is_public(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert "model_version" in body


def test_predict_requires_the_api_key(client, payload):
    assert client.post("/v1/predict", json=payload).status_code == 401
    assert client.post("/v1/predict", json=payload, headers={"x-api-key": "wrong"}).status_code == 401


def test_predict_returns_overall_plus_each_subject(client, headers, payload):
    payload["subjects"].append(make_subject(subject_code="CS302", subject_name="Networks"))
    body = client.post("/v1/predict", json=payload, headers=headers).json()

    assert len(body["predictions"]) == 3
    overall = body["predictions"][0]
    assert overall["enrollment_id"] is None and overall["subject_name"] == "Overall"
    for p in body["predictions"]:
        assert 0 <= p["predicted_score"] <= 100
        assert 0 <= p["confidence"] <= 1
        assert p["risk_level"] in {"low", "medium", "high"}


def test_predict_rejects_an_empty_subject_list(client, headers, payload):
    payload["subjects"] = []
    assert client.post("/v1/predict", json=payload, headers=headers).status_code == 422


def test_simulate_improves_the_forecast_with_better_inputs(client, headers, payload):
    request = payload | {
        "enrollment_id": payload["subjects"][0]["enrollment_id"],
        "scenario": {"expected_score": 95, "extra_study_hours": 6, "attendance_pct": 95},
    }
    body = client.post("/v1/simulate", json=request, headers=headers).json()
    assert body["delta"] >= 0
    assert body["scenario"]["expected_score"] == 95


def test_simulate_404s_for_an_unknown_enrollment(client, headers, payload):
    request = payload | {
        "enrollment_id": "00000000-0000-0000-0000-000000000000",
        "scenario": {"expected_score": 90},
    }
    assert client.post("/v1/simulate", json=request, headers=headers).status_code == 404


def test_failing_subject_produces_critical_recommendations(client, headers, payload):
    payload["subjects"] = [make_subject(scores=(35, 30, 28), present=10, absent=10)]
    items = client.post("/v1/recommendations", json=payload, headers=headers).json()["recommendations"]
    assert items and items[0]["priority"] in {"critical", "high"}
    assert {i["category"] for i in items} & {"subject_focus", "attendance"}


def test_insights_returns_chart_series(client, headers, payload):
    body = client.post("/v1/insights", json=payload, headers=headers).json()
    subject = body["subjects"][0]
    assert {s["key"] for s in subject["series"]} == {"scores", "attendance", "study_hours"}
    assert subject["series"][0]["points"]
