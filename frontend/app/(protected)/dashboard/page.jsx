"use client";
import { CalendarCheck, CheckSquare, ClipboardList, Sparkles } from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import SubjectCard from "@/components/features/subjects/SubjectCard";
import PredictionCard from "@/components/features/analytics/PredictionCard";
import { useMarks, useSubjects } from "@/lib/hooks/useAcademics";
import { usePrediction } from "@/lib/hooks/useAnalytics";
import { useTasks } from "@/lib/hooks/useTasks";

const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);

export default function Dashboard() {
  const { data: subjects = [] } = useSubjects();
  const { data: marks = [] } = useMarks();
  const { data: tasks = [] } = useTasks();
  const { data: prediction } = usePrediction();

  const attendance = sum(subjects, "total") ? Math.round((sum(subjects, "attended") / sum(subjects, "total")) * 100) : 0;
  const avg = marks.length ? Math.round(marks.reduce((s, m) => s + (m.score / m.max) * 100, 0) / marks.length) : 0;
  const open = tasks.filter((t) => t.status !== "done").length;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your semester at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Attendance" value={`${attendance}%`} note="Across all subjects" icon={CalendarCheck} />
        <MetricCard label="Average marks" value={`${avg}%`} note={`${marks.length} assessments`} icon={ClipboardList} />
        <MetricCard label="Open tasks" value={open} note="In your study planner" icon={CheckSquare} />
        <MetricCard highlight label="Predicted score" value={prediction ? `${Math.round(prediction.predicted_score)}%` : "–"} note="From the ML model" icon={Sparkles} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {prediction && <PredictionCard data={prediction} />}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {subjects.map((s) => <SubjectCard key={s.id} subject={s} />)}
        </div>
      </div>
    </>
  );
}
