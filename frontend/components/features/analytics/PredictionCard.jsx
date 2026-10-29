import { Flame, Sparkles } from "lucide-react";

const RISK = {
  low: "chip",
  medium: "rounded-full bg-panel px-3 py-1 text-xs text-brand",
  high: "rounded-full bg-badbg px-3 py-1 text-xs text-bad",
};

export default function PredictionCard({ data }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between text-sm text-muted">
        Predicted performance <Sparkles size={16} className="text-brand" />
      </div>
      <p className="mt-3 text-5xl font-semibold">{Math.round(data.predicted_score)}%</p>
      <div className="mt-4 flex items-center gap-3 text-sm">
        <span className={RISK[data.risk]}>{data.risk} risk</span>
        <span className="flex items-center gap-1 text-muted"><Flame size={14} />{data.streak}-day streak</span>
      </div>
    </div>
  );
}
