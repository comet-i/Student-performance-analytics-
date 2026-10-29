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

  // To this:
  const attendance = subjects.length ? Math.round(subjects.reduce((acc, s) => acc + (s.attendancePct || s.attendance_pct || 0), 0) / subjects.length) : 0;
  // Replace your existing 'avg' line with this:
  // 1. Sum all scores and all max values securely
  const totalObtained = marks.reduce((sum, m) => sum + (Number(m.score) || 0), 0);
  const totalMax = marks.reduce((sum, m) => sum + (Number(m.max) || 100), 0);

  // 2. Calculate the true average and cap it at 100% to prevent impossible spikes
  const avg = totalMax > 0 ? Math.min(Math.round((totalObtained / totalMax) * 100), 100) : 0;
  const open = Array.isArray(tasks) ? tasks.filter((t) => t.status !== "done").length : 0;

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
