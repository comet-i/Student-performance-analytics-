# Student Performance Analytics

A cloud-based student performance prediction and analytics platform designed to help educators, academic teams, and students understand learning progress, identify risk early, and make data-informed decisions.

The platform combines a modern web application, a secure backend API, a machine learning prediction engine, and a Postgres-powered data layer to provide an end-to-end student analytics workflow.

## Overview

Student Performance Analytics helps track academic performance across subjects, attendance, assessments, and study behavior. It provides:

- Student dashboards and academic summaries
- Subject-wise performance insights
- Prediction of final scores and risk levels
- Personalized recommendations for study effort and time allocation
- Attendance and task tracking for proactive intervention
- Secure data access via Supabase Row Level Security (RLS)

The system is designed to support both real-time analytics and scheduled offline prediction runs.

## Core Features

- Student profile and academic tracking
- Enrollment and subject-level monitoring
- Assessment, attendance, and study-task data capture
- Score prediction using machine learning models
- Risk classification for underperformance and missing targets
- Recommendation engine for weekly study planning
- Dashboard-ready analytics and trend summaries
- Cloud deployment with managed infrastructure

## Architecture

```text
Next.js (Frontend) -> Express API (Backend) -> Supabase/PostgreSQL
                                 -> FastAPI ML Engine
                                 -> GitHub Actions nightly jobs
```

The platform separates responsibilities across multiple layers:

- Frontend: user-facing dashboard and application UI
- Backend: API, business logic, authentication/data orchestration
- Analytics Engine: model inference and prediction generation
- Database: persistent academic, enrollment, and recommendation data
- DevOps: deployment automation and scheduled background jobs

## Tech Stack

### Frontend
- Next.js 15
- React 19
- Tailwind CSS
- Lucide icons
- Supabase client integration

### Backend
- Node.js 20+
- Express.js
- Supabase JS SDK
- Zod validation
- Helmet, CORS, rate limiting

### Analytics / ML
- Python 3.12+
- FastAPI
- scikit-learn
- NumPy
- Joblib
- Random Forest Regressor / Classifier models

### Data & Storage
- Supabase
- PostgreSQL
- Row Level Security (RLS)
- SQL migrations and database triggers

### Deployment & Automation
- Render for backend and cloud services
- Vercel-style frontend deployment flow
- GitHub Actions for nightly predictions
- Environment-based configuration management

## Project Structure

```text
.
├── analytics/                  # ML prediction service
│   ├── app/                    # FastAPI application and model logic
│   ├── artifacts/              # Trained ML artifacts
│   ├── data/                   # Training and synthetic datasets
│   ├── offline/                # Batch jobs and model training scripts
│   └── tests/                  # Analytics tests
│
├── backend/                    # Express API and server logic
│   ├── src/                    # Application source
│   ├── server.js               # API entry point
│   ├── package.json            # Node.js dependencies and scripts
│   └── tests/                  # Backend tests
│
├── frontend/                   # Next.js web application
│   ├── app/                    # App router pages
│   ├── components/             # Reusable UI components
│   ├── lib/                    # Shared logic and utilities
│   ├── public/                 # Static assets
│   └── package.json            # Frontend dependencies
│
├── database/                   # Database layer / migration conventions
├── supabase/                   # Supabase config, migrations, and schema docs
├── render.yaml                 # Render deployment blueprint
├── nightly-predictions.yml     # Scheduled prediction workflow
├── LICENSE
├── README.md
└── .gitignore
```

## How the Platform Works

1. Students interact with the frontend dashboard.
2. The frontend communicates with the Express backend.
3. The backend reads and writes academic data from Supabase/PostgreSQL.
4. The analytics service evaluates subject performance, risk signals, and study patterns.
5. Predictions and recommendations are written back into the platform data model.
6. Scheduled jobs can refresh forecasts in bulk without interrupting the app.

## Prediction & Analytics Model

The analytics layer is built around machine learning models trained on academic and behavioral data such as:

- Previous academic performance
- Subject-level scores and targets
- Attendance trends
- Assessment performance
- Study habits and session data

The prediction service can produce:

- Final score estimates
- Risk classification (low / medium / high)
- Confidence scores
- Recommended weekly study hours
- Actionable guidance for students and instructors

## Database and Security

The project uses Supabase with PostgreSQL and applies row-level security to ensure users only access their relevant academic data. The schema is structured around student profile records, enrollments, assessments, attendance logs, study tasks, predictions, and recommendations.

This architecture supports both app-level workflows and secure backend operations using service-role credentials where needed.

## Development Workflow

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Analytics Service

```bash
cd analytics
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Environment Variables

Typical environment variables include:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL`
- `ML_ENGINE_URL`
- `ML_ENGINE_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These values are used across frontend, backend, and analytics components depending on runtime context.

## Deployment

The repository includes a Render configuration for deploying the backend service and a deployment-ready structure for the analytics engine and frontend application. The stack is intended for cloud hosting without introducing heavy infrastructure complexity.

## Why This Project Matters

This project addresses the need for proactive academic monitoring by combining data capture, analytics, and machine learning in a single platform. Instead of relying only on final exam outcomes, it supports continuous, real-time insight into how a student is performing and what interventions may help.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome. If you plan to improve the model, add new insights, improve the dashboard UX, or expand the data layer, keep changes modular and align them with the existing architecture.

## Summary

Student Performance Analytics is a full-stack, cloud-native academic intelligence platform that connects student data, predictive analytics, and remediation strategies in one cohesive system. It blends modern web technologies, secure data management, and machine learning to provide meaningful insights into student outcomes.

