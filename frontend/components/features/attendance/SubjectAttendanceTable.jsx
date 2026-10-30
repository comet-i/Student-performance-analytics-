import { CheckCircle2 } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";

const COLS = "grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] items-center px-3";

export default function SubjectAttendanceTable({ subjects, goal }) {
  const rows = subjects.map((s) => ({ ...s, pct: s.total ? Math.round((s.attended / s.total) * 100) : 0 }));
  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Subject-wise attendance</h2>
          <p className="text-xs text-muted">A closer look at your {total} classes this semester.</p>
        </div>
        {rows.every((r) => r.pct >= goal) && (
          <span className="chip flex items-center gap-1.5"><CheckCircle2 size={14} />All subjects above {goal}% goal</span>
        )}
      </div>

      <div className="mt-4 min-w-[640px] text-sm">
        <div className={`${COLS} rounded-lg bg-bg py-2 text-xs text-muted`}>
          {["Subject", "Attended", "Total", "Missed", "Attendance", "Status"].map((h) => <span key={h}>{h}</span>)}
        </div>
        {rows.map((r) => (
          <div key={r.id} className={`${COLS} border-b border-line py-3 last:border-0`}>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full" style={{ background: r.color || "rgb(var(--brand))" }} />
              {r.name} <b className="rounded bg-panel px-1.5 text-[10px] font-normal text-muted">{r.code}</b>
            </span>
            <b>{r.attended}</b>
            <span className="text-muted">{r.total}</span>
            <span className="text-muted">{r.total - r.attended}</span>
            <span className="flex items-center gap-3 pr-6"><ProgressBar value={r.pct} className="flex-1" />{r.pct}%</span>
            <span className={r.pct >= goal ? "chip" : "rounded-full bg-badbg px-3 py-1 text-xs text-bad"}>{r.pct >= goal ? "On track" : "At risk"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
