"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAddMark, useSubjects } from "@/lib/hooks/useAcademics";

const empty = { subject_id: "", title: "", score: "", max: 100 };

export default function MarksForm() {
  const { data: subjects = [] } = useSubjects();
  const add = useAddMark();
  const [f, setF] = useState(empty);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    // Pass the payload directly; the updated useAddMark hook handles the auto-swapping
    add.mutate(
      { ...f, score: Number(f.score), max: Number(f.max) },
      { onSuccess: () => setF(empty) }
    );
  };

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h2 className="font-semibold">Add assessment</h2>
      
      <select 
        required 
        value={f.subject_id} 
        onChange={set("subject_id")} 
        className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm"
      >
        <option value="" disabled>Select subject</option>
        {subjects.map((s) => (
          <option 
            key={s.id || s.enrollment_id || s.subject_id} 
            value={s.id || s.enrollment_id || s.subject_id}
          >
            {s.name || s.subject_name}
          </option>
        ))}
      </select>

      <Input 
        required 
        placeholder="Assessment (e.g. Mid-term)" 
        value={f.title} 
        onChange={set("title")} 
      />
      
      <div className="grid grid-cols-2 gap-3">
        <Input 
          required 
          type="number" 
          min={0} 
          placeholder="Score" 
          value={f.score} 
          onChange={set("score")} 
        />
        <Input 
          required 
          type="number" 
          min={1} 
          placeholder="Out of" 
          value={f.max} 
          onChange={set("max")} 
        />
      </div>
      
      {add.error && <p className="text-sm text-bad">{add.error.message || "Bad Request"}</p>}
      <Button disabled={add.isPending} className="w-full">Save marks</Button>
    </form>
  );
}