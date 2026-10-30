import { Flame, Sparkles } from "lucide-react";

const RISK = {
  low: "chip",
  medium: "rounded-full bg-panel px-3 py-1 text-xs text-brand",
  high: "rounded-full bg-badbg px-3 py-1 text-xs text-bad",
};

export default function PredictionCard({ data }) {
  if (!data) return null;
  const score = Math.round(data.predicted_score || 0);
  const riskLevel = data.risk || "low";
  const streakCount = data.streak || 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between text-sm text-muted">
        Predicted performance <Sparkles size={16} className="text-brand" />
      </div>
      <p className="mt-3 text-5xl font-semibold">{score}%</p>
      <div className="mt-4 flex items-center gap-3 text-sm">
        <span className={RISK[riskLevel] || RISK.low}>{riskLevel} risk</span>
        <span className="flex items-center gap-1 text-muted"><Flame size={14} />{streakCount}-day streak</span>
      </div>
    </div>
  );
}