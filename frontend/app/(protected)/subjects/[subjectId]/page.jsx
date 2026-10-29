"use client";
import { useParams } from "next/navigation";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import MarksTable from "@/components/features/marks/MarksTable";
import { useMarks, useSubjects } from "@/lib/hooks/useAcademics";

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const { data: subjects = [], isLoading } = useSubjects();
  const { data: marks = [] } = useMarks();
  const s = subjects.find((x) => String(x.id) === subjectId);

  if (isLoading) return <p className="text-muted">Loading…</p>;
  if (!s) return <p className="text-muted">Subject not found.</p>;

  return (
    <>
      <PageHeader title={s.name} subtitle={s.code} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Attendance" value={`${s.total ? Math.round((s.attended / s.total) * 100) : 0}%`} note={`${s.attended} of ${s.total} classes`} />
        <MetricCard label="Classes missed" value={s.total - s.attended} note="This semester" />
        <MetricCard label="Assessments" value={marks.filter((m) => String(m.subject_id) === subjectId).length} note="Marks recorded" />
      </div>
      <MarksTable marks={marks.filter((m) => String(m.subject_id) === subjectId)} />
    </>
  );
}
