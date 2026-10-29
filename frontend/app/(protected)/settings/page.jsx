"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import { useSettings } from "@/lib/hooks/useAcademics";
import { createClient } from "@/utils/supabase/client";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useSettings();
  const [f, setF] = useState({ name: "", goal: 85, threshold: 75 });
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (data) setF(data); }, [data]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    await createClient().auth.updateUser({ data: { full_name: f.name, attendance_goal: +f.goal, min_threshold: +f.threshold } });
    qc.invalidateQueries({ queryKey: ["settings"] });
    setSaved(true);
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile and preferences." />
      <form onSubmit={save} className="card max-w-md space-y-4">
        <Input label="Full name" value={f.name} onChange={set("name")} />
        <Input type="number" label="Attendance goal (%)" value={f.goal} onChange={set("goal")} />
        <Input type="number" label="Minimum threshold (%)" value={f.threshold} onChange={set("threshold")} />
        <Button className="w-full">Save changes</Button>
        {saved && <p className="text-sm text-ok">Changes saved.</p>}
      </form>
    </>
  );
}
