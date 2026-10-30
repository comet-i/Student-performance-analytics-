import ProgressBar from "@/components/ui/ProgressBar";

export default function MarksTable({ marks }) {
  if (!marks.length) return <div className="card text-sm text-muted">No marks yet. Add your first assessment to see it here.</div>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="text-xs text-muted">
          <tr><th className="pb-3">Subject</th><th>Assessment</th><th>Score</th><th className="w-40">Percentage</th></tr>
        </thead>
        <tbody>
          {marks.map((m) => {
            const pct = Math.round((m.score / m.max) * 100);
            return (
              <tr key={m.id} className="border-t border-line">
                <td className="py-3">{m.subject}</td>
                <td>{m.title}</td>
                <td className="font-medium">{m.score}/{m.max}</td>
                <td><span className="flex items-center gap-2"><ProgressBar value={pct} className="flex-1" />{pct}%</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
