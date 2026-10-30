"use client";
import { CheckCircle2, Download, MinusCircle, PieChart, Target } from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import AttendanceCalendar from "@/components/features/attendance/AttendanceCalendar";
import BunkCalculator from "@/components/features/attendance/BunkCalculator";
import SubjectAttendanceTable from "@/components/features/attendance/SubjectAttendanceTable";
import { useSettings, useSubjects } from "@/lib/hooks/useAcademics";

export default function AttendancePage() {
  const { data: subjects = [], isLoading } = useSubjects();
  const { data: settings } = useSettings();
  if (isLoading || !settings) return <p className="text-muted">Loading…</p>;

  const attended = subjects.reduce((s, x) => s + x.attended, 0);
  const total = subjects.reduce((s, x) => s + x.total, 0);
  const pct = total ? Math.round((attended / total) * 100) : 0;
  const { goal, threshold } = settings;

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Every class counts. Keep your consistency in view."
        badge={<span className="chip">{pct}% · {pct >= goal ? "On track" : "Below goal"}</span>}
      >
        <Button onClick={() => window.print()}><Download size={16} />Export report</Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Overall Attendance" value={`${pct}%`} note="Across all subjects" icon={PieChart} />
        <MetricCard label="Classes Attended" value={attended} note={`Out of ${total} classes this semester`} icon={CheckCircle2} />
        <MetricCard label="Classes Missed" value={total - attended} note={`${100 - pct}% of total classes`} icon={MinusCircle} />
        <MetricCard highlight label="Attendance Goal" value={`${goal}%`} icon={Target}
          note={pct >= goal ? `You're ${pct - goal} pts above your goal` : `${goal - pct} pts to reach your goal`} />
      </div>

      <div className="my-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <AttendanceCalendar />
        <BunkCalculator subjects={subjects} goal={goal} threshold={threshold} />
      </div>
      <SubjectAttendanceTable subjects={subjects} goal={goal} />
    </>
  );
}
