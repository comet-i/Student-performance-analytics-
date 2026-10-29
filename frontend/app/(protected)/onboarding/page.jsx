"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { api } from "@/lib/api";
import { createClient } from "@/utils/supabase/client";

export default function Onboarding() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(85);
  const [names, setNames] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

 async function finish() {
    setBusy(true);
    setError("");
    try {
      const subjects = names.split(",").map((n) => n.trim()).filter(Boolean).map((name, index) => ({
        subject_code: `SUB${index + 1}`, // Generates a valid code like SUB1, SUB2
        subject_name: name,
      }));

      await Promise.all(subjects.map((body) => api("/enrollments", { method: "POST", body })));
      await createClient().auth.updateUser({ data: { attendance_goal: +goal, onboarded: true } });
      qc.invalidateQueries();
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
}
  return (
    <div className="mx-auto max-w-md pt-10">
      <p className="text-sm text-muted">Step {step + 1} of 2</p>
      {step === 0 ? (
        <div className="mt-2 space-y-5">
          <h1 className="text-3xl font-semibold">Set your attendance goal</h1>
          <Input type="number" min={50} max={100} label="Goal (%)" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <Button onClick={() => setStep(1)} className="w-full">Continue</Button>
        </div>
      ) : (
        <div className="mt-2 space-y-5">
          <h1 className="text-3xl font-semibold">Add your subjects</h1>
          <Input label="Subjects (comma separated)" placeholder="Data Structures, Networks" value={names} onChange={(e) => setNames(e.target.value)} />
          {error && <p className="text-sm text-bad">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={finish} disabled={busy || !names.trim()} className="flex-1">Finish setup</Button>
          </div>
        </div>
      )}
    </div>
  );
}
