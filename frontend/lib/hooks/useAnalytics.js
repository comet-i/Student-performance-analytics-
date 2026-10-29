import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ML prediction from the analytics service (via backend):
// { predicted_score, risk: "low" | "medium" | "high", streak, trend: [number], tips: [string] }
export const usePrediction = () => useQuery({ queryKey: ["prediction"], queryFn: () => api("/analytics/predict") });
