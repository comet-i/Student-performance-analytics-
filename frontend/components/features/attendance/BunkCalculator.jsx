"use client";
import { useState } from "react";
import { Calculator, Info } from "lucide-react";

// Max absences m such that attended / (total + m) stays >= min%
const safeMisses = (attended, total, min) => Math.max(0, Math.floor(attended / (min / 100) - total));
const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);

export default function BunkCalculator({ subjects, goal, threshold }) {
  const [sel, setSel] = useState("all");
  const [min, setMin] = useState(threshold);
  const rows = sel === "all" ? subjects : subjects.filter((s) => String(s.id) === sel);
  const [a, t] = [sum(rows, "attended"), sum(rows, "total")];
  const n = safeMisses(a, t, min);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Bunk Calculator</h2>
          <p className="text-xs text-muted">Plan a break without falling behind.</p>
        </div>
        <span className="grid size-9 place-items-center rounded-lg bg-panel text-brand"><Calculator size={16} /></span>
      </div>

      <div className="mt-5 flex gap-3">
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-3 text-sm">
          <option value="all">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-line bg-bg px-3 text-sm text-muted">
          Min.
          <input type="number" min={1} max={100} value={min} onChange={(e) => setMin(+e.target.value || 1)} className="w-12 bg-transparent font-medium text-ink outline-none" />%
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-bg p-5">
        <p className="text-sm text-muted">You can safely miss up to</p>
        <p className="mt-1 text-5xl font-semibold text-brand">{n} <span className="text-xl text-ink">more classes</span></p>
        <p className="mt-2 text-xs text-muted">and still maintain {min}% overall attendance.</p>
      </div>

      <p className="mt-4 flex items-center justify-between text-xs text-muted">
        Projection after {n} absences
        <span>{a} / {t + n} <b className="chip ml-2">{(t + n ? (a / (t + n)) * 100 : 0).toFixed(1)}%</b></span>
      </p>

      <p className="mt-4 flex gap-2 rounded-xl border border-line p-3 text-xs text-muted">
        <Info size={14} className="mt-0.5 shrink-0" />
        For your personal {goal}% goal, you may miss up to {safeMisses(a, t, goal)} more classes. Per-subject limits may vary.
      </p>
    </div>
  );
}
