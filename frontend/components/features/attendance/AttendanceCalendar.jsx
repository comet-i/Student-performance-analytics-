"use client";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useAttendanceCalendar } from "@/lib/hooks/useAcademics";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const pad = (n) => String(n).padStart(2, "0");
const STYLE = {
  present: "bg-okbg text-ok",
  absent: "bg-badbg text-bad",
  off: "bg-panel/70 text-muted",
  upcoming: "border border-line bg-card text-muted",
};

export default function AttendanceCalendar() {
  const now = new Date();
  const [cur, setCur] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [y, m] = [cur.getFullYear(), cur.getMonth()];
  const month = `${y}-${pad(m + 1)}`;
  const { data: log = {} } = useAttendanceCalendar(month);

  const lead = (cur.getDay() + 6) % 7; // Monday-first grid
  const days = Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => i + 1);
  const shift = (n) => setCur(new Date(y, m + n, 1));
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Attendance calendar</h2>
          <p className="text-xs text-muted">Your daily class record · All subjects</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <button onClick={() => shift(-1)} aria-label="Previous month" className="rounded-lg border border-line p-2"><ChevronLeft size={14} /></button>
          {cur.toLocaleString("en", { month: "long", year: "numeric" })}
          <button onClick={() => shift(1)} aria-label="Next month" className="rounded-lg border border-line p-2"><ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2 text-center text-[10px] text-muted">
        {DAYS.map((d) => <span key={d}>{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {days.map((d) => {
          const key = `${month}-${pad(d)}`;
          const weekend = [0, 6].includes(new Date(y, m, d).getDay());
          const status = log[key] ?? (weekend ? "off" : "upcoming");
          return (
            <span key={d} className={`flex h-11 items-center justify-center gap-1 rounded-lg text-sm ${STYLE[status]} ${key === todayKey ? "ring-2 ring-brand" : ""}`}>
              {d}
              {status === "present" && <Check size={12} />}
              {status === "absent" && <X size={12} />}
            </span>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        {[["Present", "bg-okbg"], ["Absent", "bg-badbg"], ["Weekend / holiday", "bg-panel"], ["Upcoming", "border border-line"]].map(([l, c]) => (
          <span key={l} className="flex items-center gap-1.5"><i className={`size-3 rounded ${c}`} />{l}</span>
        ))}
      </div>
    </div>
  );
}
