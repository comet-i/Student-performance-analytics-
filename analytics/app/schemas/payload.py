"""Mirrors the JSON the Express backend sends (backend/src/services/analytics.service.js).

Field names follow the Supabase tables: enrollments, assessments, attendance_logs,
study_tasks, study_sessions, syllabus_topics, student_profiles.
"""
from datetime import date, datetime
from typing import Annotated, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

Pct = Annotated[float, Field(ge=0, le=100)]


class Student(BaseModel):
    board_10th_pct: Optional[Pct] = None
    board_12th_pct: Optional[Pct] = None
    previous_sem_gpa: Optional[Annotated[float, Field(ge=0, le=10)]] = None
    weekly_study_hours: Optional[Annotated[float, Field(ge=0, le=100)]] = None
    current_semester: Optional[Annotated[int, Field(ge=1, le=12)]] = None


class Assessment(BaseModel):
    assessment_type: Optional[str] = None        # quiz | midterm | assignment | final | ...
    score: Pct                                # backend sends raw_marks/max_marks * 100
    weightage: Optional[Pct] = None
    recorded_at: date


class AttendanceLog(BaseModel):
    class_date: date
    status: Literal["present", "absent", "excused", "late"]


class StudyTask(BaseModel):
    status: Literal["todo", "in_progress", "completed"]
    due_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    allocated_hours: Optional[float] = Field(default=None, ge=0, le=100)


class StudySession(BaseModel):
    started_at: datetime
    duration_minutes: int = Field(gt=0, le=1440)
    focus_rating: Optional[int] = Field(default=None, ge=1, le=5)


class SyllabusTopic(BaseModel):
    is_completed: bool = False


class Subject(BaseModel):
    enrollment_id: UUID
    subject_code: str
    subject_name: str
    term_label: str = "Current"
    credits: int = Field(default=3, ge=1, le=6)
    target_score: Pct = 85
    min_attendance: Pct = 75
    attendance_pct: Optional[Pct] = None
    predicted_score: Optional[Pct] = None
    final_score: Optional[Pct] = None
    assessments: list[Assessment] = Field(default_factory=list, max_length=300)
    attendance_logs: list[AttendanceLog] = Field(default_factory=list, max_length=1500)
    study_tasks: list[StudyTask] = Field(default_factory=list, max_length=500)
    study_sessions: list[StudySession] = Field(default_factory=list, max_length=1500)
    syllabus_topics: list[SyllabusTopic] = Field(default_factory=list, max_length=500)


class Payload(BaseModel):
    student: Student
    subjects: list[Subject] = Field(min_length=1, max_length=15)


class Scenario(BaseModel):
    """What-if knobs from the planner UI. All optional; unset = keep current value."""

    expected_score: Optional[Pct] = None                                       # score in the remaining assessments
    extra_study_hours: Optional[Annotated[float, Field(ge=0, le=40)]] = None   # additional hours per week
    attendance_pct: Optional[Pct] = None                                       # end-of-term attendance
    task_completion_rate: Optional[Pct] = None                                 # planner adherence


class SimulateRequest(Payload):
    enrollment_id: UUID
    scenario: Scenario
