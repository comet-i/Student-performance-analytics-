"use client";
import { Lightbulb } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import PredictionCard from "@/components/features/analytics/PredictionCard";
import TrendBars from "@/components/features/analytics/TrendBars";
import { usePrediction } from "@/lib/hooks/useAnalytics";

export default function InsightsPage() {
  const { data, isLoading, error } = usePrediction();
  if (isLoading) return <p className="text-muted">Loading…</p>;
  if (error) return <p className="text-bad">Couldn't load predictions: {error.message}</p>;

  return (
    <>
      <PageHeader title="Insights" subtitle="Predictions and tips based on your attendance and marks." />
      <div className="grid gap-6 lg:grid-cols-2">
        <PredictionCard data={data} />
        <TrendBars values={data.trend} />
      </div>
      <div className="card mt-6">
        <h2 className="mb-4 font-semibold">Tips for you</h2>
        <ul className="space-y-3 text-sm">
          {data.tips.map((t) => (
            <li key={t} className="flex gap-3"><Lightbulb size={16} className="mt-0.5 shrink-0 text-brand" />{t}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
