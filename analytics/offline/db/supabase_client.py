"""Service-role Supabase access. Offline scripts only: the web service never imports this."""
import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

TABLES = (
    "student_profiles", "enrollments", "assessments", "attendance_logs",
    "study_tasks", "study_sessions", "syllabus_topics",
)


def client() -> Client:
    url, key = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def fetch_all(db: Client, table: str, columns: str = "*", page: int = 1000, **filters) -> list[dict]:
    """Paged select; the service-role key bypasses RLS, so this sees every student."""
    rows, offset = [], 0
    while True:
        query = db.table(table).select(columns)
        for column, value in filters.items():
            query = query.eq(column, value)
        batch = query.range(offset, offset + page - 1).execute().data
        rows += batch
        if len(batch) < page:
            return rows
        offset += page
