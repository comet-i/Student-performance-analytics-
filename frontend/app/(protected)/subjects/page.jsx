"use client";
import PageHeader from "@/components/ui/PageHeader";
import SubjectCard from "@/components/features/subjects/SubjectCard";
import { useSubjects } from "@/lib/hooks/useAcademics";

export default function SubjectsPage() {
  const { data: subjects = [], isLoading } = useSubjects();
  return (
    <>
      <PageHeader title="Subjects" subtitle="Everything you're studying this semester." />
      {isLoading ? <p className="text-muted">Loading…</p> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((s) => <SubjectCard key={s.id} subject={s} />)}
        </div>
      )}
    </>
  );
}
