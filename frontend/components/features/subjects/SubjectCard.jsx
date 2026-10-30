import Link from "next/link";
import ProgressBar from "@/components/ui/ProgressBar";

export default function SubjectCard({ subject: s }) {
  const pct = s.total ? Math.round((s.attended / s.total) * 100) : 0;
  return (
    <Link href={`/subjects/${s.id}`} className="card block hover:border-brand">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: s.color || "rgb(var(--brand))" }} />
        <h3 className="font-medium">{s.name}</h3>
        <span className="rounded bg-panel px-1.5 py-0.5 text-[10px] text-muted">{s.code}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold">{pct}%</p>
      <ProgressBar value={pct} className="mt-3" />
      <p className="mt-2 text-xs text-muted">{s.attended} of {s.total} classes attended</p>
    </Link>
  );
}
